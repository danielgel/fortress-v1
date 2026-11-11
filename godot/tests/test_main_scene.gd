extends GutTest
## Smoke test: the spike scene builds a world, paints it, runs ticks and survives the
## interactive actions without script errors (GUT fails the test on any engine error).


func test_scene_runs_and_survives_the_debug_actions() -> void:
	var main: Node = add_child_autofree(load("res://scenes/main.tscn").instantiate())
	await wait_physics_frames(5)
	var renderer: LevelRenderer = main.renderer
	assert_not_null(main.world)
	assert_eq(renderer.z, 0)
	main.clock.set_speed(4)
	await wait_physics_frames(60)
	assert_gt(main.tick, 8 * WorldCalendar.TICKS_PER_HOUR, "ticks advanced")
	assert_gt(main.walkers.paths_planned, 0, "walkers planned paths")

	main.breach("water")
	assert_gt(renderer.z, 0, "view follows the breach underground")
	await wait_physics_frames(30)
	main._toggle_mode()
	assert_eq(renderer.mode, "ascii")
	main._toggle_winter()
	main.set_level(renderer.z + 1)
	main.breach("magma")
	await wait_physics_frames(30)
	main._toggle_mode()
	assert_eq(renderer.mode, "sprites")


func test_tile_visuals_match_the_ts_renderer() -> void:
	var e := Scenarios.embark_world(Scenarios.SMALL)
	var w: World = e.world
	var site: Vector2i = e.site
	# solid, undiscovered rock is blank; a lake is deep water; the site has grass or a shrub
	assert_eq(TileVisuals.cell(w, site.x, site.y, 3, false)[0], " ")
	w.set_stairs_down(site.x, site.y, 0)
	assert_eq(TileVisuals.cell(w, site.x, site.y, 0, false)[0], ">")
	assert_eq(TileVisuals.cell(w, site.x, site.y, 1, false)[0], "<")
	var lake := -1
	for i in w.width * w.height:
		if w.flags[i] & Tile.SOURCE:
			lake = i
			break
	var p := w.pos(lake)
	assert_eq(TileVisuals.cell(w, p.x, p.y, 0, false)[0], "≈")
	assert_eq(TileVisuals.cell(w, p.x, p.y, 0, true)[0], "=", "frozen in winter")
	assert_eq(TileVisuals.shade("#10305f", 49), Color8(0x10 + 49, 0x30 + 49, 0x5f + 49))
