class_name Biome
## Surface biomes. Port of src/world/biome.ts.

enum Type { PLAINS, FOREST, TAIGA, TUNDRA, DESERT, SAVANNA, JUNGLE, SWAMP, MOUNTAIN, GLACIER }

## Indexed by Type. temperature: mean °C, rainfall: 0..1, color: ground tint for the renderer.
const INFO: Array[Dictionary] = [
	{name = "Plains", temperature = 14, rainfall = 0.4, ground = Tile.Mat.GRASS, tree_density = 0.01, shrub_density = 0.04, color = "#2f5d2a"},
	{name = "Forest", temperature = 11, rainfall = 0.6, ground = Tile.Mat.GRASS, tree_density = 0.22, shrub_density = 0.05, color = "#1f4a24"},
	{name = "Taiga", temperature = 1, rainfall = 0.5, ground = Tile.Mat.SOIL, tree_density = 0.14, shrub_density = 0.03, color = "#2a4a3a"},
	{name = "Tundra", temperature = -7, rainfall = 0.25, ground = Tile.Mat.SNOW, tree_density = 0.01, shrub_density = 0.02, color = "#aab4bd"},
	{name = "Desert", temperature = 30, rainfall = 0.05, ground = Tile.Mat.SAND, tree_density = 0.0, shrub_density = 0.01, color = "#b5994f"},
	{name = "Savanna", temperature = 26, rainfall = 0.3, ground = Tile.Mat.GRASS, tree_density = 0.03, shrub_density = 0.05, color = "#7a7a33"},
	{name = "Jungle", temperature = 27, rainfall = 0.9, ground = Tile.Mat.GRASS, tree_density = 0.3, shrub_density = 0.08, color = "#16511f"},
	{name = "Swamp", temperature = 18, rainfall = 0.85, ground = Tile.Mat.MUD, tree_density = 0.08, shrub_density = 0.06, color = "#3b4a2c"},
	{name = "Mountain", temperature = 3, rainfall = 0.35, ground = Tile.Mat.STONE, tree_density = 0.02, shrub_density = 0.01, color = "#6d6d72"},
	{name = "Glacier", temperature = -18, rainfall = 0.2, ground = Tile.Mat.SNOW, tree_density = 0.0, shrub_density = 0.0, color = "#d8e6f0"},
]


## Whittaker-style classification from noise-derived climate values.
static func classify(elevation: float, temperature: float, moisture: float) -> Type:
	if elevation > 0.72:
		return Type.GLACIER if temperature < 0.3 else Type.MOUNTAIN
	if temperature < 0.22:
		return Type.TUNDRA
	if temperature < 0.38:
		return Type.TAIGA if moisture > 0.4 else Type.TUNDRA
	if temperature > 0.7:
		if moisture < 0.3:
			return Type.DESERT
		return Type.JUNGLE if moisture > 0.62 else Type.SAVANNA
	if moisture > 0.68 and elevation < 0.42:
		return Type.SWAMP
	return Type.FOREST if moisture > 0.5 else Type.PLAINS
