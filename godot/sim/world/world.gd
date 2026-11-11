class_name World
extends RefCounted
## The whole world as flat byte arrays. z=0 is the surface, higher z is deeper.
## Port of src/world/world.ts. Positions are Vector3i.

var width: int
var height: int
var depth: int
var size: int
var material := PackedByteArray()
var flags := PackedByteArray()
var feature := PackedByteArray()
var water := PackedByteArray()
var magma := PackedByteArray()
## Furniture / workshop on each tile (see Content.Building).
var building := PackedByteArray()
## Days a farm plot's crop has grown.
var crop := PackedByteArray()
## Surface biome per (x,y) column.
var biome := PackedByteArray()
## Indices of every tile that holds a building (keys; insertion-ordered like the TS Set).
var building_tiles := {}
## Called with a tile index when it becomes open so fluids can react.
var on_opened := Callable()


func _init(w: int, h: int, d: int) -> void:
	width = w
	height = h
	depth = d
	size = w * h * d
	material.resize(size)
	flags.resize(size)
	feature.resize(size)
	water.resize(size)
	magma.resize(size)
	building.resize(size)
	crop.resize(size)
	biome.resize(w * h)


func in_bounds(x: int, y: int, z: int) -> bool:
	return x >= 0 and x < width and y >= 0 and y < height and z >= 0 and z < depth


func idx(x: int, y: int, z: int) -> int:
	return (z * height + y) * width + x


func pos(i: int) -> Vector3i:
	return Vector3i(i % width, (i / width) % height, i / (width * height))


func has(x: int, y: int, z: int, flag: int) -> bool:
	return in_bounds(x, y, z) and (flags[idx(x, y, z)] & flag) != 0


func is_open(x: int, y: int, z: int) -> bool:
	return has(x, y, z, Tile.OPEN)


func feature_at(x: int, y: int, z: int) -> int:
	return feature[idx(x, y, z)] if in_bounds(x, y, z) else Tile.Feat.NONE


func material_at(x: int, y: int, z: int) -> int:
	return material[idx(x, y, z)]


## Can a ground-bound walker stand here?
func walkable(x: int, y: int, z: int) -> bool:
	if not in_bounds(x, y, z):
		return false
	var i := idx(x, y, z)
	if not (flags[i] & Tile.OPEN):
		return false
	if feature[i] == Tile.Feat.TREE:
		return false
	if building[i] and not Content.WALKABLE[building[i]]:
		return false
	return magma[i] == 0 and water[i] <= 3


func move_cost(x: int, y: int, z: int) -> float:
	return 1 + water[idx(x, y, z)] * 0.5


## Mark tile and neighbours as seen (fog of war).
func discover_around(x: int, y: int, z: int) -> void:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if in_bounds(x + dx, y + dy, z):
				flags[idx(x + dx, y + dy, z)] |= Tile.DISCOVERED


## Turn a solid tile into an open floor. Returns the feature that was inside it.
func excavate(x: int, y: int, z: int) -> int:
	var i := idx(x, y, z)
	var found := feature[i]
	feature[i] = Tile.Feat.NONE
	flags[i] |= Tile.OPEN
	discover_around(x, y, z)
	if on_opened.is_valid():
		on_opened.call(i)
	return found


## Turn an open tile back into solid wall.
func fill(x: int, y: int, z: int, mat := Tile.Mat.STONE) -> void:
	var i := idx(x, y, z)
	flags[i] &= ~(Tile.OPEN | Tile.STAIRS_UP | Tile.STAIRS_DOWN | Tile.DOOR)
	material[i] = mat
	feature[i] = Tile.Feat.NONE
	set_building(x, y, z, Content.Building.NONE)


func building_at(x: int, y: int, z: int) -> int:
	return building[idx(x, y, z)] if in_bounds(x, y, z) else Content.Building.NONE


func set_building(x: int, y: int, z: int, b: int) -> void:
	var i := idx(x, y, z)
	building[i] = b
	crop[i] = 0
	if b == Content.Building.NONE:
		building_tiles.erase(i)
	else:
		building_tiles[i] = true
	if b == Content.Building.DOOR:
		flags[i] |= Tile.DOOR
	else:
		flags[i] &= ~Tile.DOOR


## Rebuild the building index from the raw array (after loading).
func index_buildings() -> void:
	building_tiles.clear()
	for i in size:
		if building[i]:
			building_tiles[i] = true


func set_stairs_down(x: int, y: int, z: int) -> void:
	if z + 1 >= depth:
		return
	excavate(x, y, z)
	flags[idx(x, y, z)] |= Tile.STAIRS_DOWN
	excavate(x, y, z + 1)
	flags[idx(x, y, z + 1)] |= Tile.STAIRS_UP


func duplicate_world() -> World:
	var c := World.new(width, height, depth)
	c.material = material.duplicate()
	c.flags = flags.duplicate()
	c.feature = feature.duplicate()
	c.water = water.duplicate()
	c.magma = magma.duplicate()
	c.building = building.duplicate()
	c.crop = crop.duplicate()
	c.biome = biome.duplicate()
	c.index_buildings()
	return c
