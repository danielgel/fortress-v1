extends GutTest
## Pathfinding: ported tests from tests/sim.test.ts plus tile-for-tile parity with TS.


func test_finds_a_path_across_the_surface_and_rejects_solid_rock() -> void:
	var e := Scenarios.embark_world(Scenarios.SMALL)
	var world: World = e.world
	var site: Vector2i = e.site
	var start := Vector3i(site.x, site.y, 0)
	assert_not_null(PathFinder.find_path_to(world, start, Vector3i(site.x + 3, site.y, 0)))
	assert_null(PathFinder.find_path_to(world, start, Vector3i(site.x, site.y, 2)))


func test_doors_keep_goblins_out_but_let_dwarves_through() -> void:
	var world: World = Scenarios.embark_world(Scenarios.SMALL).world
	# a 1-wide corridor at depth 1 with a door in the middle
	for x in range(5, 10):
		world.flags[world.idx(x, 5, 1)] |= Tile.OPEN
	world.set_building(7, 5, 1, Content.Building.DOOR)
	var a := Vector3i(5, 5, 1)
	var b := Vector3i(9, 5, 1)
	assert_not_null(PathFinder.find_path_to(world, a, b))
	assert_null(PathFinder.find_path_to(world, a, b, PathFinder.DEFAULT_MAX_NODES, PathFinder.NO_DOORS))


func test_paths_match_typescript_tile_for_tile() -> void:
	var e := Scenarios.path_world()
	var world: World = e.world
	var rows: Array = Scenarios.load_fixture("paths")
	assert_eq(rows.size(), 50)
	for row: Dictionary in rows:
		var start := Vector3i(int(row.start[0]), int(row.start[1]), int(row.start[2]))
		var target := Vector3i(int(row.target[0]), int(row.target[1]), int(row.target[2]))
		var max_nodes := int(row.maxNodes) if row.has("maxNodes") else PathFinder.DEFAULT_MAX_NODES
		var c := PathFinder.DEFAULT
		if row.has("constraints"):
			c = PathFinder.Constraints.new(row.constraints[0], row.constraints[1], row.constraints[2])
		var path: Variant
		match row.kind:
			"to":
				path = PathFinder.find_path_to(world, start, target, max_nodes, c)
			"adj":
				path = PathFinder.find_path_adjacent(world, start, target, max_nodes, c, row.allowOnTarget)
			"below":
				var goal := func(x: int, y: int, z: int) -> bool: return z > 0 and world.walkable(x, y, z)
				path = PathFinder.find_path(world, start, goal, target, max_nodes, c)
		var label := "%s %s -> %s %s" % [row.kind, start, target, row.get("constraints", "")]
		if row.path == null:
			assert_null(path, label)
		else:
			assert_not_null(path, label)
			if path != null:
				var flat: Array[int] = []
				for p: Vector3i in path:
					flat.append_array([p.x, p.y, p.z])
				var want: Array[int] = []
				for v in row.path:
					want.append(int(v))
				assert_eq(flat, want, label)


func test_regions_never_refuse_a_reachable_target() -> void:
	var e := Scenarios.path_world()
	var world: World = e.world
	var regions := Regions.new(world)
	for row: Dictionary in Scenarios.load_fixture("paths"):
		if row.kind == "below" or row.has("constraints") or row.has("maxNodes"):
			continue
		var start := Vector3i(int(row.start[0]), int(row.start[1]), int(row.start[2]))
		var target := Vector3i(int(row.target[0]), int(row.target[1]), int(row.target[2]))
		var with_regions: Variant
		var without: Variant
		if row.kind == "to":
			with_regions = PathFinder.find_path_to(world, start, target, PathFinder.DEFAULT_MAX_NODES, PathFinder.DEFAULT, regions)
			without = PathFinder.find_path_to(world, start, target)
		else:
			with_regions = PathFinder.find_path_adjacent(world, start, target, PathFinder.DEFAULT_MAX_NODES, PathFinder.DEFAULT, row.allowOnTarget, regions)
			without = PathFinder.find_path_adjacent(world, start, target, PathFinder.DEFAULT_MAX_NODES, PathFinder.DEFAULT, row.allowOnTarget)
		assert_eq(with_regions, without, "%s %s -> %s" % [row.kind, start, target])


func test_regions_follow_stairs_and_split_at_rock() -> void:
	var e := Scenarios.path_world()
	var world: World = e.world
	var site: Vector2i = e.site
	var regions := Regions.new(world)
	var surface := Vector3i(site.x, site.y, 0)
	assert_true(regions.connected(surface, Vector3i(site.x + 8, site.y, 1)), "corridor below is reached by the stairs")
	assert_false(regions.connected(surface, Vector3i(site.x, site.y, 2)), "solid rock")
	world.fill(site.x + 2, site.y, 1)  # wall off the bottom of the stairwell
	regions.recompute()
	assert_false(regions.connected(surface, Vector3i(site.x + 8, site.y, 1)), "stairs blocked")
