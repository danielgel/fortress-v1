class_name Bench
## Benchmarks shared by the headless runner (tests/bench.gd) and the in-game "Run bench" button.


## One warm-up call, then `runs` timed calls. Returns [mean ms, min ms].
static func time(runs: int, fn: Callable) -> Array[float]:
	fn.call()
	var total := 0.0
	var best := INF
	for i in runs:
		var t := Time.get_ticks_usec()
		fn.call()
		var dt := (Time.get_ticks_usec() - t) / 1000.0
		total += dt
		best = minf(best, dt)
	return [total / runs, best]


static func run() -> Array:
	var medium := Scenarios.embark_world(Scenarios.MEDIUM)
	var rng := Rng.new(7)
	var pairs: Array[Array] = []
	for n in 50:
		pairs.append([Scenarios.random_walkable(medium.world, rng, 0), Scenarios.random_walkable(medium.world, rng, 0)])
	var medium_regions := Regions.new(medium.world)
	var unreachable := 0
	for p in pairs:
		if not medium_regions.connected(p[0], p[1]):
			unreachable += 1
	var reachable: Array[Array] = pairs.filter(func(p: Array) -> bool: return medium_regions.connected(p[0], p[1]))
	var large := Scenarios.embark_world(Scenarios.LARGE)
	var start := Vector3i(large.site.x, large.site.y, 0)
	var solid := Vector3i(large.site.x, large.site.y, 2)
	var large_regions := Regions.new(large.world)
	var water := Scenarios.breach_world("water")
	var magma := Scenarios.breach_world("magma")
	var fluid_run := func(src: Dictionary, steps: int) -> void:
		var f := FluidSystem.new((src.world as World).duplicate_world())
		f.rebuild()
		for i in steps:
			f.update()

	var rows: Array = [
		["generate medium 100x100x10", time(3, func() -> void: WorldGen.generate(Scenarios.MEDIUM))],
		["generate large 140x140x12", time(3, func() -> void: WorldGen.generate(Scenarios.LARGE))],
		["50 random surface paths, medium, 12k cap (per path)", time(3, func() -> void:
			for p in pairs:
				PathFinder.find_path_to(medium.world, p[0], p[1], 12000))],
		["same 50 paths with region check (per path)", time(3, func() -> void:
			for p in pairs:
				PathFinder.find_path_to(medium.world, p[0], p[1], 12000, PathFinder.DEFAULT, medium_regions))],
		["reachable pairs only, no region check (per path)", time(3, func() -> void:
			for p in reachable:
				PathFinder.find_path_to(medium.world, p[0], p[1], 12000))],
		["unreachable target, large, 12k cap", time(5, func() -> void: PathFinder.find_path_to(large.world, start, solid, 12000))],
		["unreachable target, large, 25k cap", time(5, func() -> void: PathFinder.find_path_to(large.world, start, solid))],
		["regions: label every tile, large", time(3, func() -> void: Regions.new(large.world))],
		["unreachable target, large, region check", time(5, func() -> void: PathFinder.find_path_to(large.world, start, solid, 12000, PathFinder.DEFAULT, large_regions))],
		["fluids: clone + rebuild (baseline)", time(5, fluid_run.bind(water, 0))],
		["fluids: water breach, 100 steps", time(3, fluid_run.bind(water, 100))],
		["fluids: magma breach, 100 steps", time(3, fluid_run.bind(magma, 100))],
	]
	for r in [2, 3]:
		rows[r][1] = [rows[r][1][0] / pairs.size(), rows[r][1][1] / pairs.size()]
	rows[4][1] = [rows[4][1][0] / reachable.size(), rows[4][1][1] / reachable.size()]
	rows.append(["(unreachable pairs among the 50: %d)" % unreachable, [0.0, 0.0]])
	return rows


static func table(rows: Array) -> String:
	var lines: PackedStringArray = []
	for r in rows:
		lines.append("%-52s mean %9.2f ms   min %9.2f ms" % [r[0], r[1][0], r[1][1]])
	return "\n".join(lines)
