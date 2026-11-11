class_name I32
## 32-bit integer helpers that reproduce JavaScript's Math.imul, >>> and Math.round.
##
## GDScript ints are 64-bit signed and wrap on overflow. 32-bit values are kept as
## non-negative u32 (0..2^32-1), so `>>` acts like JS `>>>` and results match bit for bit.

const MASK := 0xFFFFFFFF


## Math.imul as u32. Inputs may be any int (negative values wrap like JS ToInt32).
## The 64-bit product may overflow, but its low 32 bits are still exact.
static func imul(a: int, b: int) -> int:
	return ((a & MASK) * (b & MASK)) & MASK


## Overflow-free Math.imul (16-bit split); the reference `imul` is tested against.
static func imul_split(a: int, b: int) -> int:
	a &= MASK
	b &= MASK
	return ((a & 0xFFFF) * b + ((((a >> 16) * b) & 0xFFFF) << 16)) & MASK


## JS Math.round: halves go towards +infinity (GDScript's round() goes away from zero).
static func js_round(x: float) -> int:
	return floori(x + 0.5)
