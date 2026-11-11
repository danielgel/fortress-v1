"""Builds the two tile atlases the Godot spike renders with.

    uvx --with pillow python godot/tools/make_atlases.py
    uvx --with pillow python godot/tools/make_atlases.py --sheet sheet.png --map tiles.json [--spacing 1]

Both atlases share one layout: tile N is GLYPHS[N]. `ascii.png` draws the glyph with DejaVu
Sans Mono (the TS game's font); `sprites.png` draws placeholder pixel art for the glyphs
listed in ART and falls back to the glyph for the rest. Both are white/grey on transparent:
the renderer tints them per tile, exactly like the TS fillText colours.

To try a real tileset (e.g. Kenney's CC0 1-Bit Pack), pass --sheet with its 16x16 sprite sheet
and --map with a JSON object from glyph to [column, row] in that sheet, e.g.
{"@": [24, 0], "♣": [0, 1], "#": [10, 17]}. Mapped glyphs take the sheet's tile (converted to
white so the renderer can tint it); the rest keep the placeholder art.
"""

import argparse

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "tiles"
FONT = ROOT / "assets" / "fonts" / "DejaVuSansMono.ttf"
CELL = 16
COLUMNS = 16

# Every glyph the renderer can ask for (tile_visuals.gd), then the rest of printable ASCII.
SPECIAL = "◊♦≈~=X><ΘΩ╤╥≡☼¥♠♣\"'.,@#+*/"
GLYPHS = SPECIAL + "".join(chr(c) for c in range(33, 127) if chr(c) not in SPECIAL)

# 8x8 placeholder art, drawn at 2x. '#' = white, '+' = light grey, '-' = mid grey, '.' = clear.
ART = {
    "#": """
        --------
        +++-++++
        +++-++++
        --------
        +-++++-+
        +-++++-+
        --------
        +++-++++""",
    "◊": """
        ........
        ..#.....
        .#+#..#.
        ..#..#+#
        ......#.
        .#......
        #+#..#..
        .#......""",
    "♦": """
        ........
        ...##...
        ..#++#..
        .#++++#.
        .#+--+#.
        ..#--#..
        ...##...
        ........""",
    "≈": """
        ........
        .##...##
        #..#.#..
        ....#...
        .##...##
        #..#.#..
        ....#...
        ........""",
    "~": """
        ........
        ........
        ........
        .##...##
        #..#.#..
        ....#...
        ........
        ........""",
    "=": """
        ++++++++
        ++++#+++
        +++#++++
        ++#+++++
        +++++#++
        ++++#+++
        +++#++++
        ++++++++""",
    ">": """
        ........
        ######..
        #-----#.
        .#----#.
        ..#---#.
        ...#--#.
        ....#-#.
        .....##.""",
    "<": """
        .....##.
        ....#-#.
        ...#--#.
        ..#---#.
        .#----#.
        #-----#.
        ######..
        ........""",
    "X": """
        ...##...
        ..#--#..
        .#----#.
        ########
        ########
        .#----#.
        ..#--#..
        ...##...""",
    "♣": """
        ...##...
        ..####..
        .##+###.
        ..####..
        .###+##.
        ########
        ...--...
        ...--...""",
    '"': """
        ........
        ........
        ..#..#..
        .##.##..
        .######.
        ..####..
        ...--...
        ........""",
    "♠": """
        ........
        ..####..
        .##+###.
        ########
        ...++...
        ...++...
        ..++++..
        ........""",
    ".": """
        ........
        ........
        ........
        ...+....
        ........
        ........
        ........
        ........""",
    ",": """
        ........
        ........
        .....+..
        ........
        ........
        ..+.....
        ........
        ........""",
    "@": """
        ...##...
        ..####..
        ..+--+..
        .##++##.
        #.####.#
        ..####..
        ..#..#..
        .##..##.""",
    "Θ": """
        ........
        ........
        #.......
        #+------
        ########
        #......#
        ........
        ........""",
    "╤": """
        ........
        ........
        ########
        .#....#.
        .#....#.
        .#....#.
        ........
        ........""",
    "╥": """
        ..#.....
        ..#.....
        ..#.....
        ..#####.
        ..#...#.
        ..#...#.
        ........
        ........""",
    "+": """
        .######.
        .#----#.
        .#----#.
        .#----#.
        .#---##.
        .#----#.
        .#----#.
        .######.""",
    "Ω": """
        ...##...
        ..#++#..
        ...##...
        ..####..
        ...##...
        ..#..#..
        .######.
        ........""",
    "☼": """
        ....#...
        ....#...
        .#.###.#
        ..#+++#.
        ...###..
        ..#.#.#.
        .#.....#
        ........""",
    "≡": """
        ........
        ########
        --------
        ########
        --------
        ########
        --------
        ........""",
    "¥": """
        .#..#..#
        .#..#..#
        ..#.#.#.
        ...###..
        ....+...
        ....+...
        ....+...
        ........""",
}

