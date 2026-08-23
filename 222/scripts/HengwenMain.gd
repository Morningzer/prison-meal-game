extends Node2D

const PAPER := Color("#f1e6cf")
const FIRE := Color("#f4d35e")
const INK := Color("#161b24ef")
const PRISONER_IDS: Array[String] = ["su_wan", "laotu", "baizhu", "aying", "zhong"]

var game := HengwenGame.new()
var ui: Control
var sidebar: VBoxContainer
var modal: PanelContainer
var modal_box: VBoxContainer
var header: Label
var guide_label: Label
var world: Node2D
var rooms: Dictionary = {}
var active_room: Node2D
var player: CharacterBody2D
var selected_prisoner := "su_wan"
var selected_ingredients: Array[String] = []
var selected_method := "stew"
var selected_plating := "neat"
var selected_type := "bigPot"

func _ready() -> void:
	_ensure_controls()
	_build_world()
	_build_ui()
	_show_menu()

func _process(_delta: float) -> void:
	if game.state != null and not modal.visible and Input.is_action_just_pressed("interact"):
		_try_world_interact()

func _ensure_controls() -> void:
	var keys := {"move_up": KEY_W, "move_down": KEY_S, "move_left": KEY_A, "move_right": KEY_D, "interact": KEY_E}
	for action_name in keys:
		if not InputMap.has_action(action_name):
			InputMap.add_action(action_name)
		var event := InputEventKey.new()
		event.keycode = keys[action_name]
		InputMap.action_add_event(action_name, event)

func _build_world() -> void:
	world = Node2D.new()
	world.name = "World"
	add_child(world)
	rooms["Kitchen"] = _make_room("Kitchen", "res://assets/environment/bg_kitchen.png")
	rooms["Corridor"] = _make_room("Corridor", "res://assets/environment/bg_cell_corridor.png")
	rooms["Dining"] = _make_room("Dining", "res://assets/environment/bg_dining_hall.png")
	_build_kitchen(rooms["Kitchen"])
	_build_corridor(rooms["Corridor"])
	_build_dining(rooms["Dining"])
	_set_room("Kitchen")

func _make_room(room_name: String, background_path: String) -> Node2D:
	var room := Node2D.new()
	room.name = room_name
	world.add_child(room)
	var background := Sprite2D.new()
	background.texture = load(background_path)
	background.centered = false
	background.scale = Vector2(1280.0 / 1216.0, 720.0 / 832.0)
	background.modulate = Color("#a9afa1")
	background.z_index = -5
	room.add_child(background)
	return room

func _build_kitchen(room: Node2D) -> void:
	_add_player(room, Vector2(260, 520))
	_add_marker(room, "Stove", "灶台\n[E] 做饭", Vector2(990, 450), FIRE)
	_add_marker(room, "ToCorridor", "牢房走廊出口\n[E] 送饭", Vector2(1170, 350), PAPER)
	_add_marker(room, "KitchenSign", "厨房", Vector2(120, 70), FIRE)

func _build_corridor(room: Node2D) -> void:
	_add_player(room, Vector2(80, 560))
	var names := {"su_wan": "苏晚", "laotu": "老屠", "baizhu": "白术", "aying": "阿萤", "zhong": "钟队长"}
	for index in PRISONER_IDS.size():
		var prisoner_id: String = PRISONER_IDS[index]
		_add_marker(room, "Cell_%s" % prisoner_id, "%s\n[E] 送饭 / 对话" % names[prisoner_id], Vector2(150 + index * 235, 210), PAPER)
	_add_marker(room, "ToDining", "食堂出口\n[E] 查看反馈", Vector2(1170, 560), FIRE)
	_add_marker(room, "CorridorSign", "牢房走廊", Vector2(120, 70), FIRE)

func _build_dining(room: Node2D) -> void:
	_add_player(room, Vector2(100, 560))
	_add_marker(room, "NoticeBoard", "公告栏\n[E] 监狱制度", Vector2(150, 165), PAPER)
	_add_marker(room, "ServingLedger", "配餐台账\n[E] 查看送餐记录", Vector2(380, 165), PAPER)
	_add_marker(room, "TableEvidence", "餐桌余物\n[E] 阅读反应", Vector2(955, 250), PAPER)
	_add_marker(room, "RecordsCart", "旧案归档车\n[E] 查阅背景", Vector2(240, 490), PAPER)
	_add_marker(room, "ClueWall", "墙面案件板\n[E] 整理线索", Vector2(1010, 490), PAPER)
	_add_marker(room, "Checkout", "收工出口\n[E] 查看反馈并结算", Vector2(650, 430), FIRE)
	_add_marker(room, "DiningSign", "食堂", Vector2(120, 70), FIRE)

