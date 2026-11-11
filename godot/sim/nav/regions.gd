class_name Regions
extends RefCounted
## Connected areas a ground walker can move between (doors open, stairs used, no swimming),
## so a search for an unreachable target can be refused at once instead of exploring the
## whole region first, which is the pathfinder's worst case.
##
## A diagonal step needs both orthogonal neighbours open, so 4-way connectivity plus stairs
## is exactly the pathfinder's reachability. Stairs are treated as two-way; if one ever
## isn't, two areas may share a label and the search runs as before (never a wrong refusal).
##
## Walkability changes with digging, building and water depth, so the owner calls
## recompute() after the world changes. Not part of the TS version: added by the spike.

var world: World
## Region id per tile; 0 = not walkable.
var labels := PackedInt32Array()
var count := 0


func _init(w: World) -> void:
	world = w
	recompute()


func recompute() -> void:
	var w := world
	var width := w.width
	var height := w.height
	var plane := width * height
	labels.resize(w.size)
	labels.fill(0)
	count = 0
	var lab := labels
	var flags := w.flags
	var feature := w.feature
	var building := w.building
	var water := w.water
	var magma := w.magma
	var walk_b := Content.WALKABLE
	# walkable once, as a byte mask (same rule as World.walkable)
	var ok := PackedByteArray()
	ok.resize(w.size)
	for i in w.size:
		var b := building[i]
		if flags[i] & Tile.OPEN and feature[i] != Tile.Feat.TREE and magma[i] == 0 and water[i] <= 3 and (b == 0 or walk_b[b]):
			ok[i] = 1
	var stack := PackedInt32Array()
	for seed in w.size:
		if not ok[seed] or lab[seed] != 0:
			continue
		count += 1
		var id := count
		lab[seed] = id
		stack.append(seed)
		while not stack.is_empty():
			var i := stack[stack.size() - 1]
			stack.remove_at(stack.size() - 1)
			var x := i % width
			var y := (i / width) % height
			if x + 1 < width and ok[i + 1] and lab[i + 1] == 0:
				lab[i + 1] = id
				stack.append(i + 1)
			if x > 0 and ok[i - 1] and lab[i - 1] == 0:
				lab[i - 1] = id
				stack.append(i - 1)
			if y + 1 < height and ok[i + width] and lab[i + width] == 0:
				lab[i + width] = id
				stack.append(i + width)
			if y > 0 and ok[i - width] and lab[i - width] == 0:
				lab[i - width] = id
				stack.append(i - width)
			var f := flags[i]
			if f & Tile.STAIRS_DOWN and i + plane < w.size and ok[i + plane] and lab[i + plane] == 0:
				lab[i + plane] = id
				stack.append(i + plane)
			if f & Tile.STAIRS_UP and i >= plane and ok[i - plane] and lab[i - plane] == 0:
				lab[i - plane] = id
				stack.append(i - plane)


func label_at(p: Vector3i) -> int:
	return labels[world.idx(p.x, p.y, p.z)] if world.in_bounds(p.x, p.y, p.z) else 0


## False only when `b` is certainly out of reach from `a` (unknown starts give true).
func connected(a: Vector3i, b: Vector3i) -> bool:
	var la := label_at(a)
	return la == 0 or la == label_at(b)


## Could a walker at `start` stand next to (or on) `target`? Same caveat as connected().
func can_reach_adjacent(start: Vector3i, target: Vector3i, allow_on_target: bool) -> bool:
	var la := label_at(start)
	if la == 0:
		return true
	if allow_on_target and label_at(target) == la:
		return true
	for n: Vector3i in [target + Vector3i.RIGHT, target + Vector3i.LEFT, target + Vector3i(0, 1, 0), target + Vector3i(0, -1, 0)]:
		if label_at(n) == la:
			return true
	return false
