class_name HengwenInvestigation
extends RefCounted

var _content: HengwenContent

func _init(content: HengwenContent) -> void:
	_content = content

func dossier(prisoner_id: String, state: HengwenState) -> Dictionary:
	var prisoner := _prisoner(prisoner_id)
	if prisoner.is_empty() or not state.prisoners.has(prisoner_id):
		return {}
	var live: Dictionary = state.prisoners[prisoner_id]
	var stats: Dictionary = live.get("stats", {})
	return {
		"identity": "%s · %s · %d 岁\n关押位置：%s" % [prisoner.get("name", ""), prisoner.get("number", ""), int(prisoner.get("age", 0)), prisoner.get("place", "")],
		"public_record": "官方记录\n罪名：%s\n%s" % [prisoner.get("crime", ""), prisoner.get("fileTruth", "")],
		"personality": "行为观察：%s\n风险触发：%s" % ["、".join(_strings(prisoner.get("personality", []))), "、".join(_strings(prisoner.get("weaknesses", [])))],
		"food_intel": _food_intel(prisoner),
		"current_state": "当前状态\n信任 %d · 恐惧 %d · 愤怒 %d · 愧疚 %d · 疑心 %d · 饥饿 %d" % [int(stats.get("trust", 0)), int(stats.get("fear", 0)), int(stats.get("anger", 0)), int(stats.get("guilt", 0)), int(stats.get("suspicion", 0)), int(stats.get("hunger", 0))],
		"route": _route_status(prisoner, state),
	}

func caseboard(state: HengwenState) -> Dictionary:
	var clue_lines: Array[String] = []
	var clue_data: Dictionary = _content.data().get("clues", {})
	for clue_id in state.clues:
		var clue: Dictionary = clue_data.get(clue_id, {})
		if clue.is_empty():
			clue_lines.append("%s · 已记录" % clue_id)
		else:
			clue_lines.append("%s · %s\n%s" % [clue_id, clue.get("name", "未命名线索"), clue.get("desc", "")])
	var truth_ids: Array = _content.data().get("truthClues", ["C001", "C203", "C405"])
	var truth_progress: Array[String] = []
	for clue_id_variant in truth_ids:
		var clue_id := String(clue_id_variant)
		truth_progress.append("[%s] %s" % ["已取得" if state.has_clue(clue_id) else "未取得", clue_id])
	return {
		"background": "灰烬监狱以“恒温配餐”维持秩序：犯人可以申请定制餐，监区则借此记录每个人的情绪与软肋。林烬的父亲林诚曾在这里工作，后来在一场档案清洗后失踪。",
		"truth_route": "真相公开的关键链：%s\n苏晚的顶罪 → 白术的化验 → 钟队长的押送证词。" % " · ".join(truth_progress),
		"network": "线索网络\n料理改变反应 → 反应引出私密对话 → 一人的证词会解锁另一人的记忆。五条线不是并列任务，而是一张互相咬合的网。",
		"clues": "尚未整理到有效线索。去牢房送饭并在对话中作出选择。" if clue_lines.is_empty() else "已整理线索\n" + "\n\n".join(clue_lines),
	}

func dining_interaction(interaction_id: String, state: HengwenState) -> Dictionary:
	match interaction_id:
		"NoticeBoard":
			return {"title": "公告栏 · 恒温配餐制度", "text": "灰烬监狱对外宣称：定制餐是人道化管理。实际每一份餐都被标记、登记，犯人的反应会被监区拿去评估“稳定性”。\n\n林诚失踪前，曾负责核对这些配餐记录。"}
		"ServingLedger":
			return {"title": "配餐台账 · 第 %d 天" % state.day, "text": "今日送餐进度：%d / %d。\n%s\n\n台账上没有写菜名，只有犯人编号和反应等级；这正是监狱掌控人的方式。" % [state.delivered_prisoners.size(), state.delivery_targets().size(), "本餐已完成统一反馈。" if not state.delivery_feedback.is_empty() else "餐盒尚未全部送达。"]}
		"TableEvidence":
			return {"title": "餐桌余物 · 反应记录", "text": "碗底残留的冷热、筷子摆放和谁先离席，都是比口供更早出现的信号。\n\n料理不只用于填饱肚子：它决定谁会放下戒心，也可能让另一个人更沉默。"}
		"RecordsCart":
			return {"title": "归档车 · 旧案索引", "text": "铁皮档案盒标着“灰区 · 配餐观察”。编号与五名囚犯的牢号一致。\n\n这里的官方档案只写罪名；真正的矛盾，要把档案、饭后反应和线索一并比对。"}
		"ClueWall":
			return {"title": "墙面案件板", "text": "用线把已取得的线索连起来。想知道目前的链条，打开案件板查看。"}
	return {"title": "食堂", "text": "这里没有可读的记录。"}

func _prisoner(prisoner_id: String) -> Dictionary:
	for prisoner_variant in _content.prisoners():
		var prisoner := prisoner_variant as Dictionary
		if String(prisoner.get("id", "")) == prisoner_id:
			return prisoner
	return {}

func _food_intel(prisoner: Dictionary) -> String:
	var taste: Dictionary = prisoner.get("taste", {})
	var ingredient_taste: Dictionary = taste.get("ingredient", {})
	var likes: Array[String] = []
	var dislikes: Array[String] = []
	for ingredient_id_variant in ingredient_taste:
		var ingredient_id := String(ingredient_id_variant)
		var ingredient_name := _ingredient_name(ingredient_id)
		if String(ingredient_taste[ingredient_id]) == "喜欢":
			likes.append(ingredient_name)
		if String(ingredient_taste[ingredient_id]) == "厌恶":
			dislikes.append(ingredient_name)
	return "料理偏好\n偏好：%s\n避开：%s\n厌恶菜式：%s" % ["、".join(likes), "、".join(dislikes), "、".join(_strings(taste.get("dislikeDish", [])))]

func _route_status(prisoner: Dictionary, state: HengwenState) -> String:
	var route: Dictionary = prisoner.get("arc", {})
	var needed: Array[String] = []
	for clue_id_variant in route.get("secretClueIds", []):
		var clue_id := String(clue_id_variant)
		needed.append("%s%s" % ["✓ " if state.has_clue(clue_id) else "□ ", clue_id])
	return "个人线索进度\n%s\n提示：官方档案可能有遗漏，继续从饭后反应与对话中求证。" % " · ".join(needed)

func _ingredient_name(ingredient_id: String) -> String:
	for ingredient_variant in _content.data().get("ingredients", []):
		var ingredient := ingredient_variant as Dictionary
		if String(ingredient.get("id", "")) == ingredient_id:
			return String(ingredient.get("name", ingredient_id))
	return ingredient_id

func _strings(values: Array) -> Array[String]:
	var result: Array[String] = []
	for value in values:
		result.append(String(value))
	return result
