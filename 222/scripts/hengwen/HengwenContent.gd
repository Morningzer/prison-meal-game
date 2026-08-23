class_name HengwenContent
extends RefCounted

const DAILY_POOLS := {
	1: ["roumi", "niunai", "wenshui", "bingtang", "caomi", "yecai"],
	2: ["niunai", "roumi", "fengmi", "wenshui", "bingtang", "yecai"],
	3: ["fengmi", "niunai", "bingtang", "roumi", "wenshui", "caomi"],
	4: ["lajiao", "wenshui", "bingtang", "yecai", "roumi", "niunai"],
	5: ["fengmi", "niunai", "bingtang", "roumi", "yecai", "caomi"],
}

var _data: Dictionary = {}
var last_error := ""

func load_from_file(path: String) -> bool:
	last_error = ""
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		last_error = "无法读取正式内容：%s" % path
		return false
	var json := JSON.new()
	if json.parse(file.get_as_text()) != OK:
		last_error = "正式内容 JSON 无法解析。"
		return false
	if not (json.data is Dictionary):
		last_error = "正式内容根节点必须是对象。"
		return false
	_data = json.data as Dictionary
	return _is_valid()

func total_days() -> int:
	return int(_data.get("totalDays", 0))

func prisoner_ids() -> Array[String]:
	var ids: Array[String] = []
	for prisoner in prisoners():
		ids.append(String(prisoner.get("id", "")))
	return ids

func prisoners() -> Array:
	return _data.get("prisoners", []) as Array

func daily_inventory(day: int) -> Dictionary:
	var inventory: Dictionary = {}
	for ingredient_id in DAILY_POOLS.get(day, []):
		inventory[ingredient_id] = int(inventory.get(ingredient_id, 0)) + 1
	return inventory

func data() -> Dictionary:
	return _data

func _is_valid() -> bool:
	var required_prisoners := ["su_wan", "laotu", "baizhu", "aying", "zhong"]
	var required_endings := ["ending_truth", "ending_collapse", "ending_hidden", "ending_peace", "ending_silence"]
	if total_days() != 5 or prisoner_ids() != required_prisoners:
		last_error = "正式内容的天数或囚犯 ID 不符合《恒温牢饭》定义。"
		return false
	if (_data.get("ingredients", []) as Array).size() != 9 or (_data.get("methods", []) as Array).size() != 4 or (_data.get("platings", []) as Array).size() != 4:
		last_error = "正式内容的料理基础数据不完整。"
		return false
	var endings := _data.get("endings", {}) as Dictionary
	for ending_id in required_endings:
		if not endings.has(ending_id):
			last_error = "正式内容缺少结局：%s" % ending_id
			return false
	return true