func _add_player(room: Node2D, spawn_point: Vector2) -> void:
	var avatar := CharacterBody2D.new()
	avatar.name = "Player"
	avatar.position = spawn_point
	avatar.z_index = 3
	avatar.set_script(preload("res://scripts/hengwen/HengwenAvatar.gd"))
	room.add_child(avatar)
	var sprite := Sprite2D.new()
	sprite.texture = load("res://assets/characters/player_idle.png")
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sprite.hframes = 2
	sprite.vframes = 2
	sprite.scale = Vector2(2.6, 2.6)
	avatar.add_child(sprite)

func _add_marker(room: Node2D, node_name: String, text: String, point: Vector2, color: Color) -> void:
	var marker := Node2D.new()
	marker.name = node_name
	marker.position = point
	room.add_child(marker)
	var label := Label.new()
	label.text = text
	label.position = Vector2(-72, -26)
	label.size = Vector2(144, 58)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", Color("#22252a"))
	label.add_theme_constant_override("outline_size", 5)
	marker.add_child(label)

func _build_ui() -> void:
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ui)
	header = Label.new()
	header.position = Vector2(24, 18)
	header.add_theme_font_size_override("font_size", 24)
	header.add_theme_color_override("font_color", PAPER)
	ui.add_child(header)
	sidebar = VBoxContainer.new()
	sidebar.position = Vector2(22, 76)
	sidebar.size = Vector2(180, 180)
	sidebar.mouse_filter = Control.MOUSE_FILTER_STOP
	ui.add_child(sidebar)
	modal = PanelContainer.new()
	modal.position = Vector2(250, 76)
	modal.size = Vector2(710, 430)
	modal.mouse_filter = Control.MOUSE_FILTER_STOP
	var style := StyleBoxFlat.new()
	style.bg_color = INK
	style.border_color = Color("#b5523a")
	style.set_border_width_all(2)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	modal.add_theme_stylebox_override("panel", style)
	ui.add_child(modal)
	modal_box = VBoxContainer.new()
	modal_box.add_theme_constant_override("separation", 8)
	modal.add_child(modal_box)
	var guide := PanelContainer.new()
	guide.name = "Guide"
	guide.position = Vector2(235, 626)
	guide.size = Vector2(800, 66)
	guide.mouse_filter = Control.MOUSE_FILTER_IGNORE
	guide.set_meta("guide_text", "你是林烬，入狱厨师。WASD 移动，靠近目标按 E 互动。")
	var guide_style := StyleBoxFlat.new()
	guide_style.bg_color = Color("#151b20d8")
	guide_style.border_color = Color("#706451")
	guide_style.set_border_width_all(1)
	guide.add_theme_stylebox_override("panel", guide_style)
	add_child(guide)
	guide_label = Label.new()
	guide_label.position = Vector2(14, 8)
	guide_label.size = Vector2(770, 52)
	guide_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	guide_label.add_theme_color_override("font_color", PAPER)
	guide.add_child(guide_label)

func _set_room(room_name: String) -> void:
	for room_variant in rooms.values():
		(room_variant as Node2D).visible = false
	active_room = rooms[room_name] as Node2D
	active_room.visible = true
	player = active_room.get_node("Player") as CharacterBody2D
	_update_world_text()

func _update_world_text() -> void:
	if guide_label == null or header == null:
		return
	if game.state == null:
		guide_label.text = "你是林烬，入狱厨师。WASD 移动，靠近目标按 E 互动。"
		return
	var location: String = String({"Kitchen": "厨房", "Corridor": "牢房走廊", "Dining": "食堂"}.get(active_room.name, ""))
	header.text = "第 %d / 5 天 · %s · 满意度 %d" % [game.state.day, location, game.state.global_satisfaction]
	if active_room.name == "Kitchen":
		guide_label.text = "你是林烬。目标：走到灶台按 E 做一餐；餐箱备好后，去右侧“牢房走廊出口”按 E。\nWASD 移动 · E 互动"
	elif active_room.name == "Corridor":
		guide_label.text = "目标：逐个走到牢窗前按 E，把餐送给囚犯并交谈；全部送完，右侧食堂出口才会开放。\nWASD 移动 · E 互动"
	else:
		guide_label.text = "食堂可调查：公告栏、配餐台账、餐桌余物、旧案归档车、墙面案件板。调查后到中央收工出口结算。\nWASD 移动 · E 互动"

