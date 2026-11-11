extends SceneTree
## Renders still previews of a level to PNG without a GPU, by composing the atlas tiles on the
## CPU with the same TileVisuals the game uses (so tile content and colours are exact; the
## game draws them with a TileMapLayer instead).
##
##   godot --headless --path godot -s tools/preview.gd
##
## Writes docs/preview-<mode>-<level>.png for the README.

const OUT := "res://docs"
const COLS := 64
const ROWS := 36


func _init() -> void:
	var info: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/tiles/atlas.json"))
	var cell := int(info.cell)
	var columns := int(info.columns)
	var glyphs: String = info.glyphs

	var e := Scenarios.embark_world(Scenarios.MEDIUM)
	var world: World = e.world
	var site: Vector2i = e.site
	world.set_stairs_down(site.x + 2, site.y, 0)
	var fluids := FluidSystem.new(world)
	fluids.rebuild()
	var at: Vector3i = Scenarios.breach(world, "water")
	for i in 60:
		fluids.update()
	var rng := Rng.new(5)
	var dwarves: Array[Vector3i] = []
	while dwarves.size() < 7:
		var p := Vector3i(site.x + rng.below(9) - 4, site.y + rng.below(9) - 4, 0)
		if world.walkable(p.x, p.y, 0):
			dwarves.append(p)

	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	for mode in ["ascii", "sprites"]:
		var atlas := Image.load_from_file(ProjectSettings.globalize_path("res://assets/tiles/%s.png" % mode))
		atlas.convert(Image.FORMAT_RGBA8)
		var tinted := {}
		var tile := func(glyph: String, fg: Color) -> Image:
			var key := "%s|%s" % [glyph, fg.to_html()]
			if not tinted.has(key):
				var n := maxi(0, glyphs.find(glyph))
				var img := atlas.get_region(Rect2i((n % columns) * cell, (n / columns) * cell, cell, cell))
				for y in cell:
					for x in cell:
						img.set_pixel(x, y, img.get_pixel(x, y) * fg)
				tinted[key] = img
			return tinted[key]

		for level in [["surface", 0, site], ["breach", at.z, Vector2i(at.x + 8, at.y)]]:
			var z: int = level[1]
			var center: Vector2i = level[2]
			var x0 := clampi(center.x - COLS / 2, 0, world.width - COLS)
			var y0 := clampi(center.y - ROWS / 2, 0, world.height - ROWS)
			var out := Image.create(COLS * cell, ROWS * cell, false, Image.FORMAT_RGBA8)
			for r in ROWS:
				for c in COLS:
					var x := x0 + c
					var y := y0 + r
					var tc := TileVisuals.cell(world, x, y, z, false)
					var rect := Rect2i(c * cell, r * cell, cell, cell)
					out.fill_rect(rect, tc[2])
					var glyph: String = tc[0]
					if Vector3i(x, y, z) in dwarves:
						glyph = "@"
						tc[1] = Color.WHITE
					if glyph != " ":
						out.blend_rect(tile.call(glyph, tc[1]), Rect2i(0, 0, cell, cell), rect.position)
			var path := "%s/preview-%s-%s.png" % [OUT, mode, level[0]]
			out.save_png(ProjectSettings.globalize_path(path))
			print("wrote ", path)
	quit()
