class_name PathFinder
## A* over the 3D tile grid. Port of src/nav/astar.ts: same heap, same neighbour order and
## the same float costs, so paths match the TS version tile for tile.
##
## Instead of per-search Maps/Sets it reuses flat scratch arrays stamped with a search id,
## so nothing is cleared or allocated per call.

const DEFAULT_MAX_NODES := 25000
const DIAGONAL := 1.414
const GOAL_EXACT := 0
const GOAL_ADJACENT := 1
const GOAL_CALLABLE := 2
## dx, dy pairs in the TS order: E W S N, SE NE SW NW
const DIRS: Array[int] = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1]


class Constraints:
	var can_swim: bool
	var can_use_stairs: bool
	var can_open_doors: bool

	func _init(swim := false, stairs := true, doors := true) -> void:
		can_swim = swim
		can_use_stairs = stairs
		can_open_doors = doors


static var DEFAULT := Constraints.new()
static var NO_DOORS := Constraints.new(false, true, false)

static var _search := 0
static var _g_stamp := PackedInt32Array()
static var _closed := PackedInt32Array()
static var _g := PackedFloat64Array()
static var _from := PackedInt32Array()
## Binary min-heap (items + keys) ported verbatim for identical tie-breaking.
static var _heap_items := PackedInt32Array()
static var _heap_keys := PackedFloat64Array()
static var _heap_size := 0
static var _open_dir := PackedByteArray([0, 0, 0, 0, 0, 0, 0, 0])


## Path from `start` to the first tile where `is_goal.call(x, y, z)` is true, as the steps
## after `start`, or null when there is none (like the TS `Pos[] | null`). `hint` (a Vector3i
## or null) only steers the heuristic.
static func find_path(world: World, start: Vector3i, is_goal: Callable, hint: Variant, max_nodes := DEFAULT_MAX_NODES, c: Constraints = DEFAULT) -> Variant:
	return _route(world, start, _search_from(world, start, GOAL_CALLABLE, -1, is_goal, false, hint, max_nodes, c))


## Path to any tile orthogonally adjacent to (or equal to) the target, or null. With `regions`
## (kept up to date by the caller), unreachable targets are refused without searching.
static func find_path_adjacent(world: World, start: Vector3i, target: Vector3i, max_nodes := DEFAULT_MAX_NODES, c: Constraints = DEFAULT, allow_on_target := true, regions: Regions = null) -> Variant:
	if regions and _plain(c) and not regions.can_reach_adjacent(start, target, allow_on_target):
		return null
	return _route(world, start, _search_from(world, start, GOAL_ADJACENT, -1, Callable(), allow_on_target, target, max_nodes, c))


## Path to exactly `target`, or null. `regions` as in find_path_adjacent.
static func find_path_to(world: World, start: Vector3i, target: Vector3i, max_nodes := DEFAULT_MAX_NODES, c: Constraints = DEFAULT, regions: Regions = null) -> Variant:
	if not world.in_bounds(target.x, target.y, target.z):
		return null
	if regions and _plain(c) and not regions.connected(start, target):
		return null
	return _route(world, start, _search_from(world, start, GOAL_EXACT, world.idx(target.x, target.y, target.z), Callable(), false, target, max_nodes, c))


## Region labels describe walkers that open doors, use stairs and don't swim.
static func _plain(c: Constraints) -> bool:
	return c.can_open_doors and c.can_use_stairs and not c.can_swim


static func _route(world: World, start: Vector3i, found: int) -> Variant:
	if found < 0:
		return null
	var result: Array[Vector3i] = []
	var start_idx := world.idx(start.x, start.y, start.z)
	var cur := found
	while cur != start_idx:
		result.append(world.pos(cur))
		cur = _from[cur]
	result.reverse()
	return result


