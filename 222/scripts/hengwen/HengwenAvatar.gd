class_name HengwenAvatar
extends CharacterBody2D

const SPEED := 280.0

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	velocity = direction * SPEED
	move_and_slide()
	global_position.x = clampf(global_position.x, 32.0, 1248.0)
	global_position.y = clampf(global_position.y, 100.0, 680.0)