SHADES = {"#": 255, "+": 200, "-": 140}


def glyph_tile(font: ImageFont.FreeTypeFont, ch: str) -> Image.Image:
    tile = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.text((CELL / 2, CELL / 2 + 1), ch, font=font, fill=(255, 255, 255, 255), anchor="mm")
    return tile


def art_tile(rows: str) -> Image.Image:
    lines = [r.strip() for r in rows.strip().splitlines()]
    assert len(lines) == 8 and all(len(r) == 8 for r in lines), lines
    tile = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    for y, row in enumerate(lines):
        for x, c in enumerate(row):
            if c in SHADES:
                v = SHADES[c]
                for dy in (0, 1):
                    for dx in (0, 1):
                        tile.putpixel((x * 2 + dx, y * 2 + dy), (v, v, v, 255))
    return tile


def sheet_tiles(sheet_path: str, map_path: str, spacing: int) -> dict:
    """Tiles cut from a sprite sheet, keyed by glyph, recoloured to white keeping alpha."""
    sheet = Image.open(sheet_path).convert("RGBA")
    mapping = json.loads(Path(map_path).read_text())
    out = {}
    for ch, (col, row) in mapping.items():
        x, y = col * (CELL + spacing), row * (CELL + spacing)
        tile = sheet.crop((x, y, x + CELL, y + CELL))
        # 1-bit sheets draw the sprite in one colour on transparent (or black): keep the shape only
        px = tile.load()
        for ty in range(CELL):
            for tx in range(CELL):
                r, g, b, a = px[tx, ty]
                px[tx, ty] = (255, 255, 255, a if (r, g, b) != (0, 0, 0) else 0)
        out[ch] = tile
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sheet", help="sprite sheet with 16x16 tiles")
    parser.add_argument("--map", help="JSON object: glyph -> [column, row] in the sheet")
    parser.add_argument("--spacing", type=int, default=0, help="pixels between tiles in the sheet")
    args = parser.parse_args()
    from_sheet = sheet_tiles(args.sheet, args.map, args.spacing) if args.sheet and args.map else {}
    assert len(set(GLYPHS)) == len(GLYPHS)
    font = ImageFont.truetype(str(FONT), 15)
    rows = (len(GLYPHS) + COLUMNS - 1) // COLUMNS
    ascii_img = Image.new("RGBA", (COLUMNS * CELL, rows * CELL), (0, 0, 0, 0))
    sprite_img = ascii_img.copy()
    for n, ch in enumerate(GLYPHS):
        at = ((n % COLUMNS) * CELL, (n // COLUMNS) * CELL)
        g = glyph_tile(font, ch)
        ascii_img.paste(g, at)
        sprite_img.paste(from_sheet.get(ch) or (art_tile(ART[ch]) if ch in ART else g), at)
    OUT.mkdir(parents=True, exist_ok=True)
    ascii_img.save(OUT / "ascii.png")
    sprite_img.save(OUT / "sprites.png")
    (OUT / "atlas.json").write_text(json.dumps({"cell": CELL, "columns": COLUMNS, "glyphs": GLYPHS}, ensure_ascii=False) + "\n")
    print(f"{len(GLYPHS)} tiles, {len(from_sheet)} from the sheet, {len(ART)} with placeholder art -> {OUT}")


if __name__ == "__main__":
    main()