func _try_world_interact() -> void:
	if active_room == null or game.state == null:
		return
	if active_room.name == "Kitchen":
		if _near("Stove"):
			_cook()
		elif _near("ToCorridor"):
			var corridor_result := game.enter_corridor()
			if bool(corridor_result.get("ok", false)):
				_set_room("Corridor")
				_refresh_sidebar()
			else:
				_show("出口尚未开放", String(corridor_result.get("message", "")), [["明白", _close]])
	elif active_room.name == "Corridor":
		if _near("ToDining"):
			var dining_result := game.enter_dining()
			if bool(dining_result.get("ok", false)):
				_set_room("Dining")
				_refresh_sidebar()
			else:
				_show("食堂尚未开放", String(dining_result.get("message", "")), [["继续送饭", _close]])
			return
		for prisoner_id in game.content.prisoner_ids():
			if _near("Cell_%s" % prisoner_id):
				_deliver_and_talk(prisoner_id)
				return
	elif active_room.name == "Dining":
		if _near("Checkout"):
			_finish_at_dining()
			return
		for interaction_id in ["NoticeBoard", "ServingLedger", "TableEvidence", "RecordsCart", "ClueWall"]:
			if _near(interaction_id):
				_investigate_dining(interaction_id)
				return

func _near(node_name: String) -> bool:
	var target := active_room.get_node_or_null(node_name) as Node2D
	return target != null and player.global_position.distance_to(target.global_position) < 92.0

func _show_menu() -> void:
	header.text = "恒温牢饭 · 最后一道菜"
	_clear(sidebar)
	_show("灰烬监狱 · 新手说明", "你是林烬，一个被关进灰烬监狱的厨师。\n\n五天里，你要用饭菜让五名囚犯愿意开口，拼出这座监狱的真相。\n\n每一天的流程：厨房做饭 → 走廊送饭和对话 → 食堂查看反馈、收工。\n\n操作：WASD 移动，靠近发光文字后按 E 互动。", [["开始试玩", _start_game]])

func _start_game() -> void:
	if game.start_new_game():
		_show_intro()

func _show_intro() -> void:
	header.text = "第 %d / 5 天 · 晨间公告" % game.state.day
	_show("第 %d 天 · 今日任务" % game.state.day, "今日食材：%s\n\n先进入厨房：走到灶台按 E，做出一餐；随后从出口进入牢房走廊，给囚犯送饭并对话。\n\n大锅需要送给五人；小碗只送给指定的人。" % _inventory_text(), [["进入厨房", _enter_kitchen]])

func _enter_kitchen() -> void:
	var result := game.enter_kitchen()
	if bool(result.get("ok", false)):
		_set_room("Kitchen")
		modal.visible = false
		_refresh_sidebar()

func _refresh_sidebar() -> void:
	_clear(sidebar)
	if game.state == null:
		return
	_add_side("囚犯档案", _dossier)
	_add_side("案件板", _caseboard)
	var hint := Label.new()
	hint.text = "主操作在场景中\nWASD 移动 · E 互动"
	hint.add_theme_color_override("font_color", PAPER)
	sidebar.add_child(hint)

func _dossier() -> void:
	var actions: Array = []
	for prisoner_id in game.content.prisoner_ids():
		var prisoner: Dictionary = game.state.prisoners[prisoner_id]
		actions.append(["查阅 · %s" % prisoner.name, func(): _show_dossier_detail(prisoner_id)])
	actions.append(["关闭", _close])
	_show("囚犯档案室", "这里保存官方记录、料理偏好和你在送餐中观察到的实时状态。\n\n档案不会直接告诉你真相；把它和案件板里的线索、饭后反应放在一起看。", actions)

func _show_dossier_detail(prisoner_id: String) -> void:
	var dossier: Dictionary = game.investigation.dossier(prisoner_id, game.state)
	var sections := [String(dossier.get("identity", "")), String(dossier.get("public_record", "")), String(dossier.get("personality", ""))]
	_show("囚犯档案 · %s" % game.state.prisoners[prisoner_id].name, "\n\n".join(sections), [["料理与线索分析", func(): _show_dossier_analysis(prisoner_id)], ["返回档案室", _dossier], ["关闭", _close]])

func _show_dossier_analysis(prisoner_id: String) -> void:
	var dossier: Dictionary = game.investigation.dossier(prisoner_id, game.state)
	var sections := [String(dossier.get("food_intel", "")), String(dossier.get("current_state", "")), String(dossier.get("route", ""))]
	_show("分析页 · %s" % game.state.prisoners[prisoner_id].name, "\n\n".join(sections), [["返回官方档案", func(): _show_dossier_detail(prisoner_id)], ["关闭", _close]])

