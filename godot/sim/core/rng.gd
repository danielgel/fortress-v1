class_name Rng
extends RefCounted
## Small seeded PRNG (mulberry32) whose state can be saved and restored.
## Port of src/core/rng.ts; produces the same sequence for the same seed.

var state: int


func _init(seed: int) -> void:
	state = seed & I32.MASK


func next() -> float:
	state = (state + 0x6d2b79f5) & I32.MASK
	var t := state
	t = I32.imul(t ^ (t >> 15), t | 1)
	t ^= (t + I32.imul(t ^ (t >> 7), t | 61)) & I32.MASK
	return float(t ^ (t >> 14)) / 4294967296.0


## Rng.int(n) in the TS version: an integer in [0, n).
func below(n: int) -> int:
	return floori(next() * n)


func range_f(lo: float, hi: float) -> float:
	return lo + next() * (hi - lo)


func chance(p: float) -> bool:
	return next() < p


func pick(items: Array) -> Variant:
	return items[below(items.size())]
