extends Node
## The spike's single scene: a generated world on screen with wandering stand-in dwarves,
## fluids you can unleash, ASCII/sprite switching and a debug panel with timings.
## Nodes are built in code to keep the spike small; the real UI (Phase 2) gets proper scenes.

const SIZES := {
	"small 80x80x8": {width = 80, height = 80, depth = 8},
	"medium 100x100x10": {width = 100, height = 100, depth = 10},
	"large 140x140x12": {width = 140, height = 140, depth = 12},
}
const WALKERS := 20

var world: World
var fluids: FluidSystem
var regions: Regions
var calendar := WorldCalendar.new()
var clock := TickClock.new()
var site := Vector2i.ZERO
var tick := 0

var renderer: LevelRenderer
var walkers: SpikeWalkers
var overlay: Node2D
var camera: CameraRig
var night: ColorRect
var info: Label
var bench_out: Label
var size_pick: OptionButton
var seed_edit: LineEdit
var mode_button: Button

var _dirty := {}  ## tiles fluids touched since the last frame
var _fluid_changes := 0  ## fluid steps since regions were last recomputed
var _hover := Vector2i(-1, -1)
var _info_at := 0.0
var _last_gen_ms := 0.0
var _last_repaint_ms := 0.0
var _frame_ms := 0.0


func _ready() -> void:
	var view := Node2D.new()
	add_child(view)
	renderer = LevelRenderer.new()
	view.add_child(renderer)
	walkers = SpikeWalkers.new()
	walkers.renderer = renderer
	view.add_child(walkers)
	overlay = Node2D.new()
	overlay.draw.connect(_draw_overlay)
	view.add_child(overlay)
	camera = CameraRig.new()
	add_child(camera)

	var night_layer := CanvasLayer.new()
	night_layer.layer = 1
	add_child(night_layer)
	night = ColorRect.new()
	night.mouse_filter = Control.MOUSE_FILTER_IGNORE
	night.set_anchors_preset(Control.PRESET_FULL_RECT)
	night_layer.add_child(night)
	_build_ui()
	new_world(SIZES.values()[1].merged({seed = 12345}))


func new_world(p: Dictionary) -> void:
	var t := Time.get_ticks_usec()
	world = WorldGen.generate(p)
	site = WorldGen.find_embark_site(world)
	WorldGen.clear_embark(world, site.x, site.y)
	_last_gen_ms = (Time.get_ticks_usec() - t) / 1000.0
	fluids = FluidSystem.new(world)
	fluids.rebuild()
	regions = Regions.new(world)
	tick = 8 * WorldCalendar.TICKS_PER_HOUR  # start the first morning, like GameEngine.create
	calendar.tick = tick
	renderer.z = 0
	_timed_repaint(func() -> void: renderer.set_world(world))
	walkers.reset(world, regions, site, WALKERS)
	camera.position = Vector2(site) * renderer.cell
	seed_edit.text = str(p.seed)


func _process(delta: float) -> void:
	var t := Time.get_ticks_usec()
	clock.advance(delta * 1000, _tick)
	if not _dirty.is_empty():
		renderer.repaint_indices(_dirty.keys())
		_dirty.clear()
	if _fluid_changes >= 200:
		regions.recompute()  # water levels change walkability (see Regions)
		_fluid_changes = 0

	var dark := calendar.darkness() * 0.55 if renderer.z == 0 else 0.0
	night.color = Color(4 / 255.0, 8 / 255.0, 36 / 255.0, minf(0.75, dark))
	var mouse := renderer.get_local_mouse_position() / renderer.cell
	var hover := Vector2i(floori(mouse.x), floori(mouse.y))
	if hover != _hover:
		_hover = hover
		overlay.queue_redraw()
	_frame_ms = lerpf(_frame_ms, (Time.get_ticks_usec() - t) / 1000.0, 0.1)
	_info_at -= delta
	if _info_at <= 0:
		_info_at = 0.2
		_update_info()