## Runs the search; returns the goal tile index or -1. Leaves the route in _from.
## The goal is GOAL_EXACT: tile `goal_idx`; GOAL_ADJACENT: a walkable tile next to the hint
## (or on it, if `on_target`); GOAL_CALLABLE: wherever `is_goal` says. The first two are the
## TS goal closures inlined, which saves a Callable call per expanded tile.
static func _search_from(world: World, start: Vector3i, mode: int, goal_idx: int, is_goal: Callable, on_target: bool, hint: Variant, max_nodes: int, c: Constraints) -> int:
	if _g.size() < world.size:
		_g_stamp.resize(world.size)
		_closed.resize(world.size)
		_g.resize(world.size)
		_from.resize(world.size)
		_g_stamp.fill(0)
		_closed.fill(0)
	_search += 1
	if _search >= 0x7FFFFFFF:
		_search = 1
		_g_stamp.fill(0)
		_closed.fill(0)
	var s := _search
	var g_stamp := _g_stamp
	var closed := _closed
	var g := _g
	var from := _from

	var w := world.width
	var h := world.height
	var d := world.depth
	var plane := w * h
	var flags := world.flags
	var feature := world.feature
	var building := world.building
	var water := world.water
	var magma := world.magma
	var walkable_building := Content.WALKABLE
	var swim := c.can_swim
	var doors := c.can_open_doors
	var stairs := c.can_use_stairs
	var has_hint := hint != null
	var hx := 0
	var hy := 0
	var hz := 0
	if has_hint:
		hx = hint.x
		hy = hint.y
		hz = hint.z

	var start_idx := (start.z * h + start.y) * w + start.x
	g_stamp[start_idx] = s
	g[start_idx] = 0.0
	_heap_size = 0
	_heap_push(start_idx, float(absi(start.x - hx) + absi(start.y - hy) + absi(start.z - hz) * 2) if has_hint else 0.0)

	var expanded := 0
	while _heap_size > 0 and expanded < max_nodes:
		var cur := _heap_pop()
		if closed[cur] == s:
			continue
		closed[cur] = s
		expanded += 1
		var px := cur % w
		var py := (cur / w) % h
		var pz := cur / plane
		if mode == GOAL_EXACT:
			if cur == goal_idx:
				return cur
		elif mode == GOAL_ADJACENT:
			if pz == hz and world.walkable(px, py, pz):
				var md := absi(px - hx) + absi(py - hy)
				if md == 1 or (md == 0 and on_target):
					return cur
		elif is_goal.call(px, py, pz):
			return cur

		var gc := g[cur]
		# passable(x, y, pz) for the 8 neighbours, worked out once each: the TS asks again for the
		# corner check, with the same answers
		var open_dir := _open_dir
		for k in 8:
			var nx := px + DIRS[k * 2]
			var ny := py + DIRS[k * 2 + 1]
			var ok := false
			if nx >= 0 and nx < w and ny >= 0 and ny < h:
				var ni := cur + (ny - py) * w + (nx - px)
				var f := flags[ni]
				if (doors or not (f & Tile.DOOR)) and f & Tile.OPEN and magma[ni] == 0:
					var wet := water[ni]
					var b := building[ni]
					if feature[ni] != Tile.Feat.TREE and wet <= 3 and (b == 0 or walkable_building[b]):
						ok = true
					elif swim and wet > 0:
						ok = true
			open_dir[k] = 1 if ok else 0

		for k in 8:
			if not open_dir[k]:
				continue
			var dx := DIRS[k * 2]
			var dy := DIRS[k * 2 + 1]
			var step := 1.0
			if k >= 4:
				# no cutting corners through walls: E/W is open_dir[0|1], S/N is open_dir[2|3]
				if not (open_dir[0 if dx == 1 else 1] and open_dir[2 if dy == 1 else 3]):
					continue
				step = DIAGONAL
			var ni := cur + dy * w + dx
			if closed[ni] == s:
				continue
			var ng := gc + step * (1 + water[ni] * 0.5)
			if g_stamp[ni] != s or ng < g[ni]:
				g_stamp[ni] = s
				g[ni] = ng
				from[ni] = cur
				_heap_push(ni, ng + (absi(px + dx - hx) + absi(py + dy - hy) + absi(pz - hz) * 2 if has_hint else 0))

		if stairs:
			var f := flags[cur]
			if f & Tile.STAIRS_DOWN and pz + 1 < d and _passable(world, cur + plane, swim, doors):
				_consider_stairs(world, cur + plane, cur, gc, absi(px - hx) + absi(py - hy) + absi(pz + 1 - hz) * 2 if has_hint else 0)
			if f & Tile.STAIRS_UP and pz > 0 and _passable(world, cur - plane, swim, doors):
				_consider_stairs(world, cur - plane, cur, gc, absi(px - hx) + absi(py - hy) + absi(pz - 1 - hz) * 2 if has_hint else 0)
	return -1


static func _passable(world: World, i: int, swim: bool, doors: bool) -> bool:
	var f := world.flags[i]
	if not doors and f & Tile.DOOR:
		return false
	if not (f & Tile.OPEN) or world.magma[i] != 0:
		return false
	var wet := world.water[i]
	var b := world.building[i]
	if world.feature[i] != Tile.Feat.TREE and wet <= 3 and (b == 0 or Content.WALKABLE[b]):
		return true
	return swim and wet > 0


## The TS `consider` for a stairs step (cost 1 times the destination's move cost).
static func _consider_stairs(world: World, ni: int, cur: int, gc: float, h: int) -> void:
	if _closed[ni] == _search:
		return
	var ng := gc + 1 * (1 + world.water[ni] * 0.5)
	if _g_stamp[ni] != _search or ng < _g[ni]:
		_g_stamp[ni] = _search
		_g[ni] = ng
		_from[ni] = cur
		_heap_push(ni, ng + h)


static func _heap_push(item: int, key: float) -> void:
	var items := _heap_items
	var keys := _heap_keys
	var i := _heap_size
	if i >= items.size():
		items.resize(maxi(64, i * 2))
		keys.resize(maxi(64, i * 2))
	_heap_size += 1
	while i > 0:
		var parent := (i - 1) >> 1
		if keys[parent] <= key:
			break
		items[i] = items[parent]
		keys[i] = keys[parent]
		i = parent
	items[i] = item
	keys[i] = key


static func _heap_pop() -> int:
	var items := _heap_items
	var keys := _heap_keys
	var top := items[0]
	_heap_size -= 1
	var n := _heap_size
	var last_item := items[n]
	var last_key := keys[n]
	if n > 0:
		var i := 0
		while true:
			var c := i * 2 + 1
			if c >= n:
				break
			if c + 1 < n and keys[c + 1] < keys[c]:
				c += 1
			if keys[c] >= last_key:
				break
			items[i] = items[c]
			keys[i] = keys[c]
			i = c
		items[i] = last_item
		keys[i] = last_key
	return top
