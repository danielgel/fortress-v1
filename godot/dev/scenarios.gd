class_name Scenarios
## Deterministic scenarios for the parity tests and benchmarks.
## Mirrors tests/golden-scenarios.ts in the TS project: keep the two in sync.

const SMALL := {width = 60, height = 60, depth = 8, seed = 12345}
const MEDIUM := {width = 100, height = 100, depth = 10, seed = 12345}
const LARGE := {width = 140, height = 140, depth = 12, seed = 12345}
const ODD := {width = 73, height = 41, depth = 9, seed = 2147483000}

const LAYERS: Array[String] = ["material", "flags", "feature", "water", "magma", "building", "crop", "biome"]


static func load_fixture(name: String) -> Variant:
	return JSON.parse_string(FileAccess.get_file_as_string("res://tests/fixtures/%s.json" % name))


static func sha256(data: PackedByteArray) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(data)
	return ctx.finish().hex_encode()


static func layer_hashes(w: World) -> Dictionary:
	var out := {}
	for name in LAYERS:
		out[name] = sha256(w.get(name))
	return out


## Exact bits of a double, big-endian hex (as f64hex in the TS).
static func f64hex(x: float) -> String:
	var b := PackedByteArray()
	b.resize(8)
	b.encode_double(0, x)  # little-endian
	b.reverse()
	return b.hex_encode()


## The world as GameEngine.create leaves it, minus creatures: generated, embark meadow cleared.
static func embark_world(p: Dictionary) -> Dictionary:
	var world := WorldGen.generate(p)
	var site := WorldGen.find_embark_site(world)
	WorldGen.clear_embark(world, site.x, site.y)
	return {world = world, site = site}


## SMALL embark world plus a stairwell east of the site and a corridor at z=1 with a door.
static func path_world() -> Dictionary:
	var e := embark_world(SMALL)
	var world: World = e.world
	var site: Vector2i = e.site
	var sx := site.x + 2
	world.set_stairs_down(sx, site.y, 0)
	for x in range(sx + 1, sx + 7):
		world.excavate(x, site.y, 1)
	world.set_building(sx + 3, site.y, 1, Content.Building.DOOR)
	return e


static func random_walkable(w: World, rng: Rng, z: int) -> Vector3i:
	for tries in 200:
		var x := rng.below(w.width)
		var y := rng.below(w.height)
		if w.walkable(x, y, z):
			return Vector3i(x, y, z)
	push_error("no walkable tile found")
	return Vector3i.ZERO


## First full-strength pocket of `fluid` with solid rock to its east: dig 12 tiles into it,
## stairs down at the end. Returns where, or null.
static func breach(w: World, fluid: String) -> Variant:
	var level: PackedByteArray = w.get(fluid)
	for z in range(1, w.depth):
		for y in w.height:
			for x in range(0, w.width - 12):
				var i := w.idx(x, y, z)
				if level[i] != Tile.MAX_FLUID or w.flags[i] & Tile.SOURCE or w.flags[i + 1] & Tile.OPEN:
					continue
				for dx in range(1, 13):
					w.excavate(x + dx, y, z)
				w.set_stairs_down(x + 12, y, z)
				return Vector3i(x, y, z)
	return null


## MEDIUM embark world with fluids attached and a breached pocket.
static func breach_world(fluid: String) -> Dictionary:
	var world: World = embark_world(MEDIUM).world
	var fluids := FluidSystem.new(world)
	fluids.rebuild()
	var at: Variant = breach(world, fluid)
	assert(at != null, "no %s pocket to breach" % fluid)
	return {world = world, fluids = fluids, at = at}


## The shaft from tests/sim.test.ts: a blob of water above a 3-deep stairwell.
static func shaft_world() -> Dictionary:
	var world: World = embark_world(SMALL).world
	var fluids := FluidSystem.new(world)
	var x := 5
	var y := 5
	for z in range(1, 4):
		world.flags[world.idx(x, y, z)] |= Tile.OPEN | (Tile.STAIRS_DOWN if z < 3 else 0)
		world.flags[world.idx(x + 1, y, z)] |= Tile.OPEN
	world.water[world.idx(x, y, 1)] = 7
	fluids.rebuild()
	return {world = world, fluids = fluids}
