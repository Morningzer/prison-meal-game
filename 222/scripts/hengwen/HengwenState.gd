class_name HengwenState
extends RefCounted

var day := 1
var phase := "day_intro"
var current_scene := ""
var inventory: Dictionary = {}
var daily_cooked := {"bigPot": false, "smallBowl": false}
var prepared_meal: Dictionary = {}
var delivered_prisoners: Array[String] = []
var delivery_feedback: Dictionary = {}
var daily_dialogue_count := 0
var prisoners: Dictionary = {}
var clues: Array[String] = []
var triggered_nodes: Dictionary = {}
var triggered_events: Dictionary = {}
var global_satisfaction := 50
var ending_id := ""
var log_entries: Array[Dictionary] = []

func _init(content: HengwenContent) -> void:
	inventory = content.daily_inventory(day)
	for prisoner in content.prisoners():
		var stats: Dictionary = prisoner.get("startingStats", {})
		prisoners[prisoner.id] = {
			"id": prisoner.id,
			"name": prisoner.get("name", ""),
			"stats": stats.duplicate(true),
			"relationship": 50,
			"fed_today": false,
		}

func inventory_total() -> int:
	var total := 0
	for amount in inventory.values():
		total += int(amount)
	return total

func has_clue(clue_id: String) -> bool:
	return clue_id in clues

func has_any_clue() -> bool:
	return not clues.is_empty()

func add_clue(clue_id: String) -> bool:
	if has_clue(clue_id):
		return false
	clues.append(clue_id)
	return true
