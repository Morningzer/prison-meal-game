class_name HengwenGame
extends RefCounted

var content := HengwenContent.new()
var state: HengwenState
var cooking: HengwenCooking
var narrative: HengwenNarrative
var investigation: HengwenInvestigation
var last_feedback: Dictionary = {}

func start_new_game() -> bool:
	if not content.load_from_file("res://data/hengwen_content.json"):
		return false
	state = HengwenState.new(content)
	cooking = HengwenCooking.new(content)
	narrative = HengwenNarrative.new(content)
	investigation = HengwenInvestigation.new(content)
	return true

func enter_free_roam() -> void:
	if state != null and state.phase == "day_intro":
		enter_kitchen()

func enter_kitchen() -> Dictionary:
	if state == null:
		return {"ok": false, "message": "游戏尚未开始。"}
	if state.phase != "day_intro" and state.phase != "kitchen":
		return {"ok": false, "message": "现在不能回厨房。"}
	state.phase = "kitchen"
	state.current_scene = "kitchen"
	return {"ok": true}

func pack_meal(meal: Dictionary) -> Dictionary:
	if state == null or state.phase != "kitchen":
		return {"ok": false, "message": "请先回到厨房做饭。"}
	if not bool(meal.get("ok", false)):
		return {"ok": false, "message": String(meal.get("message", "料理尚未完成。"))}
	state.prepared_meal = meal.duplicate(true)
	state.delivered_prisoners.clear()
	state.delivery_feedback = {}
	return {"ok": true}

func can_enter_corridor() -> bool:
	return state != null and state.phase == "kitchen" and not state.prepared_meal.is_empty()

func enter_corridor() -> Dictionary:
	if not can_enter_corridor():
		return {"ok": false, "message": "先在灶台完成一餐，再从出口去牢房走廊。"}
	state.phase = "corridor"
	state.current_scene = "corridor"
	return {"ok": true}

func delivery_targets() -> Array[String]:
	if state == null or state.prepared_meal.is_empty():
		return []
	if String(state.prepared_meal.get("serving_type", "")) == "smallBowl":
		return [String(state.prepared_meal.get("target_id", ""))]
	return content.prisoner_ids()

func deliver_meal(prisoner_id: String) -> Dictionary:
	if state == null or state.phase != "corridor":
		return {"ok": false, "message": "请先从厨房出口进入牢房走廊。"}
	if not delivery_targets().has(prisoner_id):
		return {"ok": false, "message": "这份餐不属于这名囚犯。"}
	if state.delivered_prisoners.has(prisoner_id):
		return {"ok": false, "message": "今天已经送过这份餐。"}
	state.delivered_prisoners.append(prisoner_id)
	var completed := state.delivered_prisoners.size() == delivery_targets().size()
	if completed:
		state.delivery_feedback = cooking.serve(state.prepared_meal, state)
	return {"ok": true, "completed": completed, "feedback": state.delivery_feedback}

func can_enter_dining() -> bool:
	return state != null and state.phase == "corridor" and not state.delivery_feedback.is_empty()

func enter_dining() -> Dictionary:
	if not can_enter_dining():
		return {"ok": false, "message": "先把准备好的餐送完，食堂才会开门。"}
	state.phase = "dining"
	state.current_scene = "dining"
	return {"ok": true}

func finish_dining() -> Dictionary:
	if state == null or state.phase != "dining":
		return {"ok": false, "message": "请先到食堂查看今日反馈。"}
	state.prepared_meal = {}
	state.delivered_prisoners.clear()
	state.delivery_feedback = {}
	return finish_day()

func serve_meal(meal: Dictionary) -> Dictionary:
	if state == null or not bool(meal.get("ok", false)):
		return {"ok": false, "message": String(meal.get("message", "料理尚未完成。"))}
	last_feedback = cooking.serve(meal, state)
	state.phase = "feedback"
	return {"ok": true, "feedback": last_feedback}

func close_feedback() -> void:
	if state != null and state.phase == "feedback":
		state.phase = "free_roam"

func can_end_day() -> bool:
	return state != null and (bool(state.daily_cooked.bigPot) or bool(state.daily_cooked.smallBowl))

func finish_day() -> Dictionary:
	if not can_end_day():
		return {"ok": false, "message": "至少送过一次餐才能收工。"}
	narrative.trigger_cross_events(state)
	if state.day >= content.total_days():
		state.ending_id = narrative.pick_ending(state)
		state.phase = "ending"
		return {"ok": true, "ending_id": state.ending_id}
	state.day += 1
	state.inventory = content.daily_inventory(state.day)
	state.daily_cooked = {"bigPot": false, "smallBowl": false}
	state.prepared_meal = {}
	state.delivered_prisoners.clear()
	state.delivery_feedback = {}
	state.current_scene = ""
	state.daily_dialogue_count = 0
	for prisoner_id in state.prisoners:
		state.prisoners[prisoner_id]["fed_today"] = false
	state.phase = "day_intro"
	return {"ok": true}
