class_name HengwenCooking
extends RefCounted

var _content: HengwenContent

func _init(content: HengwenContent) -> void:
	_content = content

func prepare(draft: Dictionary, state: HengwenState) -> Dictionary:
	var error := validate_draft(draft, state)
	if not error.is_empty():
		return {"ok": false, "message": error}
	var tags := collect_tags(draft)
	var special_id := match_special(draft, state)
	return {
		"ok": true,
		"serving_type": String(draft.get("serving_type", "")),
		"target_id": String(draft.get("target_id", "")),
		"ingredient_ids": draft.get("ingredient_ids", []).duplicate(),
		"method_id": String(draft.get("method_id", "")),
		"plating_id": String(draft.get("plating_id", "")),
		"overcook": bool(draft.get("overcook", false)),
		"tags": tags,
		"special_id": special_id,
	}

func serve(meal: Dictionary, state: HengwenState) -> Dictionary:
	var serving_type := String(meal.get("serving_type", ""))
	var target_id := String(meal.get("target_id", ""))
	var tags: Array = meal.get("tags", [])
	var results: Array[Dictionary] = []
	for prisoner_variant in _content.prisoners():
		var prisoner_def := prisoner_variant as Dictionary
		var prisoner_id := String(prisoner_def.get("id", ""))
		var fed := serving_type == "bigPot" or prisoner_id == target_id
		var attitude := _attitude(prisoner_def, meal, tags, serving_type, prisoner_id == target_id)
		results.append({"id": prisoner_id, "fed": fed, "attitude": attitude})
	if serving_type == "bigPot":
		var lowest := 100
		for result in results:
			lowest = mini(lowest, int(result.attitude))
		if lowest < 30:
			for result in results:
				result.attitude = maxi(0, int(result.attitude) - 5)
		if bool(meal.get("overcook", false)):
			for result in results:
				result.attitude = maxi(0, int(result.attitude) - 8)
	for result in results:
		_apply_result(result, tags, state)
	for ingredient_id_variant in meal.get("ingredient_ids", []):
		var ingredient_id := String(ingredient_id_variant)
		state.inventory[ingredient_id] = maxi(0, int(state.inventory.get(ingredient_id, 0)) - 1)
	state.daily_cooked[serving_type] = true
	state.global_satisfaction = _global_satisfaction(state)
	return {"results": results, "special_id": meal.get("special_id", "")}

func validate_draft(draft: Dictionary, state: HengwenState) -> String:
	var serving_type := String(draft.get("serving_type", ""))
	if serving_type != "bigPot" and serving_type != "smallBowl":
		return "请选择大锅或小碗。"
	if bool(state.daily_cooked.get(serving_type, false)):
		return "今日已做%s。" % ("大锅菜" if serving_type == "bigPot" else "小碗菜")
	var ingredients: Array = draft.get("ingredient_ids", [])
	var minimum := 3 if serving_type == "bigPot" else 2
	if ingredients.size() < minimum:
		return "%s至少需要 %d 份食材。" % ["大锅菜" if serving_type == "bigPot" else "小碗菜", minimum]
	if ingredients.size() > 3:
		return "一餐最多选择三种食材。"
	if ingredients.has("chongxing") and ingredients.size() != 1:
		return "虫形软糕必须单独使用。"
	if serving_type == "smallBowl" and String(draft.get("target_id", "")).is_empty():
		return "请选择小碗特供对象。"
	if serving_type == "smallBowl" and not state.prisoners.has(String(draft.get("target_id", ""))):
		return "特供对象不在今日牢区。"
	if String(draft.get("method_id", "")).is_empty() or String(draft.get("plating_id", "")).is_empty():
		return "请选择做法和摆盘。"
	var used: Dictionary = {}
	for ingredient_id_variant in ingredients:
		var ingredient_id := String(ingredient_id_variant)
		used[ingredient_id] = int(used.get(ingredient_id, 0)) + 1
	for ingredient_id in used:
		if int(state.inventory.get(ingredient_id, 0)) < int(used[ingredient_id]):
			return "食材不足：%s。" % ingredient_id
	return ""

func collect_tags(draft: Dictionary) -> Array[String]:
	var tags: Array[String] = []
	for ingredient_id_variant in draft.get("ingredient_ids", []):
		var ingredient := _find_by_id(_content.data().get("ingredients", []), String(ingredient_id_variant))
		for tag_variant in ingredient.get("tags", []):
			_append_unique(tags, String(tag_variant))
	var method := _find_by_id(_content.data().get("methods", []), String(draft.get("method_id", "")))
	var method_tag: String = String({"柔软": "安全感", "温暖": "安慰", "刺激": "刺激"}.get(String(method.get("tag", "")), String(method.get("tag", "中性"))))
	_append_unique(tags, method_tag)
	var plating := _find_by_id(_content.data().get("platings", []), String(draft.get("plating_id", "")))
	var plating_tag: String = String({"轻蔑": "恐惧", "诱导": "虚假温柔", "认真": "中性", "平淡": "中性"}.get(String(plating.get("tag", "")), String(plating.get("tag", "中性"))))
	_append_unique(tags, plating_tag)
	if bool(draft.get("overcook", false)):
		_append_unique(tags, "失败")
	return tags

