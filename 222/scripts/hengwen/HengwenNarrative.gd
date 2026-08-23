class_name HengwenNarrative
extends RefCounted

var _content: HengwenContent

func _init(content: HengwenContent) -> void:
	_content = content

func next_dialogue(prisoner_id: String, state: HengwenState) -> Dictionary:
	var prisoner := _prisoner_definition(prisoner_id)
	var daily: Dictionary = prisoner.get("dailyDialogue", {})
	for node_id_variant in daily.get("d%d" % state.day, []):
		var node_id := String(node_id_variant)
		if _available(node_id, state, []):
			return _node_with_id(node_id)
	return {}

func dialogue_node(node_id: String) -> Dictionary:
	return _node_with_id(node_id)

func apply_choice(prisoner_id: String, choice: Dictionary, state: HengwenState) -> Dictionary:
	if not state.prisoners.has(prisoner_id):
		return {"ok": false, "message": "囚犯不存在。"}
	_apply_effects(prisoner_id, choice.get("effects", {}), state)
	for clue_or_flag in choice.get("set", []):
		var value := String(clue_or_flag)
		if value.begins_with("C") or value.begins_with("clue_"):
			state.add_clue(value)
		else:
			state.prisoners[prisoner_id].get("flags", {})[value] = true
	state.daily_dialogue_count += 1
	return {"ok": true, "next_id": String(choice.get("next", "__end__"))}

func meal_reaction(prisoner_id: String, meal: Dictionary, state: HengwenState) -> Dictionary:
	var special_id := String(meal.get("special_id", ""))
	if not special_id.is_empty():
		for node_id in _content.data().get("recipes", []):
			if String((node_id as Dictionary).get("special", "")) == special_id:
				var reaction_id := "r_%s" % special_id
				if _content.data().get("dialogues", {}).has(reaction_id):
					return _node_with_id(reaction_id)
	var prefix := _meal_prefix(prisoner_id)
	var reaction_id := "%s_d%d_meal" % [prefix, state.day]
	if _available(reaction_id, state, meal.get("tags", [])):
		return _node_with_id(reaction_id)
	return {}

func trigger_cross_events(state: HengwenState) -> Array[String]:
	var triggered: Array[String] = []
	for event_variant in _content.data().get("crossEvents", []):
		var event := event_variant as Dictionary
		var event_id := String(event.get("id", ""))
		if not state.triggered_events.has(event_id) and int(event.get("day", 0)) == state.day and _available(event_id, state, []):
			state.triggered_events[event_id] = true
			triggered.append(event_id)
	return triggered

func pick_ending(state: HengwenState) -> String:
	var suwan: Dictionary = state.prisoners.get("su_wan", {})
	var suwan_stats: Dictionary = suwan.get("stats", {})
	if state.has_clue("C001") and state.has_clue("C203") and state.has_clue("C405") and state.global_satisfaction >= 60 and int(suwan_stats.get("trust", 0)) >= 70:
		return "ending_truth"
	if state.global_satisfaction <= 20:
		return "ending_collapse"
	if state.has_clue("C205") and state.has_clue("C404"):
		return "ending_hidden"
	if state.global_satisfaction >= 70:
		return "ending_peace"
	return "ending_silence"

func _available(node_id: String, state: HengwenState, meal_tags: Array) -> bool:
	if state.triggered_nodes.has(node_id):
		return false
	var trigger: Dictionary = _content.data().get("nodeTriggers", {}).get(node_id, {})
	if trigger.is_empty():
		return true
	var owner_id := _owner_for_node(node_id)
	var stats: Dictionary = (state.prisoners.get(owner_id, {}) as Dictionary).get("stats", {})
	for key in ["trust", "fear", "anger", "guilt", "suspicion"]:
		var rule: Dictionary = trigger.get(key, {})
		if not rule.is_empty() and int(stats.get(key, 0)) < int(rule.get("min", 0)):
			return false
	for clue_id_variant in trigger.get("clues", []):
		if not state.has_clue(String(clue_id_variant)):
			return false
	for required_tag_variant in trigger.get("mealTags", []):
		if not meal_tags.has(String(required_tag_variant)):
			return false
	return true

func _apply_effects(prisoner_id: String, effects: Dictionary, state: HengwenState) -> void:
	var prisoner: Dictionary = state.prisoners[prisoner_id]
	var stats: Dictionary = prisoner.get("stats", {})
	for stat_name in ["trust", "fear", "anger", "guilt", "suspicion", "hunger"]:
		if effects.has(stat_name):
			stats[stat_name] = clampi(int(stats.get(stat_name, 0)) + int(effects[stat_name]), 0, 100)
	prisoner["stats"] = stats
	state.prisoners[prisoner_id] = prisoner

func _node_with_id(node_id: String) -> Dictionary:
	var node: Dictionary = _content.data().get("dialogues", {}).get(node_id, {}).duplicate(true)
	if not node.is_empty():
		node["id"] = node_id
	return node

func _prisoner_definition(prisoner_id: String) -> Dictionary:
	for prisoner_variant in _content.prisoners():
		var prisoner := prisoner_variant as Dictionary
		if String(prisoner.get("id", "")) == prisoner_id:
			return prisoner
	return {}

func _owner_for_node(node_id: String) -> String:
	if node_id.begins_with("lt_"):
		return "laotu"
	if node_id.begins_with("bz_"):
		return "baizhu"
	if node_id.begins_with("ay_"):
		return "aying"
	if node_id.begins_with("zh_"):
		return "zhong"
	return "su_wan"

func _meal_prefix(prisoner_id: String) -> String:
	return {"su_wan": "su", "laotu": "lt", "baizhu": "bz", "aying": "ay", "zhong": "zh"}.get(prisoner_id, "su")
