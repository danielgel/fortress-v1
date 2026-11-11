extends SceneTree
## Headless benchmarks: the same work as tests/bench.test.ts in the TS project, timed the
## same way (one warm-up call, then mean and min over N calls), plus the level repaint a
## z switch costs (CPU side; the GPU draw isn't measured headless).
## Run: godot --headless --path godot -s tests/bench.gd


func _initialize() -> void:
	print(Bench.table(Bench.run()))
	var renderer := LevelRenderer.new()
	root.add_child(renderer)
	var world: World = Scenarios.embark_world(Scenarios.LARGE).world
	renderer.set_world(world)
	var level := [0]
	var row := Bench.time(10, func() -> void:
		level[0] = (level[0] + 1) % 4
		renderer.set_level(level[0]))
	print(Bench.table([["z switch: repaint a 140x140 level", row]]))
	quit()
