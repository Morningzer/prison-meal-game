extends SceneTree

func _init() -> void:
	var content := HengwenContent.new()
	assert(content.load_from_file("res://data/hengwen_content.json"))
	assert(content.total_days() == 5)
	assert(content.prisoner_ids() == ["su_wan", "laotu", "baizhu", "aying", "zhong"])

	var state := HengwenState.new(content)
	assert(state.day == 1)
	assert(state.inventory_total() == 6)

	var cooking := HengwenCooking.new(content)
	var warm := cooking.prepare({
		"serving_type": "smallBowl",
		"target_id": "su_wan",
		"ingredient_ids": ["niunai", "wenshui"],
		"method_id": "stew",
		"plating_id": "neat",
		"overcook": false,
	}, state)
	assert(warm.ok)
	assert(warm.special_id == "wentian_migeng")
	assert(warm.tags.has("安慰"))

	var no_target := cooking.prepare({
		"serving_type": "smallBowl",
		"target_id": "",
		"ingredient_ids": ["niunai"],
		"method_id": "stew",
		"plating_id": "neat",
		"overcook": false,
	}, state)
	assert(not no_target.ok)

	var narrative := HengwenNarrative.new(content)
	var node := narrative.next_dialogue("su_wan", state)
	assert(node.id == "d1_talk")
	var choice_result := narrative.apply_choice("su_wan", node.choices[0], state)
	assert(choice_result.ok)
	assert(choice_result.next_id == "d1_a")

	var big_pot := cooking.prepare({
		"serving_type": "bigPot",
		"target_id": "",
		"ingredient_ids": ["roumi", "niunai", "wenshui"],
		"method_id": "stew",
		"plating_id": "neat",
		"overcook": false,
	}, state)
	var big_feedback := cooking.serve(big_pot, state)
	assert(big_feedback.results.size() == 5)
	assert(state.daily_cooked.bigPot)

	var small_feedback := cooking.serve(warm, state)
	assert(small_feedback.results.size() == 5)
	assert(small_feedback.results.filter(func(result): return result.id == "su_wan" and result.fed).size() == 1)
	assert(state.daily_cooked.smallBowl)

	print("hengwen rules test passed")
	quit()
