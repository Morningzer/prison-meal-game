extends SceneTree

func _init() -> void:
	var game := HengwenGame.new()
	assert(game.start_new_game())
	assert(game.investigation != null)

	var dossier: Dictionary = game.investigation.dossier("su_wan", game.state)
	assert("苏晚" in String(dossier.get("identity", "")))
	assert("官方记录" in String(dossier.get("public_record", "")))
	assert("真实无罪" not in String(dossier.get("public_record", "")))
	assert("信任" in String(dossier.get("current_state", "")))
	assert("偏好" in String(dossier.get("food_intel", "")))

	var board: Dictionary = game.investigation.caseboard(game.state)
	assert("灰烬监狱" in String(board.get("background", "")))
	assert("C001" in String(board.get("truth_route", "")))
	assert("尚未整理" in String(board.get("clues", "")))

	var notice: Dictionary = game.investigation.dining_interaction("NoticeBoard", game.state)
	assert("恒温配餐" in String(notice.get("title", "")))
	assert("监狱" in String(notice.get("text", "")))

	print("hengwen investigation test passed")
	quit()
