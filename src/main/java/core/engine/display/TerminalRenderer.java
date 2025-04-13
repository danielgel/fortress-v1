package core.engine.display;


import com.googlecode.lanterna.graphics.TextGraphics;
import com.googlecode.lanterna.screen.Screen;
import com.googlecode.lanterna.screen.TerminalScreen;
import com.googlecode.lanterna.terminal.DefaultTerminalFactory;
import com.googlecode.lanterna.terminal.Terminal;
import com.googlecode.lanterna.terminal.swing.SwingTerminal;
import com.googlecode.lanterna.terminal.swing.SwingTerminalFrame;
import core.engine.tiles.TileMaterial;
import entities.Entity;
import entities.EntityType;
import game.navigation.Position;
import game.world.Tile;
import game.world.World;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A terminal-based rendering engine for ASCII games
 */
public class TerminalRenderer {
    // ANSI escape codes for colors and formatting
    public static final String RESET = "\u001B[0m";

    // Foreground colors
    public static final String BLACK = "\u001B[30m";
    public static final String RED = "\u001B[31m";
    public static final String GREEN = "\u001B[32m";
    public static final String YELLOW = "\u001B[33m";
    public static final String BLUE = "\u001B[34m";
    public static final String PURPLE = "\u001B[35m";
    public static final String CYAN = "\u001B[36m";
    public static final String WHITE = "\u001B[37m";

    // Background colors
    public static final String BG_BLACK = "\u001B[40m";
    public static final String BG_RED = "\u001B[41m";
    public static final String BG_GREEN = "\u001B[42m";
    public static final String BG_YELLOW = "\u001B[43m";
    public static final String BG_BLUE = "\u001B[44m";
    public static final String BG_PURPLE = "\u001B[45m";
    public static final String BG_CYAN = "\u001B[46m";
    public static final String BG_WHITE = "\u001B[47m";

    // Bright foreground colors
    public static final String BRIGHT_BLACK = "\u001B[90m";
    public static final String BRIGHT_RED = "\u001B[91m";
    public static final String BRIGHT_GREEN = "\u001B[92m";
    public static final String BRIGHT_YELLOW = "\u001B[93m";
    public static final String BRIGHT_BLUE = "\u001B[94m";
    public static final String BRIGHT_PURPLE = "\u001B[95m";
    public static final String BRIGHT_CYAN = "\u001B[96m";
    public static final String BRIGHT_WHITE = "\u001B[97m";

    // Bright background colors
    public static final String BG_BRIGHT_BLACK = "\u001B[100m";
    public static final String BG_BRIGHT_RED = "\u001B[101m";
    public static final String BG_BRIGHT_GREEN = "\u001B[102m";
    public static final String BG_BRIGHT_YELLOW = "\u001B[103m";
    public static final String BG_BRIGHT_BLUE = "\u001B[104m";
    public static final String BG_BRIGHT_PURPLE = "\u001B[105m";
    public static final String BG_BRIGHT_CYAN = "\u001B[106m";
    public static final String BG_BRIGHT_WHITE = "\u001B[107m";

    // Text formatting
    public static final String BOLD = "\u001B[1m";
    public static final String ITALIC = "\u001B[3m";
    public static final String UNDERLINE = "\u001B[4m";
    public static final String BLINK = "\u001B[5m";

    // Terminal control
    public static final String CLEAR = "\u001B[2J";
    public static final String HOME = "\u001B[H";
    public static final String HIDE_CURSOR = "\u001B[?25l";
    public static final String SHOW_CURSOR = "\u001B[?25h";

    // Screen dimensions
    private int width;
    private int height;

    // Buffer to store the current frame before rendering
    private AsciiTile[][] buffer;

    // Viewport settings (for scrolling around a larger world)
    private int viewportX;
    private int viewportY;
    private int viewportWidth;
    private int viewportHeight;

    // Game world dimensions (can be larger than viewport)
    private int worldWidth;
    private int worldHeight;

