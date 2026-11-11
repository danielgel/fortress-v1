class_name TickClock
extends RefCounted
## Turns real frame time into fixed simulation ticks. Port of src/core/clock.ts.

## Ticks per second at each speed setting (index = speed - 1).
const SPEED_TPS: Array[int] = [10, 20, 40, 100]

var speed := 1
var paused := false
var _acc := 0.0


## Runs `tick` the right number of times for `dt_ms` of real time. Returns ticks run.
func advance(dt_ms: float, tick: Callable) -> int:
	if paused:
		return 0
	_acc += minf(dt_ms, 250) / 1000
	var interval := 1.0 / SPEED_TPS[speed - 1]
	var n := 0
	while _acc >= interval and n < 20:
		_acc -= interval
		tick.call()
		n += 1
	if n == 20:
		_acc = 0
	return n


func set_speed(s: int) -> void:
	speed = clampi(s, 1, SPEED_TPS.size())
