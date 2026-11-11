class_name Tile
## Per-tile enums and bit flags. Port of src/world/types.ts.
## (Enums are Mat / Feat because Godot already has Material and similar classes.)

enum Mat { STONE, SOIL, SAND, GRASS, SNOW, MUD }

enum Feat { NONE, TREE, SHRUB, ORE, GEM, MUSHROOM }

const OPEN := 1  ## excavated / floor you can stand on
const STAIRS_UP := 2  ## leads to z-1
const STAIRS_DOWN := 4  ## leads to z+1
const DOOR := 8
const DISCOVERED := 16
const SOURCE := 32  ## infinite water source (surface lakes)

const MAX_FLUID := 7
