extends SceneTree

func _init() -> void:
	var game := HengwenGame.new()
	assert(game.start_new_game())
	game.enter_kitchen()
	assert(game.state.phase == "kitchen")
	assert(not game.can_enter_corridor())

	var meal := game.cooking.prepare({
		"serving_type": "bigPot", "target_id": "",
		"ingredient_ids": ["roumi", "niunai", "wenshui"],
		"method_id": "stew", "plating_id": "neat", "overcook": false,
	}, game.state)
	assert(meal.ok)
	assert(game.pack_meal(meal).ok)
	assert(game.can_enter_corridor())
	assert(game.enter_corridor().ok)
	assert(game.state.phase == "corridor")
	assert(not game.can_enter_dining())

	for prisoner_id in game.content.prisoner_ids():
		var delivery: Dictionary = game.deliver_meal(prisoner_id)
		assert(delivery.ok)
	assert(game.can_enter_dining())
	assert(game.enter_dining().ok)
	assert(game.state.phase == "dining")
	assert(game.finish_dining().ok)
	assert(game.state.phase == "day_intro")
	assert(game.state.day == 2)

	print("hengwen scene flow test passed")
	quit()
