extends SceneTree

func _init() -> void:
	call_deferred("_check")

func _check() -> void:
	var scene := load("res://scenes/Main.tscn") as PackedScene
	var main := scene.instantiate()
	get_root().add_child(main)
	assert(main.get_node_or_null("World/Kitchen/Player") is CharacterBody2D)
	assert(main.get_node_or_null("World/Kitchen/Stove") is Node2D)
	assert(main.get_node_or_null("World/Kitchen/ToCorridor") is Node2D)
	assert(main.get_node_or_null("World/Corridor/Cell_su_wan") is Node2D)
	assert(main.get_node_or_null("World/Corridor/Cell_zhong") is Node2D)
	assert(main.get_node_or_null("World/Corridor/ToDining") is Node2D)
	assert(main.get_node_or_null("World/Dining/Player") is CharacterBody2D)
	assert(main.get_node_or_null("World/Dining/NoticeBoard") is Node2D)
	assert(main.get_node_or_null("World/Dining/ServingLedger") is Node2D)
	assert(main.get_node_or_null("World/Dining/TableEvidence") is Node2D)
	assert(main.get_node_or_null("World/Dining/RecordsCart") is Node2D)
	assert(main.get_node_or_null("World/Dining/ClueWall") is Node2D)
	assert(main.get_node_or_null("World/Dining/Checkout") is Node2D)
	assert(main.get_node_or_null("Guide") is Control)
	assert("林烬" in String(main.get_node("Guide").get_meta("guide_text")))
	assert(main.has_method("_try_world_interact"))
	var avatar := preload("res://scripts/hengwen/HengwenAvatar.gd").new()
	assert(avatar.SPEED >= 260.0)
	avatar.free()
	main.queue_free()
	print("hengwen world test passed")
	quit()