func _caseboard() -> void:
	var board: Dictionary = game.investigation.caseboard(game.state)
	var case_text := "%s\n\n%s\n\n%s\n\n%s" % [board.get("background", ""), board.get("truth_route", ""), board.get("network", ""), board.get("clues", "")]
	_show("墙面案件板", case_text, [["关闭", _close]])

func _investigate_dining(interaction_id: String) -> void:
	if interaction_id == "ClueWall":
		_caseboard()
		return
	var record: Dictionary = game.investigation.dining_interaction(interaction_id, game.state)
	var actions: Array = [["继续调查", _close]]
	if interaction_id == "RecordsCart":
		actions = [["打开囚犯档案", _dossier], ["继续调查", _close]]
	_show(String(record.get("title", "食堂")), String(record.get("text", "")), actions)

func _deliver_and_talk(prisoner_id: String) -> void:
	var delivery := game.deliver_meal(prisoner_id)
	if not bool(delivery.get("ok", false)):
		_show("无法送餐", String(delivery.get("message", "")), [["离开", _close]])
		return
	var prisoner: Dictionary = game.state.prisoners[prisoner_id]
	var remaining := game.delivery_targets().size() - game.state.delivered_prisoners.size()
	var body := "你把餐盒从牢窗递进去。"
	if remaining > 0:
		body += "\n还要送给 %d 人，食堂出口暂未开放。" % remaining
	else:
		body += "\n所有餐盒已送达，食堂出口已经开放。"
	_show("送餐 · %s" % prisoner.name, body, [["和他聊聊", func(): _talk(prisoner_id)], ["离开", _close]])

func _talk(prisoner_id: String) -> void:
	if game.state.daily_dialogue_count >= 2:
		_show("今日对话已满", "今天只能进行两次关键对话。明天再来。", [["离开", _close]])
		return
	selected_prisoner = prisoner_id
	var node := game.narrative.next_dialogue(prisoner_id, game.state)
	if node.is_empty():
		_show("%s" % game.state.prisoners[prisoner_id].name, "他今天没有新的话愿意交出来。明天的料理也许能改变他。", [["离开", _close]])
		return
	_show_node(prisoner_id, node)

func _show_node(prisoner_id: String, node: Dictionary) -> void:
	_clear(modal_box)
	modal.visible = true
	_title(String(node.get("speaker", "囚犯")))
	_text(String(node.get("text", "……")))
	for choice_variant in node.get("choices", []):
		var choice := choice_variant as Dictionary
		_button("▸ " + String(choice.text), func():
			var result := game.narrative.apply_choice(prisoner_id, choice, game.state)
			var next := String(result.get("next_id", "__end__"))
			if next == "__end__":
				_close()
				_refresh_sidebar()
			else:
				_show_node(prisoner_id, game.narrative.dialogue_node(next))
		)

func _cook() -> void:
	selected_ingredients = []
	selected_type = "bigPot"
	_render_cook()

