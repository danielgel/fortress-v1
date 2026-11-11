class_name ValueNoise
## Seeded 2D value noise with fractal layering. Output is in [0, 1).
## Port of src/core/noise.ts (renamed: Godot already has a Noise class).


## Integer hash to [0, 1). Inlined multiplies instead of I32.imul: this is the hottest code
## in world generation. Products may wrap past 64 bits, but their low 32 bits stay exact,
## so masking once at the end gives the same bits as JS Math.imul.
static func hash01(x: int, y: int, seed: int) -> float:
	var h := ((x * 374761393) ^ (y * 668265263) ^ (seed * 2147483647)) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	return float(h ^ (h >> 16)) / 4294967296.0


static func value(x: float, y: float, seed: int) -> float:
	var x0 := floorf(x)
	var y0 := floorf(y)
	var tx := x - x0
	var ty := y - y0
	var fx := tx * tx * (3 - 2 * tx)
	var fy := ty * ty * (3 - 2 * ty)
	# hash01 at the four corners, inlined (function calls dominate generation time)
	var hx0 := int(x0) * 374761393
	var hx1 := hx0 + 374761393
	var hy0 := int(y0) * 668265263
	var hy1 := hy0 + 668265263
	var hs := seed * 2147483647
	var h := (hx0 ^ hy0 ^ hs) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	var a := float(h ^ (h >> 16)) / 4294967296.0
	h = (hx1 ^ hy0 ^ hs) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	var b := float(h ^ (h >> 16)) / 4294967296.0
	h = (hx0 ^ hy1 ^ hs) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	var c := float(h ^ (h >> 16)) / 4294967296.0
	h = (hx1 ^ hy1 ^ hs) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	var d := float(h ^ (h >> 16)) / 4294967296.0
	return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


static func fbm(x: float, y: float, seed: int, octaves := 4) -> float:
	var sum := 0.0
	var amp := 1.0
	var norm := 0.0
	var freq := 1.0
	for i in octaves:
		sum += value(x * freq, y * freq, seed + i * 101) * amp
		norm += amp
		amp *= 0.5
		freq *= 2
	return sum / norm


## 3D-ish noise for caves: samples a 2D field offset per layer.
static func layer(x: float, y: float, z: int, seed: int) -> float:
	return fbm(x + z * 37.7, y - z * 21.3, seed, 3)
