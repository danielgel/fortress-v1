extends GutTest
## World generation: ported tests from tests/sim.test.ts plus byte-for-byte parity with TS.


func test_is_deterministic_for_a_seed() -> void:
	var a := WorldGen.generate(Scenarios.SMALL)
	var b := WorldGen.generate(Scenarios.SMALL)
	assert_eq(a.material, b.material)
	assert_eq(a.feature, b.feature)


func test_embark_site_is_open_ground() -> void:
	var e := Scenarios.embark_world(Scenarios.SMALL)
	var world: World = e.world
	var site: Vector2i = e.site
	for dy in range(-2, 3):
		for dx in range(-2, 3):
			assert_true(world.walkable(site.x + dx, site.y + dy, 0))


func test_worlds_match_typescript_byte_for_byte() -> void:
	for row: Dictionary in Scenarios.load_fixture("worlds"):
		var p := {width = int(row.params.width), height = int(row.params.height), depth = int(row.params.depth), seed = int(row.params.seed)}
		var hashes := Scenarios.layer_hashes(WorldGen.generate(p))
		for layer in Scenarios.LAYERS:
			assert_eq(hashes[layer], row.generated[layer], "%s %s layer" % [row.name, layer])
		var e := Scenarios.embark_world(p)
		assert_eq(e.site, Vector2i(int(row.site.x), int(row.site.y)), "%s embark site" % row.name)
		assert_eq(Scenarios.sha256(e.world.feature), row.embarkFeature, "%s features after clearing the embark meadow" % row.name)
