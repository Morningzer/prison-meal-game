extends SceneTree

func _init() -> void:
	var game := HengwenGame.new()
	assert(game.start_new_game())
	assert(game.state.phase == "day_intro")
	game.enter_free_roam()
	assert(not game.can_end_day())

	var meal := game.cooking.prepare({
		"serving_type": "bigPot", "target_id": "",
		"ingredient_ids": ["roumi", "niunai", "wenshui"],
		"method_id": "stew", "plating_id": "neat", "overcook": false,
	}, game.state)
	assert(game.serve_meal(meal).ok)
	assert(game.can_end_day())
	assert(game.finish_day().ok)
	assert(game.state.day == 2)

	print("hengwen flow test passed")
	quit()