func _render_cook() -> void:
	_clear(modal_box)
	modal.visible = true
	_title("灶台 · " + ("大锅（送给全体）" if selected_type == "bigPot" else "小碗（特供）"))
	var types := HBoxContainer.new()
	modal_box.add_child(types)
	for kind in ["bigPot", "smallBowl"]:
		var type_button := Button.new()
		type_button.text = "大锅" if kind == "bigPot" else "小碗特供"
		type_button.disabled = bool(game.state.daily_cooked.get(kind, false))
		type_button.pressed.connect(func(): selected_type = kind; _render_cook())
		types.add_child(type_button)
	if selected_type == "smallBowl":
		_text("特供对象：")
		var targets := HBoxContainer.new()
		modal_box.add_child(targets)
		for prisoner_id in game.content.prisoner_ids():
			var target_button := Button.new()
			target_button.text = String(game.state.prisoners[prisoner_id].name)
			target_button.pressed.connect(func(): selected_prisoner = prisoner_id; _render_cook())
			targets.add_child(target_button)
	_text("选择食材（大锅 3 种，小碗 2–3 种）：" + _inventory_text())
	var ingredients := GridContainer.new()
	ingredients.columns = 3
	modal_box.add_child(ingredients)
	for ingredient_variant in game.content.data().get("ingredients", []):
		var ingredient := ingredient_variant as Dictionary
		var ingredient_id := String(ingredient.id)
		var ingredient_button := CheckButton.new()
		ingredient_button.text = String(ingredient.name)
		ingredient_button.disabled = int(game.state.inventory.get(ingredient_id, 0)) == 0
		ingredient_button.button_pressed = selected_ingredients.has(ingredient_id)
		ingredient_button.toggled.connect(func(on: bool):
			if on and not selected_ingredients.has(ingredient_id):
				selected_ingredients.append(ingredient_id)
			if not on:
				selected_ingredients.erase(ingredient_id)
		)
		ingredients.add_child(ingredient_button)
	var methods := HBoxContainer.new()
	modal_box.add_child(methods)
	for method_variant in game.content.data().get("methods", []):
		var method := method_variant as Dictionary
		var method_button := Button.new()
		method_button.text = String(method.name)
		method_button.pressed.connect(func(): selected_method = String(method.id); _render_cook())
		methods.add_child(method_button)
	var platings := HBoxContainer.new()
	modal_box.add_child(platings)
	for plating_variant in game.content.data().get("platings", []):
		var plating := plating_variant as Dictionary
		var plating_button := Button.new()
		plating_button.text = String(plating.name)
		plating_button.pressed.connect(func(): selected_plating = String(plating.id); _render_cook())
		platings.add_child(plating_button)
	_text("当前做法：%s · 摆盘：%s" % [selected_method, selected_plating])
	_button("制作并装入餐箱", _pack_selected_meal)
	_button("返回", _close)

func _pack_selected_meal() -> void:
	var meal := game.cooking.prepare({"serving_type": selected_type, "target_id": selected_prisoner, "ingredient_ids": selected_ingredients, "method_id": selected_method, "plating_id": selected_plating, "overcook": false}, game.state)
	var packed := game.pack_meal(meal)
	if not bool(packed.get("ok", false)):
		_show("无法制作", String(packed.get("message", "条件未满足。")), [["返回", _render_cook]])
		return
	_show("餐箱已备好", "现在走到右侧的“牢房走廊出口”，按 E 开始送饭。", [["继续", func(): _close(); _update_world_text()]])

func _finish_at_dining() -> void:
	var feedback: Dictionary = game.state.delivery_feedback
	var lines: Array[String] = []
	for result_variant in feedback.get("results", []):
		var result := result_variant as Dictionary
		var prisoner: Dictionary = game.state.prisoners[String(result.id)]
		lines.append("%s · 本餐 %d · 长期满意 %d" % [prisoner.name, int(result.attitude), int(prisoner.relationship)])
	_show("食堂 · 今日反馈", "\n".join(lines), [["结束今天", _finish_day]])

func _finish_day() -> void:
	var result := game.finish_dining()
	if not bool(result.get("ok", false)):
		_show("暂不能收工", String(result.get("message", "")), [["继续", _close]])
		return
	if game.state.phase == "ending":
		var ending: Dictionary = game.content.data().get("endings", {}).get(game.state.ending_id, {})
		_show(String(ending.get("title", "结局")), String(ending.get("text", "")), [["再玩一次", _show_menu]])
	else:
		_set_room("Kitchen")
		_show_intro()

func _show(title: String, body: String, actions: Array) -> void:
	_clear(modal_box)
	modal.visible = true
	_title(title)
	_text(body)
	for action_variant in actions:
		var action: Array = action_variant
		_button(String(action[0]), action[1])

func _close() -> void:
	modal.visible = false

func _title(value: String) -> void:
	var label := Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", 23)
	label.add_theme_color_override("font_color", FIRE)
	modal_box.add_child(label)

func _text(value: String) -> void:
	var label := Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", PAPER)
	modal_box.add_child(label)

func _button(value: String, call: Callable) -> void:
	var button := Button.new()
	button.text = value
	button.custom_minimum_size = Vector2(0, 32)
	button.pressed.connect(call)
	modal_box.add_child(button)

func _add_side(value: String, call: Callable) -> void:
	var button := Button.new()
	button.text = value
	button.custom_minimum_size = Vector2(180, 28)
	button.pressed.connect(call)
	sidebar.add_child(button)

func _clear(container: Container) -> void:
	for child in container.get_children():
		child.queue_free()

func _inventory_text() -> String:
	var names: Array[String] = []
	for ingredient_variant in game.content.data().get("ingredients", []):
		var ingredient := ingredient_variant as Dictionary
		if int(game.state.inventory.get(String(ingredient.id), 0)) > 0:
			names.append(String(ingredient.name))
	return "、".join(names)