func match_special(draft: Dictionary, state: HengwenState) -> String:
	var recipes: Array = _content.data().get("recipes", [])
	var ingredients: Array = draft.get("ingredient_ids", [])
	var method_id := String(draft.get("method_id", ""))
	var plating_id := String(draft.get("plating_id", ""))
	var overcook := bool(draft.get("overcook", false))
	var truth := _recipe_by_special(recipes, "hengwen_naigeng_truth")
	var hengwen := _recipe_by_special(recipes, "hengwen_naigeng")
	if _same_ingredients(truth, ingredients) and method_id == String(truth.get("method", "")):
		var suwan_stats: Dictionary = (state.prisoners.get("su_wan", {}) as Dictionary).get("stats", {})
		if int(suwan_stats.get("trust", 0)) >= 20 and int(suwan_stats.get("guilt", 0)) >= 15:
			return "hengwen_naigeng_truth"
		return String(hengwen.get("special", ""))
	var chongxing := _recipe_by_special(recipes, "chongxing_ruangao")
	var suitang := _recipe_by_special(recipes, "suitang_miandian")
	if _same_ingredients(chongxing, ingredients) and method_id == String(chongxing.get("method", "")):
		if plating_id == "ugly":
			return "chongxing_ruangao"
		return String(suitang.get("special", ""))
	for special_id in ["wentian_migeng", "qingku_yecaizhou", "jiaohu_tangshui", "weila_qingtang"]:
		var recipe := _recipe_by_special(recipes, special_id)
		if _same_ingredients(recipe, ingredients) and method_id == String(recipe.get("method", "")) and overcook == bool(recipe.get("overcook", false)):
			return special_id
	if overcook:
		return "yingli_caomifan"
	return ""

func _recipe_by_special(recipes: Array, special_id: String) -> Dictionary:
	for recipe_variant in recipes:
		var recipe := recipe_variant as Dictionary
		if String(recipe.get("special", "")) == special_id:
			return recipe
	return {}

func _same_ingredients(recipe: Dictionary, ingredient_ids: Array) -> bool:
	var expected: Array = recipe.get("ingredients", [])
	if expected.is_empty() or expected.size() != ingredient_ids.size():
		return false
	for expected_id in expected:
		if not ingredient_ids.has(expected_id):
			return false
	return true

func _find_by_id(entries: Array, entry_id: String) -> Dictionary:
	for entry_variant in entries:
		var entry := entry_variant as Dictionary
		if String(entry.get("id", "")) == entry_id:
			return entry
	return {}

func _append_unique(target: Array[String], value: String) -> void:
	if not target.has(value):
		target.append(value)

func _attitude(prisoner_def: Dictionary, meal: Dictionary, tags: Array, serving_type: String, is_target: bool) -> int:
	var score := 50
	var taste: Dictionary = prisoner_def.get("taste", {})
	var ingredient_taste: Dictionary = taste.get("ingredient", {})
	for ingredient_id_variant in meal.get("ingredient_ids", []):
		match String(ingredient_taste.get(String(ingredient_id_variant), "")):
			"喜欢": score += 8
			"温和": score += 3
			"厌恶": score -= 10
	var tag_taste: Dictionary = taste.get("tag", {})
	for tag_variant in tags:
		match String(tag_taste.get(String(tag_variant), "")):
			"+": score += 7
			"=": score += 2
			"-": score -= 6
			"--": score -= 11
	if serving_type == "smallBowl":
		score += 18 if is_target else -8
	return clampi(score, 0, 100)

func _apply_result(result: Dictionary, tags: Array, state: HengwenState) -> void:
	var prisoner_id := String(result.id)
	var prisoner: Dictionary = state.prisoners[prisoner_id]
	var stats: Dictionary = prisoner.get("stats", {})
	if bool(result.fed):
		stats["hunger"] = clampi(int(stats.get("hunger", 0)) - 8, 0, 100)
		for tag_variant in tags:
			var effect: Dictionary = _content.data().get("tagEffects", {}).get(String(tag_variant), {})
			for stat_name in ["trust", "fear", "anger", "guilt", "suspicion"]:
				stats[stat_name] = clampi(int(stats.get(stat_name, 0)) + int(effect.get(stat_name, 0)), 0, 100)
	else:
		stats["hunger"] = clampi(int(stats.get("hunger", 0)) + 10, 0, 100)
	prisoner["fed_today"] = bool(result.fed)
	prisoner["stats"] = stats
	prisoner["relationship"] = clampi(int(prisoner.get("relationship", 50)) + int(round((int(result.attitude) - 50) / 10.0)), 0, 100)
	state.prisoners[prisoner_id] = prisoner

func _global_satisfaction(state: HengwenState) -> int:
	var total := 0
	for prisoner in state.prisoners.values():
		total += int((prisoner as Dictionary).get("relationship", 50))
	return roundi(float(total) / maxf(float(state.prisoners.size()), 1.0))
