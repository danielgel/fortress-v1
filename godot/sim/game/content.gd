class_name Content
## Buildings placed on floor tiles. Subset of src/game/content.ts needed by the world and
## renderer (costs, recipes and stock arrive with the full simulation port).

## Stored per tile in World.building; saved as numbers, so only ever append.
enum Building { NONE, BED, TABLE, CHAIR, DOOR, STATUE, CARPENTER, MASON, SMELTER, FORGE, KITCHEN, BREWERY, FARM, JEWELER, ORNAMENT }

## Indexed by Building. NONE describes a built wall.
const BUILDINGS: Array[Dictionary] = [
	{name = "Wall", glyph = "#", fg = "#9a9aa6", bg = "", walkable = false},
	{name = "Bed", glyph = "Θ", fg = "#d79a5a", bg = "", walkable = true},
	{name = "Table", glyph = "╤", fg = "#d7b07a", bg = "", walkable = true},
	{name = "Chair", glyph = "╥", fg = "#c09060", bg = "", walkable = true},
	{name = "Door", glyph = "+", fg = "#e0b050", bg = "", walkable = true},
	{name = "Statue", glyph = "Ω", fg = "#d8d8f0", bg = "", walkable = false},
	{name = "Carpenter", glyph = "C", fg = "#ffcf8a", bg = "#4a3418", walkable = true},
	{name = "Mason", glyph = "M", fg = "#e6e6f0", bg = "#3a3a48", walkable = true},
	{name = "Smelter", glyph = "S", fg = "#ffb070", bg = "#4a2414", walkable = true},
	{name = "Forge", glyph = "F", fg = "#ff9a5a", bg = "#40201a", walkable = true},
	{name = "Kitchen", glyph = "K", fg = "#ffe08a", bg = "#3c3418", walkable = true},
	{name = "Brewery", glyph = "B", fg = "#c8f08a", bg = "#2a3a18", walkable = true},
	{name = "Farm plot", glyph = "≡", fg = "#b8d070", bg = "#3a2a16", walkable = true},
	{name = "Jeweler", glyph = "J", fg = "#f0b0ff", bg = "#3a1a44", walkable = true},
	{name = "Ornament", glyph = "☼", fg = "#e070ff", bg = "", walkable = false},
]

## BUILDINGS[b].walkable as a flat lookup for the pathfinder's inner loop.
const WALKABLE: Array[bool] = [false, true, true, true, true, false, true, true, true, true, true, true, true, true, false]
