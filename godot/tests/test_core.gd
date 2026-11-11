extends GutTest
## 32-bit helpers, RNG, noise and codec against the TS golden fixtures.


func test_imul_matches_overflow_free_version() -> void:
	var rng := Rng.new(99)
	var edge: Array[int] = [0, 1, -1, 0x7FFFFFFF, 0x80000000, 0xFFFFFFFF, -5, 374761393, 2147483653]
	for a in edge:
		for b in edge:
			assert_eq(I32.imul(a, b), I32.imul_split(a, b), "imul(%d, %d)" % [a, b])
	for n in 2000:
		var a := int(rng.next() * 4294967296.0)
		var b := int(rng.next() * 4294967296.0) - 2147483648
		assert_eq(I32.imul(a, b), I32.imul_split(a, b))
	assert_eq(I32.imul(0xFFFFFFFF, 0xFFFFFFFF), 1)
	assert_eq(I32.imul(-5, 3), (-15) & I32.MASK)


func test_js_round_matches_math_round() -> void:
	assert_eq(I32.js_round(2.5), 3)
	assert_eq(I32.js_round(-2.5), -2)
	assert_eq(I32.js_round(10.5), 11)
	assert_eq(I32.js_round(-0.5), 0)
	assert_eq(I32.js_round(-0.6), -1)


func test_rng_matches_fixture() -> void:
	for row: Dictionary in Scenarios.load_fixture("rng"):
		var rng := Rng.new(int(row.seed))
		var states: Array[int] = []
		for i in 20:
			rng.next()
			states.append(rng.state)
		var ints: Array[int] = []
		for i in 20:
			ints.append(rng.below(1 + i * 37))
		for i in 1000:
			rng.next()
		var label := "seed %d" % int(row.seed)
		assert_eq(states, _ints(row.states), label + " states")
		assert_eq(ints, _ints(row.ints), label + " ints")
		assert_eq(Scenarios.f64hex(rng.next()), row.next, label + " next()")
		assert_eq(rng.state, int(row.final), label + " final state")


func test_noise_matches_fixture() -> void:
	var rows: Array = Scenarios.load_fixture("noise")
	var mismatches := 0
	for row: Dictionary in rows:
		var x: float = row.x
		var y: float = row.y
		var seed := int(row.seed)
		var got := [
			Scenarios.f64hex(ValueNoise.value(x, y, seed)),
			Scenarios.f64hex(ValueNoise.fbm(x, y, seed)),
			Scenarios.f64hex(ValueNoise.fbm(x, y, seed, 3)),
			Scenarios.f64hex(ValueNoise.layer(x, y, 5, seed)),
		]
		if got != [row.value, row.fbm, row.fbm3, row.layer]:
			mismatches += 1
			if mismatches <= 5:
				fail_test("noise at (%s, %s, seed %d): got %s want %s" % [x, y, seed, got, [row.value, row.fbm, row.fbm3, row.layer]])
	assert_eq(mismatches, 0, "%d of %d noise samples differ" % [mismatches, rows.size()])


func test_codec_matches_fixture_and_round_trips() -> void:
	var fx: Dictionary = Scenarios.load_fixture("codec")
	var data := PackedByteArray()
	data.resize(1000)
	for i in 1000:
		data[i] = 0 if i < 400 else i % 7
	assert_eq(Codec.rle_encode(data), fx.sample)
	assert_eq(Codec.rle_decode(Codec.rle_encode(data), data.size()), data)

	var world: World = Scenarios.embark_world(Scenarios.SMALL).world
	assert_eq(Codec.rle_encode(world.flags), fx.smallFlags)
	assert_eq(Codec.rle_encode(world.feature), fx.smallFeature)
	assert_eq(Codec.rle_decode(fx.smallFeature, world.size), world.feature)


static func _ints(values: Array) -> Array[int]:
	var out: Array[int] = []
	for v in values:
		out.append(int(v))
	return out
