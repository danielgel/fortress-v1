class_name WorldGen
## World generation. Port of src/world/generator.ts; the same seed gives the same world
## as the TS version, byte for byte.


static func default_parameters() -> Dictionary:
	return {width = 100, height = 100, depth = 10, seed = int(Time.get_unix_time_from_system() * 1000) % 2147483647}


static func generate(p: Dictionary) -> World:
	var world := World.new(p.width, p.height, p.depth)
	var rng := Rng.new(p.seed)
	_generate_surface(world, p.seed, rng)
	_generate_underground(world, p.seed, rng)
	return world


static func _generate_surface(world: World, seed: int, rng: Rng) -> void:
	var w := world.width
	var h := world.height
	var flags := world.flags
	var material := world.material
	var feature := world.feature
	var water := world.water
	for y in h:
		for x in w:
			# float division on purpose: the TS divides numbers, not ints
			var elevation := ValueNoise.fbm(x / 28.0, y / 28.0, seed + 1)
			var temperature := ValueNoise.fbm(x / 60.0, y / 60.0, seed + 2, 3)
			var moisture := ValueNoise.fbm(x / 35.0, y / 35.0, seed + 3)
			var biome := Biome.classify(elevation, temperature, moisture)
			var info: Dictionary = Biome.INFO[biome]
			var i := y * w + x  # world.idx(x, y, 0)
			world.biome[y * w + x] = biome
			flags[i] = Tile.OPEN | Tile.DISCOVERED
			material[i] = info.ground

			var lowland := elevation < 0.3 and biome != Biome.Type.DESERT and biome != Biome.Type.GLACIER
			if lowland:
				water[i] = Tile.MAX_FLUID
				flags[i] |= Tile.SOURCE
			elif rng.chance(info.tree_density):
				feature[i] = Tile.Feat.TREE
			elif rng.chance(info.shrub_density):
				feature[i] = Tile.Feat.SHRUB


static func _generate_underground(world: World, seed: int, rng: Rng) -> void:
	var w := world.width
	var h := world.height
	var d := world.depth
	var flags := world.flags
	var material := world.material
	var feature := world.feature
	var water := world.water
	var magma := world.magma
	var magma_start := floori(d * 0.7)
	for z in range(1, d):
		for y in h:
			for x in w:
				var i := (z * h + y) * w + x
				material[i] = Tile.Mat.SOIL if z == 1 and rng.chance(0.6) else Tile.Mat.STONE

				# natural caverns
				var cave := ValueNoise.layer(x / 9.0, y / 9.0, z, seed + 7)
				if z >= 3 and cave > 0.7:
					flags[i] = Tile.OPEN
					if z >= magma_start:
						if cave > 0.76:
							magma[i] = Tile.MAX_FLUID
					elif cave > 0.77:
						water[i] = Tile.MAX_FLUID  # flooded cavern pocket
					elif rng.chance(0.08):
						feature[i] = Tile.Feat.MUSHROOM
					continue
				# mineral veins
				var r := rng.next()
				if r < 0.025:
					feature[i] = Tile.Feat.ORE
				elif r < 0.03 and z >= 3:
					feature[i] = Tile.Feat.GEM


## Find a good walkable surface tile near the middle for the starting party.
static func find_embark_site(world: World) -> Vector2i:
	var cx := world.width / 2
	var cy := world.height / 2
	for r in maxi(world.width, world.height):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dy)) != r:
					continue
				if _open_5x5(world, cx + dx, cy + dy):
					return Vector2i(cx + dx, cy + dy)
	return Vector2i(cx, cy)


static func _open_5x5(world: World, x: int, y: int) -> bool:
	for dy in range(-2, 3):
		for dx in range(-2, 3):
			if not world.walkable(x + dx, y + dy, 0):
				return false
	return true


## Clear a small meadow around the embark site so the start is never boxed in.
static func clear_embark(world: World, x: int, y: int) -> void:
	for dy in range(-4, 5):
		for dx in range(-4, 5):
			if not world.in_bounds(x + dx, y + dy, 0):
				continue
			var i := world.idx(x + dx, y + dy, 0)
			if world.feature[i] == Tile.Feat.TREE:
				world.feature[i] = Tile.Feat.NONE
