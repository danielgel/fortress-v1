class_name FluidSystem
extends RefCounted
## Cellular fluid simulation using an active set. Levels run 0..7.
## Fluids only fall through stairwells (every other tile has a floor). Surface (z=0)
## tiles never spread sideways; lake tiles are infinite sources.
## Port of src/world/fluids.ts. `active` is a Dictionary used as an insertion-ordered set,
## which keeps the update order (and so the results) identical to the TS Set.

var world: World
var active := {}
var _step := 0


func _init(w: World) -> void:
	world = w
	w.on_opened = wake


## Register every fluid-bearing tile (used after generation / load).
func rebuild() -> void:
	active.clear()
	var water := world.water
	var magma := world.magma
	for i in world.size:
		if water[i] > 0 or magma[i] > 0:
			active[i] = true


func wake(i: int) -> void:
	var w := world
	active[i] = true
	var p := w.pos(i)
	# same order as World.neighbours4 in the TS: +x, -x, +y, -y
	if p.x + 1 < w.width:
		active[i + 1] = true
	if p.x > 0:
		active[i - 1] = true
	if p.y + 1 < w.height:
		active[i + w.width] = true
	if p.y > 0:
		active[i - w.width] = true
	if p.z > 0:
		active[i - w.width * w.height] = true


func active_count() -> int:
	return active.size()


## Advance one fluid step. Water every step, magma every 4th.
func update() -> void:
	_step += 1
	var cells := active.keys()
	active.clear()
	var magma_turn := _step % 4 == 0
	var magma := world.magma
	for i: int in cells:
		_flow(i, true)
		if magma_turn:
			_flow(i, false)
		elif magma[i] > 0:
			active[i] = true


func _can_hold(i: int, level: PackedByteArray, other: PackedByteArray) -> bool:
	if not (world.flags[i] & Tile.OPEN):
		return false
	return other[i] == 0 and level[i] < Tile.MAX_FLUID


func _flow(i: int, is_water: bool) -> void:
	var w := world
	var level := w.water if is_water else w.magma
	var other := w.magma if is_water else w.water
	var l := level[i]
	if l == 0:
		return
	var flags := w.flags
	var plane := w.width * w.height
	var z := i / plane
	var is_source := is_water and (flags[i] & Tile.SOURCE) != 0

	# 1. fall down - only through an open stairwell, otherwise the tile has a solid floor
	if z + 1 < w.depth and flags[i] & Tile.STAIRS_DOWN:
		var below := i + plane
		if _can_hold(below, level, other):
			var amount := mini(l, Tile.MAX_FLUID - level[below])
			level[below] += amount
			if not is_source:
				level[i] -= amount
			wake(below)
			active[i] = true
			return
	if z == 0 or is_source:
		return

	# 2. spread sideways to lower neighbours (+x, -x, +y, -y)
	var x := i % w.width
	var y := (i / w.width) % w.height
	var moved := false
	for k in 4:
		var n: int
		if k == 0:
			if x + 1 >= w.width:
				continue
			n = i + 1
		elif k == 1:
			if x == 0:
				continue
			n = i - 1
		elif k == 2:
			if y + 1 >= w.height:
				continue
			n = i + w.width
		else:
			if y == 0:
				continue
			n = i - w.width
		if _can_hold(n, level, other) and level[i] - level[n] >= 2:
			level[i] -= 1
			level[n] += 1
			active[n] = true
			moved = true
			if level[i] <= 1:
				break
	if moved:
		active[i] = true
