class_name TileVisuals
## What each tile looks like: a glyph plus foreground and background colours.
## Port of tileCell / farmCell in src/ui/renderer.ts, so a level looks the same as in the TS
## game. The glyph picks the atlas tile, so the sprite atlas swaps in without changes here.

## A cell is [glyph: String, fg: Color, bg: Color].
const UNSEEN: Array = [" ", Color(0, 0, 0), Color("#08080b")]

## Days to ripen (SURFACE_CROP / CAVE_CROP in src/game/farming.ts).
const SURFACE_GROW_DAYS := 6
const CAVE_GROW_DAYS := 8

static var _colors := {}


static func color(hex: String) -> Color:
	var c: Variant = _colors.get(hex)
	if c == null:
		c = Color(hex)
		_colors[hex] = c
	return c


## The renderer's per-tile hash (not the noise hash): stable variation in [0, 1).
static func hash01(x: int, y: int, n := 0) -> float:
	var h := I32.imul(x + 1, 374761393) ^ I32.imul(y + 1, 668265263) ^ I32.imul(n + 1, 1013904223)
	h = I32.imul(h ^ (h >> 13), 1274126177)
	return float(h ^ (h >> 16)) / 4294967296.0


## Lighten (or darken, if negative) each channel by `amount` out of 255.
static func shade(hex: String, amount: int) -> Color:
	var c := color(hex)
	return Color8(clampi(c.r8 + amount, 0, 255), clampi(c.g8 + amount, 0, 255), clampi(c.b8 + amount, 0, 255))


static func _jitter(x: int, y: int, n: int, spread: float) -> int:
	return I32.js_round((hash01(x, y, n) - 0.5) * spread)


## Surface water that freezes over in winter (GameEngine.isIce in the TS).
static func is_ice(w: World, x: int, y: int, freezing: bool) -> bool:
	var i := w.idx(x, y, 0)
	return freezing and w.water[i] > 0 and (w.flags[i] & Tile.SOURCE) != 0


## A farm plot by how far its crop has grown (0..1).
static func farm_cell(growth: float, z: int) -> Array:
	var bg := color(Content.BUILDINGS[Content.Building.FARM].bg)
	if growth >= 1:
		return ["¥", color("#f0d050"), bg] if z == 0 else ["♠", color("#c89cff"), bg]
	if growth >= 0.5:
		return ["\"", color("#7ac850" if z == 0 else "#9a80d0"), bg]
	if growth > 0:
		return [",", color("#5a9a40" if z == 0 else "#7a68a8"), bg]
	return ["≡", color("#6a5232"), bg]


static func cell(w: World, x: int, y: int, z: int, freezing: bool) -> Array:
	var i := w.idx(x, y, z)
	var f := w.flags[i]

	if not (f & Tile.OPEN):
		if not (f & Tile.DISCOVERED):
			return UNSEEN
		var soil := w.material[i] == Tile.Mat.SOIL
		var wall_bg := color("#33281e" if soil else "#26262c")
		var feat := w.feature[i]
		if feat == Tile.Feat.ORE:
			return ["◊", color("#4fd8e8"), wall_bg]
		if feat == Tile.Feat.GEM:
			return ["♦", color("#d070ff"), wall_bg]
		return ["#", color("#6f5a42" if soil else "#6c6c76"), wall_bg]

	if w.magma[i] > 0:
		return ["≈", color("#ff8a2a"), shade("#5a1a08", w.magma[i] * 6)]
	if w.water[i] > 0:
		if z == 0 and is_ice(w, x, y, freezing):
			return ["=", color("#e6f6ff"), color("#7fa6bb")]
		return ["≈" if w.water[i] > 3 else "~", color("#7fb4ff"), shade("#10305f", w.water[i] * 7)]

	if f & Tile.STAIRS_DOWN and f & Tile.STAIRS_UP:
		return ["X", color("#ffd070"), color("#222228")]
	if f & Tile.STAIRS_DOWN:
		return [">", color("#ffd070"), color("#2a3a26" if z == 0 else "#222228")]
	if f & Tile.STAIRS_UP:
		return ["<", color("#ffd070"), color("#222228")]
	var b := w.building[i]
	if b == Content.Building.FARM:
		return farm_cell(float(w.crop[i]) / (SURFACE_GROW_DAYS if z == 0 else CAVE_GROW_DAYS), z)
	if b:
		var info: Dictionary = Content.BUILDINGS[b]
		var bbg: String = info.bg if info.bg else ("#2e2a22" if z == 0 else "#24242a")
		return [info.glyph, color(info.fg), color(bbg)]

	var bg: Color
	var fg: Color
	if z == 0:
		var biome: Dictionary = Biome.INFO[w.biome[y * w.width + x]]
		var snowy: bool = freezing and biome.ground != Tile.Mat.SAND
		bg = shade("#b9c4cc", _jitter(x, y, 0, 14)) if snowy else shade(biome.color, _jitter(x, y, 0, 16))
		fg = color("#8a97a1") if snowy else shade(biome.color, 40)
	else:
		# soil floors (farmable) look earthy
		var soil := w.material[i] == Tile.Mat.SOIL
		bg = shade("#2a2018" if soil else "#1c1c22", _jitter(x, y, z, 8))
		fg = color("#5e4a36" if soil else "#4a4a54")
	match w.feature[i]:
		Tile.Feat.TREE:
			return ["♣", color("#9fc2a8" if freezing else "#37b04a"), bg]
		Tile.Feat.SHRUB:
			return ["\"", color("#e0587a"), bg]
		Tile.Feat.MUSHROOM:
			return ["♠", color("#b48cff"), bg]
	return ["." if hash01(x, y, 7) < 0.5 else ",", fg, bg]