    // Symbol mappings for game entities
    private Map<EntityType, AsciiSymbol> symbolMap;

    private Terminal terminal;
    private Screen screen;

    /**
     * Creates a new terminal renderer with the specified dimensions
     */
    public TerminalRenderer(int width, int height) throws IOException {

//        terminal = new DefaultTerminalFactory().createTerminal();
//        terminal.enterPrivateMode();
//        terminal.setCursorVisible(false);
//        screen = new TerminalScreen(terminal);
//        screen.startScreen();

        this.width = width;
        this.height = height;
        this.buffer = new AsciiTile[height][width];

        // Initialize buffer with empty tiles
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                buffer[y][x] = new AsciiTile(' ', WHITE, BG_BLACK);
            }
        }

        // Set initial viewport to show the entire screen
        this.viewportX = 0;
        this.viewportY = 0;
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Initialize symbol mappings
        initializeSymbolMap();
    }

    /**
     * Set up the mapping between game entities and their ASCII representations
     */
    private void initializeSymbolMap() {
        symbolMap = new HashMap<>();

        // Terrain symbols
        symbolMap.put(EntityType.WALL, new AsciiSymbol('#', WHITE, BG_BLACK));
        symbolMap.put(EntityType.FLOOR, new AsciiSymbol('.', BRIGHT_BLACK, BG_BLACK));
        symbolMap.put(EntityType.STAIRS_UP, new AsciiSymbol('<', WHITE, BG_BLACK));
        symbolMap.put(EntityType.STAIRS_DOWN, new AsciiSymbol('>', WHITE, BG_BLACK));
        symbolMap.put(EntityType.DOOR, new AsciiSymbol('+', YELLOW, BG_BLACK));
        symbolMap.put(EntityType.WATER, new AsciiSymbol('~', BLUE, BG_BLACK));
        symbolMap.put(EntityType.MAGMA, new AsciiSymbol('~', RED, BG_BLACK));

        // Entity symbols
        symbolMap.put(EntityType.DWARF, new AsciiSymbol('@', BRIGHT_WHITE, BG_BLACK));
        symbolMap.put(EntityType.ANIMAL, new AsciiSymbol('a', GREEN, BG_BLACK));
        symbolMap.put(EntityType.MONSTER, new AsciiSymbol('M', RED, BG_BLACK));
        symbolMap.put(EntityType.ITEM, new AsciiSymbol('*', YELLOW, BG_BLACK));

        // Resource symbols
        symbolMap.put(EntityType.TREE, new AsciiSymbol('♣', GREEN, BG_BLACK));
        symbolMap.put(EntityType.MINERAL, new AsciiSymbol('◊', CYAN, BG_BLACK));
        symbolMap.put(EntityType.GEM, new AsciiSymbol('♦', BRIGHT_PURPLE, BG_BLACK));

        // Workshop symbols
        symbolMap.put(EntityType.WORKSHOP, new AsciiSymbol('&', YELLOW, BG_BLACK));
        symbolMap.put(EntityType.FORGE, new AsciiSymbol('Ω', RED, BG_BLACK));
    }

    /**
     * Add a custom symbol mapping
     */
    public void addSymbol(EntityType type, char symbol, String foreground, String background) {
        symbolMap.put(type, new AsciiSymbol(symbol, foreground, background));
    }

    /**
     * Clear the screen buffer
     */
    public void clear() {
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                buffer[y][x] = new AsciiTile(' ', WHITE, BG_BLACK);
            }
        }
    }

    /**
     * Set a specific tile in the buffer
     */
    public void setTile(int x, int y, char symbol, String foreground, String background) {
        if (isInBounds(x, y)) {
            buffer[y][x] = new AsciiTile(symbol, foreground, background);
        }
    }

    /**
     * Set a tile using a predefined entity type
     */
    public void setTile(int x, int y, EntityType type) {
        AsciiSymbol symbol = symbolMap.get(type);
        if (symbol != null && isInBounds(x, y)) {
            buffer[y][x] = new AsciiTile(symbol.getSymbol(), symbol.getForeground(), symbol.getBackground());
        }
    }

    /**
     * Draw a string of text at the specified position
     */
    public void drawString(int x, int y, String text, String foreground, String background) {
        for (int i = 0; i < text.length(); i++) {
            if (isInBounds(x + i, y)) {
                buffer[y][x + i] = new AsciiTile(text.charAt(i), foreground, background);
            }
        }
    }

    /**
     * Draw a horizontal line
     */
    public void drawHLine(int x, int y, int length, char symbol, String foreground, String background) {
        for (int i = 0; i < length; i++) {
            if (isInBounds(x + i, y)) {
                buffer[y][x + i] = new AsciiTile(symbol, foreground, background);
            }
        }
    }

    /**
     * Draw a vertical line
     */
    public void drawVLine(int x, int y, int length, char symbol, String foreground, String background) {
        for (int i = 0; i < length; i++) {
            if (isInBounds(x, y + i)) {
                buffer[y + i][x] = new AsciiTile(symbol, foreground, background);
            }
        }
    }

    /**
     * Draw a rectangle outline
     */
    public void drawRect(int x, int y, int width, int height, char symbol, String foreground, String background) {
        drawHLine(x, y, width, symbol, foreground, background);
        drawHLine(x, y + height - 1, width, symbol, foreground, background);
        drawVLine(x, y, height, symbol, foreground, background);
        drawVLine(x + width - 1, y, height, symbol, foreground, background);
    }

    /**
     * Draw a filled rectangle
     */
    public void fillRect(int x, int y, int width, int height, char symbol, String foreground, String background) {
        for (int j = 0; j < height; j++) {
            for (int i = 0; i < width; i++) {
                if (isInBounds(x + i, y + j)) {
                    buffer[y + j][x + i] = new AsciiTile(symbol, foreground, background);
                }
            }
        }
    }

    /**
     * Draw a box with a border and optional title
     */
    public void drawBox(int x, int y, int width, int height, String title,
                        String foreground, String background) {
        // Draw the border with box drawing characters
        drawHLine(x, y, width, '─', foreground, background);
        drawHLine(x, y + height - 1, width, '─', foreground, background);
        drawVLine(x, y, height, '│', foreground, background);
        drawVLine(x + width - 1, y, height, '│', foreground, background);

        // Draw corners
        setTile(x, y, '┌', foreground, background);
        setTile(x + width - 1, y, '┐', foreground, background);
        setTile(x, y + height - 1, '└', foreground, background);
        setTile(x + width - 1, y + height - 1, '┘', foreground, background);

        // Draw title if provided
        if (title != null && !title.isEmpty()) {
            int titleX = x + (width - title.length()) / 2;
            drawString(titleX, y, title, foreground, background);
        }
    }

    /**
     * Check if coordinates are within the buffer bounds
     */
    private boolean isInBounds(int x, int y) {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    /**
     * Set the viewport position (for scrolling around a larger world)
     */
    public void setViewport(int x, int y, int width, int height) {
        this.viewportX = x;
        this.viewportY = y;
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    /**
     * Center the viewport on specific world coordinates
     */
    public void centerViewportOn(int worldX, int worldY) {
        viewportX = worldX - viewportWidth / 2;
        viewportY = worldY - viewportHeight / 2;

        // Ensure viewport stays within world bounds
        if (viewportX < 0) viewportX = 0;
        if (viewportY < 0) viewportY = 0;
        if (viewportX + viewportWidth > worldWidth) viewportX = worldWidth - viewportWidth;
        if (viewportY + viewportHeight > worldHeight) viewportY = worldHeight - viewportHeight;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    public int[] worldToScreen(int worldX, int worldY) {
        return new int[]{
                worldX - viewportX,
                worldY - viewportY
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    public int[] screenToWorld(int screenX, int screenY) {
        return new int[]{
                screenX + viewportX,
                screenY + viewportY
        };
    }

    /**
     * Render the current buffer to the terminal
     */
    public void render() throws IOException {
        // Clear the screen and move cursor to home position
        clearScreen();
//        TextGraphics textGraphics = screen.newTextGraphics();
        StringBuilder frame = new StringBuilder();

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                AsciiTile tile = buffer[y][x];
//                textGraphics.setCharacter(x,y, tile.getSymbol());
                frame.append(tile.getForeground())
                        .append(tile.getBackground())
                        .append(tile.getSymbol());
            }
            frame.append(RESET).append("\n");
        }

//        textGraphics.putString(0, 0, frame.toString());
//        screen.refresh(Screen.RefreshType.DELTA);
//        terminal.flush();
//        terminal.putCharacter('c');
//        terminal.putString(frame.toString());
        System.out.print(frame.toString());
    }

    private void clearScreen() throws IOException {
        System.out.print(CLEAR + HOME + HIDE_CURSOR);
//            screen.clear();
//        terminal.clearScreen();
    }

    /**
     * Clean up resources when done
     */
    public void shutdown() throws IOException {
//        screen.stopScreen();
//        terminal.exitPrivateMode();
        System.out.print(RESET + CLEAR + HOME + SHOW_CURSOR);

    }

    /**
     * Render world terrain within the current viewport
     */
    public void renderWorld(World world) {
        for (int y = 0; y < viewportHeight; y++) {
            for (int x = 0; x < viewportWidth; x++) {
                int worldX = x + viewportX;
                int worldY = y + viewportY;

                if (worldX >= 0 && worldX < worldWidth && worldY >= 0 && worldY < worldHeight) {
                    // Get the tile at this world position
                    Tile worldTile = world.getTileAt(worldX, worldY, world.getCurrentZ());
                    EntityType tileType = mapTileToEntityType(worldTile);

                    // Render the tile
                    setTile(x, y, tileType);
                }
            }
        }
    }

    /**
     * Map a game tile to an entity type for rendering
     */
    private EntityType mapTileToEntityType(Tile tile) {
        // This would be implemented based on your tile system
        // This is a placeholder implementation
        if (tile == null) return EntityType.WALL;

        if (tile.getMaterial() == TileMaterial.STONE && !tile.isExcavated()) {
            return EntityType.WALL;
        } else if (tile.getMaterial() == TileMaterial.STONE && tile.isExcavated()) {
            return EntityType.FLOOR;
        } else if (tile.getMaterial() == TileMaterial.WATER) {
            return EntityType.WATER;
        } else if (tile.getMaterial() == TileMaterial.MAGMA) {
            return EntityType.MAGMA;
        } else {
            return EntityType.FLOOR;
        }
    }

    /**
     * Render entities that are within the current viewport
     */
    public void renderEntities(List<Entity> entities, World world) {
        for (Entity entity : entities) {
            Position pos = entity.getPosition();

            // Check if entity is within the current viewport
            if (pos.getX() >= viewportX && pos.getX() < viewportX + viewportWidth &&
                    pos.getY() >= viewportY && pos.getY() < viewportY + viewportHeight &&
                    pos.getZ() == world.getCurrentZ()) {

                // Convert world coordinates to screen coordinates
                int screenX = (int) pos.getX() - viewportX;
                int screenY = (int) pos.getY() - viewportY;

                // Render the entity
                setTile(screenX, screenY, getEntityTypeForEntity(entity));
            }
        }
    }

    /**
     * Map an entity to its EntityType for rendering
     */
    private EntityType getEntityTypeForEntity(Entity entity) {
        // This would be implemented based on your entity system
        // This is a placeholder implementation
        if (entity.getType() == "DWARF") {
            return EntityType.DWARF;
        } else if (entity.getType() == "ANIMAL") {
            return EntityType.ANIMAL;
        } else if (entity.getType() == "MONSTER") {
            return EntityType.MONSTER;
        } else if (entity.getType() == "ITEM") {
            return EntityType.ITEM;
        } else {
            return EntityType.FLOOR; // Default
        }
    }
}