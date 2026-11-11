class_name LevelRenderer
extends Node2D
## Draws one z-level of the world, the way src/ui/renderer.ts does but on the GPU:
## background colours go into a 1-pixel-per-tile image drawn scaled up, and glyphs (or sprites)
## go on a TileMapLayer, tinted per tile through alternative tiles. Only cells whose look has
## changed are sent again, so a frame costs nothing when the level is quiet.

const ATLAS_INFO := "res://assets/tiles/atlas.json"
const TEXTURES := {ascii = "res://assets/tiles/ascii.png", sprites = "res://assets/tiles/sprites.png"}

var world: World
var z := 0
var freezing := false
var mode := "sprites"
var cell := 16
var _columns := 16

var _glyph_coords := {}  ## glyph -> atlas coords
var _textures := {}
var _source: TileSetAtlasSource
var _layer: TileMapLayer
var _bg: Sprite2D
var _bg_image: Image
var _bg_texture: ImageTexture
var _bg_dirty := false
## (rgba << 8 | atlas index) -> alternative tile id carrying that tint
var _alts := {}
## Per tile of the current level: the last key sent to the TileMapLayer (-1 = empty).
var _last := PackedInt64Array()


func _init() -> void:
	var info: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(ATLAS_INFO))
	cell = int(info.cell)
	_columns = int(info.columns)
	var columns := _columns
	var glyphs: String = info.glyphs
	for name: String in TEXTURES:
		_textures[name] = load(TEXTURES[name])

	_source = TileSetAtlasSource.new()
	_source.texture = _textures[mode]
	_source.texture_region_size = Vector2i(cell, cell)
	for n in glyphs.length():
		var coords := Vector2i(n % columns, n / columns)
		_source.create_tile(coords)
		_glyph_coords[glyphs[n]] = coords
	var tile_set := TileSet.new()
	tile_set.tile_size = Vector2i(cell, cell)
	tile_set.add_source(_source, 0)

	_bg = Sprite2D.new()
	_bg.centered = false
	_bg.scale = Vector2(cell, cell)
	_bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_bg)
	_layer = TileMapLayer.new()
	_layer.tile_set = tile_set
	add_child(_layer)


func set_world(w: World) -> void:
	world = w
	_bg_image = Image.create(w.width, w.height, false, Image.FORMAT_RGB8)
	_bg_texture = ImageTexture.create_from_image(_bg_image)
	_bg.texture = _bg_texture
	_last.resize(w.width * w.height)
	_layer.clear()
	_last.fill(-1)
	repaint_all()


func set_level(nz: int) -> void:
	z = clampi(nz, 0, world.depth - 1)
	repaint_all()


func set_mode(m: String) -> void:
	mode = m
	_source.texture = _textures[m]


## Texture region of a glyph in the current atlas (for entity sprites).
func glyph_region(glyph: String) -> Rect2:
	var coords: Vector2i = _glyph_coords.get(glyph, _glyph_coords["?"])
	return Rect2(coords * cell, Vector2(cell, cell))


func current_texture() -> Texture2D:
	return _textures[mode]


func repaint_all() -> void:
	for y in world.height:
		for x in world.width:
			_paint(x, y)


## Repaint tiles given as world indices; ones on other levels are skipped.
func repaint_indices(indices: Array) -> void:
	var plane := world.width * world.height
	var lo := z * plane
	var hi := lo + plane
	for i: int in indices:
		if i >= lo and i < hi:
			var j := i - lo
			_paint(j % world.width, j / world.width)


func _process(_delta: float) -> void:
	if _bg_dirty:
		_bg_texture.update(_bg_image)
		_bg_dirty = false


func _paint(x: int, y: int) -> void:
	var c := TileVisuals.cell(world, x, y, z, freezing)
	var bg: Color = c[2]
	if _bg_image.get_pixel(x, y) != bg:
		_bg_image.set_pixel(x, y, bg)
		_bg_dirty = true
	var glyph: String = c[0]
	var j := y * world.width + x
	if glyph == " ":
		if _last[j] != -1:
			_layer.erase_cell(Vector2i(x, y))
			_last[j] = -1
		return
	var coords: Vector2i = _glyph_coords.get(glyph, _glyph_coords["?"])
	var fg: Color = c[1]
	var key := (fg.to_rgba32() << 8) | (coords.y * _columns + coords.x)
	if _last[j] == key:
		return
	_last[j] = key
	var alt: Variant = _alts.get(key)
	if alt == null:
		alt = _source.create_alternative_tile(coords)
		_source.get_tile_data(coords, alt).modulate = fg
		_alts[key] = alt
	_layer.set_cell(Vector2i(x, y), 0, coords, alt)