func _tick() -> void:
	tick += 1
	calendar.tick = tick
	if tick % 5 == 0:
		fluids.update()
		if fluids.active_count() > 0:
			_fluid_changes += 1
		for i: int in fluids.active:
			_dirty[i] = true
	walkers.tick()


func set_level(z: int) -> void:
	if z < 0 or z >= world.depth or z == renderer.z:
		return
	_timed_repaint(func() -> void: renderer.set_level(z))


func breach(fluid: String) -> void:
	var at: Variant = Scenarios.breach(world, fluid)
	if at == null:
		_toast("No %s pocket left to breach." % fluid)
		return
	regions.recompute()
	var p: Vector3i = at
	camera.position = Vector2(p.x + 8, p.y) * renderer.cell
	if p.z == renderer.z:
		_timed_repaint(func() -> void: renderer.repaint_all())
	else:
		set_level(p.z)
	_toast("Breached a %s pocket at z=%d: digging 12 tiles east, stairs down at the end." % [fluid, p.z])


func _timed_repaint(fn: Callable) -> void:
	var t := Time.get_ticks_usec()
	fn.call()
	_last_repaint_ms = (Time.get_ticks_usec() - t) / 1000.0


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and not event.ctrl_pressed:
		match (event as InputEventMouseButton).button_index:
			MOUSE_BUTTON_WHEEL_UP:
				set_level(renderer.z - 1)
			MOUSE_BUTTON_WHEEL_DOWN:
				set_level(renderer.z + 1)
	elif event is InputEventKey and event.pressed and not event.echo:
		match (event as InputEventKey).keycode:
			KEY_PAGEUP, KEY_COMMA:
				set_level(renderer.z - 1)
			KEY_PAGEDOWN, KEY_PERIOD:
				set_level(renderer.z + 1)
			KEY_TAB:
				_toggle_mode()
			KEY_SPACE:
				clock.paused = not clock.paused
			KEY_1, KEY_2, KEY_3, KEY_4:
				clock.paused = false
				clock.set_speed(event.keycode - KEY_0)
			KEY_N:
				_toggle_winter()
			KEY_B:
				breach("water")
			KEY_M:
				breach("magma")
			KEY_H:
				camera.position = Vector2(site) * renderer.cell
				set_level(0)
			_:
				return
		get_viewport().set_input_as_handled()


func _toggle_mode() -> void:
	renderer.set_mode("ascii" if renderer.mode == "sprites" else "sprites")
	walkers.refresh_sprites()
	mode_button.text = "View: %s (Tab)" % renderer.mode


func _toggle_winter() -> void:
	renderer.freezing = not renderer.freezing
	_timed_repaint(func() -> void: renderer.repaint_all())


func _draw_overlay() -> void:
	if world and world.in_bounds(_hover.x, _hover.y, renderer.z):
		var c := renderer.cell
		overlay.draw_rect(Rect2(Vector2(_hover) * c, Vector2(c, c)), Color(1, 1, 1, 0.95), false, 1.5)


func _update_info() -> void:
	var lines := PackedStringArray([
		"%s   z=%d %s" % [calendar.describe(), renderer.z, "(surface)" if renderer.z == 0 else ""],
		"FPS %d   frame work %.2f ms   speed %d%s" % [Engine.get_frames_per_second(), _frame_ms, clock.speed, "  PAUSED" if clock.paused else ""],
		"world %dx%dx%d seed %s, generated in %.0f ms" % [world.width, world.height, world.depth, seed_edit.text, _last_gen_ms],
		"last full repaint %.1f ms   fluid cells active %d   regions %d" % [_last_repaint_ms, fluids.active_count(), regions.count],
		"walkers here %d/%d   paths planned %d (avg %.2f ms)" % [walkers.count_on_level(renderer.z), WALKERS, walkers.paths_planned, walkers.path_ms / maxi(1, walkers.paths_planned)],
	])
	if world.in_bounds(_hover.x, _hover.y, renderer.z):
		var i := world.idx(_hover.x, _hover.y, renderer.z)
		var f := world.flags[i]
		var what := PackedStringArray()
		if renderer.z == 0:
			what.append(Biome.INFO[world.biome[_hover.y * world.width + _hover.x]].name)
		what.append(Tile.Mat.keys()[world.material[i]].to_lower())
		if world.feature[i]:
			what.append(Tile.Feat.keys()[world.feature[i]].to_lower())
		what.append("open" if f & Tile.OPEN else "solid")
		if world.water[i]:
			what.append("water %d" % world.water[i])
		if world.magma[i]:
			what.append("magma %d" % world.magma[i])
		lines.append("(%d, %d): %s" % [_hover.x, _hover.y, ", ".join(what)])
	info.text = "\n".join(lines)


