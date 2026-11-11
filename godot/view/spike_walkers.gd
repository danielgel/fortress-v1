class_name SpikeWalkers
extends Node2D
## Stand-in dwarves for the spike: no jobs, needs or AI yet, they just pick a random reachable
## spot nearby and walk there with the real pathfinder and the TS movement timing. The
## simulation side is tick-driven; sprites glide between tiles every frame.

const SPEED_TICKS := 3  ## ticks per orthogonal step at walking pace
const WANDER_RADIUS := 24

var world: World
var regions: Regions
var renderer: LevelRenderer
var rng := Rng.new(1234)
var paths_planned := 0
var path_ms := 0.0

var _walkers: Array[Walker] = []


class Walker:
	var pos: Vector3i
	var path: Array[Vector3i] = []
	var cooldown := 0
	var sprite: Sprite2D


func reset(w: World, r: Regions, site: Vector2i, count: int) -> void:
	world = w
	regions = r
	for wk in _walkers:
		wk.sprite.queue_free()
	_walkers.clear()
	for n in count:
		var wk := Walker.new()
		wk.pos = Vector3i(site.x, site.y, 0)
		for tries in 60:
			var x := site.x + rng.below(7) - 3
			var y := site.y + rng.below(7) - 3
			if w.walkable(x, y, 0):
				wk.pos = Vector3i(x, y, 0)
				break
		wk.sprite = Sprite2D.new()
		wk.sprite.centered = false
		wk.sprite.texture = AtlasTexture.new()
		wk.sprite.position = _px(wk.pos)
		add_child(wk.sprite)
		_walkers.append(wk)
	refresh_sprites()


## Call after the renderer's mode changes, so walkers use the matching atlas.
func refresh_sprites() -> void:
	for wk in _walkers:
		var tex: AtlasTexture = wk.sprite.texture
		tex.atlas = renderer.current_texture()
		tex.region = renderer.glyph_region("@")


func tick() -> void:
	for wk in _walkers:
		if wk.cooldown > 0:
			wk.cooldown -= 1
		elif not wk.path.is_empty():
			var next: Vector3i = wk.path.pop_front()
			if not world.walkable(next.x, next.y, next.z):
				wk.path.clear()  # flooded or built over since planning: plan again
				continue
			var diag := next.x != wk.pos.x and next.y != wk.pos.y
			wk.pos = next
			wk.cooldown = I32.js_round(SPEED_TICKS * (1.4 if diag else 1.0) * world.move_cost(next.x, next.y, next.z)) - 1
		else:
			_plan(wk)


func _plan(wk: Walker) -> void:
	var p := wk.pos
	var target := Vector3i(p.x + rng.below(WANDER_RADIUS * 2 + 1) - WANDER_RADIUS, p.y + rng.below(WANDER_RADIUS * 2 + 1) - WANDER_RADIUS, p.z)
	if not world.walkable(target.x, target.y, target.z):
		wk.cooldown = 5
		return
	var t := Time.get_ticks_usec()
	var path: Variant = PathFinder.find_path_to(world, p, target, 4000, PathFinder.DEFAULT, regions)
	path_ms += (Time.get_ticks_usec() - t) / 1000.0
	paths_planned += 1
	if path == null:
		wk.cooldown = 10
	else:
		wk.path = path


func count_on_level(z: int) -> int:
	return _walkers.filter(func(wk: Walker) -> bool: return wk.pos.z == z).size()


func _process(delta: float) -> void:
	var z := renderer.z
	var k := minf(1.0, delta * 12)
	for wk in _walkers:
		wk.sprite.visible = wk.pos.z == z
		wk.sprite.position = wk.sprite.position.lerp(_px(wk.pos), k)


func _px(p: Vector3i) -> Vector2:
	return Vector2(p.x, p.y) * renderer.cell
