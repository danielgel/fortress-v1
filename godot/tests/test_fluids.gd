extends GutTest
## Fluids: ported tests from tests/sim.test.ts plus step-by-step parity with TS.


func test_flows_water_downward_and_conserves_volume_without_sources() -> void:
	var s := Scenarios.shaft_world()
	var w: World = s.world
	var fluids: FluidSystem = s.fluids
	for i in 100:
		fluids.update()
	var total := 0
	for z in range(1, 4):
		total += w.water[w.idx(5, 5, z)] + w.water[w.idx(6, 5, z)]
	assert_eq(total, 7)
	assert_eq(w.water[w.idx(5, 5, 3)] + w.water[w.idx(6, 5, 3)], 7)


func test_does_not_let_water_fall_through_a_solid_floor() -> void:
	var w: World = Scenarios.embark_world(Scenarios.SMALL).world
	var fluids := FluidSystem.new(w)
	w.flags[w.idx(5, 5, 1)] |= Tile.OPEN
	w.flags[w.idx(5, 5, 2)] |= Tile.OPEN
	w.water[w.idx(5, 5, 1)] = 7
	fluids.rebuild()
	for i in 50:
		fluids.update()
	assert_eq(w.water[w.idx(5, 5, 1)], 7)
	assert_eq(w.water[w.idx(5, 5, 2)], 0)


func test_surface_lakes_never_flood_the_surface_or_the_level_below() -> void:
	var w: World = Scenarios.embark_world(Scenarios.SMALL).world
	var fluids := FluidSystem.new(w)
	fluids.rebuild()
	var before := _wet_surface_tiles(w)
	for i in 40:
		fluids.update()
	assert_eq(_wet_surface_tiles(w), before)


func test_fluid_traces_match_typescript() -> void:
	for row: Dictionary in Scenarios.load_fixture("fluids"):
		var world: World
		var fluids: FluidSystem
		match row.name:
			"shaft":
				var s := Scenarios.shaft_world()
				world = s.world
				fluids = s.fluids
			"lakes":
				world = Scenarios.embark_world(Scenarios.SMALL).world
				fluids = FluidSystem.new(world)
				fluids.rebuild()
			"breach-water", "breach-magma":
				var b := Scenarios.breach_world("water" if row.name == "breach-water" else "magma")
				world = b.world
				fluids = b.fluids
				var at: Vector3i = b.at
				assert_eq([at.x, at.y, at.z], [int(row.at[0]), int(row.at[1]), int(row.at[2])], "%s breach site" % row.name)
				assert_eq(Scenarios.sha256(world.flags), row.flags, "%s flags after digging" % row.name)
		var step := 0
		for snap: Dictionary in row.trace:
			while step < int(snap.step):
				fluids.update()
				step += 1
			var label := "%s step %d" % [row.name, step]
			assert_eq(fluids.active_count(), int(snap.active), label + " active cells")
			assert_eq(Scenarios.sha256(world.water), snap.water, label + " water")
			assert_eq(Scenarios.sha256(world.magma), snap.magma, label + " magma")


static func _wet_surface_tiles(w: World) -> int:
	var n := 0
	for i in w.width * w.height:
		if w.water[i] > 0:
			n += 1
	return n
