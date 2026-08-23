extends SceneTree

func _init() -> void:
	assert(not ProjectSettings.has_setting("autoload/EventBus"))
	assert(not ProjectSettings.has_setting("autoload/GameState"))
	assert(not ResourceLoader.exists("res://scripts/Main.gd"))
	assert(not ResourceLoader.exists("res://scenes/Kitchen.tscn"))
	assert(not ResourceLoader.exists("res://data/recipes.gd"))
	print("hengwen cleanup test passed")
	quit()