func _toast(text: String) -> void:
	bench_out.text = text
	bench_out.visible = true


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 2
	add_child(layer)
	var panel := PanelContainer.new()
	panel.position = Vector2(8, 8)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.05, 0.07, 0.85)
	style.set_content_margin_all(8)
	panel.add_theme_stylebox_override("panel", style)
	layer.add_child(panel)
	var box := VBoxContainer.new()
	panel.add_child(box)

	var title := Label.new()
	title.text = "Fortress — Godot spike"
	box.add_child(title)
	info = Label.new()
	box.add_child(info)

	var row := HBoxContainer.new()
	box.add_child(row)
	mode_button = _button(row, "View: sprites (Tab)", _toggle_mode)
	_button(row, "Winter (N)", _toggle_winter)
	_button(row, "Breach water (B)", breach.bind("water"))
	_button(row, "Breach magma (M)", breach.bind("magma"))
	_button(row, "Up", func() -> void: set_level(renderer.z - 1))
	_button(row, "Down", func() -> void: set_level(renderer.z + 1))

	var speed := HBoxContainer.new()
	box.add_child(speed)
	_button(speed, "Pause (Space)", func() -> void: clock.paused = not clock.paused)
	for s in range(1, 5):
		_button(speed, "Speed %d" % s, func() -> void:
			clock.paused = false
			clock.set_speed(s))
	_button(speed, "Home (H)", func() -> void:
		camera.position = Vector2(site) * renderer.cell
		set_level(0))

	var gen := HBoxContainer.new()
	box.add_child(gen)
	size_pick = OptionButton.new()
	for name: String in SIZES:
		size_pick.add_item(name)
	size_pick.select(1)
	gen.add_child(size_pick)
	seed_edit = LineEdit.new()
	seed_edit.custom_minimum_size.x = 120
	seed_edit.placeholder_text = "seed"
	gen.add_child(seed_edit)
	_button(gen, "Generate", func() -> void:
		var p: Dictionary = SIZES.values()[size_pick.selected].duplicate()
		p.seed = int(seed_edit.text) if seed_edit.text.is_valid_int() and int(seed_edit.text) > 0 else randi_range(1, 2147483646)
		new_world(p))
	_button(gen, "Random", func() -> void:
		var p: Dictionary = SIZES.values()[size_pick.selected].duplicate()
		p.seed = randi_range(1, 2147483646)
		new_world(p))
	_button(gen, "Run bench", _run_bench)

	bench_out = Label.new()
	bench_out.visible = false
	bench_out.add_theme_font_override("font", load("res://assets/fonts/DejaVuSansMono.ttf"))
	bench_out.add_theme_font_size_override("font_size", 12)
	box.add_child(bench_out)

	var help := Label.new()
	help.text = "Arrows/WASD pan · right-drag pan · wheel or PgUp/PgDn change level · Ctrl+wheel or +/- zoom · 1-4 speed"
	help.modulate = Color(1, 1, 1, 0.6)
	box.add_child(help)


func _button(parent: Control, text: String, fn: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(fn)
	parent.add_child(b)
	return b


func _run_bench() -> void:
	_toast("Running benchmarks: the window freezes for about 20 seconds...")
	await get_tree().process_frame
	await get_tree().process_frame
	_toast(Bench.table(Bench.run()))
