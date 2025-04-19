package core.engine.display;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import entities.Entity;
import entities.EntityType;
import game.navigation.Position;
import game.world.Tile;
import game.world.World;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LibGDXRenderer {//extends ApplicationAdapter {
    // Screen dimensions (in characters)
    private int width;
    private int height;

    // Tile dimensions (in pixels)
    private float tileWidth = 16f;
    private float tileHeight = 16f;

    // LibGDX rendering objects
    private SpriteBatch batch;
    private ShapeRenderer shapeRenderer;
    private BitmapFont font;
    private OrthographicCamera camera;
    private Viewport viewport;
    private GlyphLayout glyphLayout;

    // Buffer to store the current frame
    private AsciiTile[][] buffer;

    // Viewport settings (for scrolling around a larger world)
    private int viewportX = 0;
    private int viewportY = 0;
    private int viewportWidth;
    private int viewportHeight;


    // Symbol mappings
    private Map<EntityType, AsciiSymbol> symbolMap;


    public LibGDXRenderer(int width, int height) {
        this.width = width;
        this.height = height;

        this.viewportWidth = width;
        this.viewportHeight = height;

    }

    private void preRenderInitialization() {
        // Initialize symbol mappings
        initializeSymbolMap();

        // Initialize buffer with empty tiles
        buffer = new AsciiTile[height][width];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                buffer[y][x] = new AsciiTile(' ', "WHITE", "BG_BLACK");
            }
        }
    }


    public void initializeRenderingComponents() {
        // Initialize LibGDX components
        batch = new SpriteBatch();
        shapeRenderer = new ShapeRenderer();
        font = new BitmapFont();
        font.setColor(Color.WHITE);
        font.getData().setScale(1.0f);

        // Configure camera and viewport
        camera = new OrthographicCamera();
        viewport = new FitViewport(width * tileWidth, height * tileHeight, camera);
        viewport.apply();
        camera.position.set(camera.viewportWidth / 2, camera.viewportHeight / 2, 0);

        glyphLayout = new GlyphLayout();

        preRenderInitialization();
    }


    public void prepareRender() {
        camera.update();
        batch.setProjectionMatrix(camera.combined);
        shapeRenderer.setProjectionMatrix(camera.combined);

    }

    public void endRender() {

        shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                AsciiTile tile = buffer[y][x];
                Color bgColor = getColorFromString(tile.getBackground());
                shapeRenderer.setColor(bgColor);
                shapeRenderer.rect(x * tileWidth, (height - y - 1) * tileHeight, tileWidth, tileHeight);
            }
        }
        shapeRenderer.end();

        batch.begin();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                AsciiTile tile = buffer[y][x];
                Color fgColor = getColorFromString(tile.getForeground());
                font.setColor(fgColor);

                // Center the character within its tile
                String character = String.valueOf(tile.getSymbol());
                glyphLayout.setText(font, character);
                float xPos = x * tileWidth + (tileWidth - glyphLayout.width) / 2;
                float yPos = (height - y) * tileHeight - (tileHeight - glyphLayout.height) / 2;

                font.draw(batch, character, xPos, yPos);
            }
        }
        batch.end();
    }

    //    @Override
    public void render() {
        // Clear the screen
        Gdx.gl.glClearColor(0, 0, 0, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        // Handle input
//        handleInput();

        // Update camera
        camera.update();
        batch.setProjectionMatrix(camera.combined);
        shapeRenderer.setProjectionMatrix(camera.combined);

        // First, draw the background colors
        shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                AsciiTile tile = buffer[y][x];
                Color bgColor = getColorFromString(tile.getBackground());
                shapeRenderer.setColor(bgColor);
                shapeRenderer.rect(x * tileWidth, (height - y - 1) * tileHeight, tileWidth, tileHeight);
            }
        }
        shapeRenderer.end();

        // Then, draw the characters
        batch.begin();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                AsciiTile tile = buffer[y][x];
                Color fgColor = getColorFromString(tile.getForeground());
                font.setColor(fgColor);

                // Center the character within its tile
                String character = String.valueOf(tile.getSymbol());
                glyphLayout.setText(font, character);
                float xPos = x * tileWidth + (tileWidth - glyphLayout.width) / 2;
                float yPos = (height - y) * tileHeight - (tileHeight - glyphLayout.height) / 2;

                font.draw(batch, character, xPos, yPos);
            }
        }
        batch.end();
    }

    //    @Override
    public void resize(int width, int height) {
        viewport.update(width, height);
        camera.position.set(camera.viewportWidth / 2, camera.viewportHeight / 2, 0);
    }

    public void dispose() {
        batch.dispose();
        shapeRenderer.dispose();
        font.dispose();

    }


    /**
     * Initialize symbol mappings for entities
     */
    private void initializeSymbolMap() {
        symbolMap = new HashMap<>();

        // Terrain symbols
        symbolMap.put(EntityType.WALL, new AsciiSymbol('#', "WHITE", "BG_BLACK"));
        symbolMap.put(EntityType.FLOOR, new AsciiSymbol('.', "BRIGHT_BLACK", "BG_BLACK"));
        symbolMap.put(EntityType.STAIRS_UP, new AsciiSymbol('<', "WHITE", "BG_BLACK"));
        symbolMap.put(EntityType.STAIRS_DOWN, new AsciiSymbol('>', "WHITE", "BG_BLACK"));
        symbolMap.put(EntityType.DOOR, new AsciiSymbol('+', "YELLOW", "BG_BLACK"));
        symbolMap.put(EntityType.WATER, new AsciiSymbol('~', "BLUE", "BG_BLACK"));
        symbolMap.put(EntityType.MAGMA, new AsciiSymbol('~', "RED", "BG_BLACK"));

        // Entity symbols
        symbolMap.put(EntityType.DWARF, new AsciiSymbol('@', "BRIGHT_WHITE", "BG_BLACK"));
        symbolMap.put(EntityType.ANIMAL, new AsciiSymbol('a', "GREEN", "BG_BLACK"));
        symbolMap.put(EntityType.MONSTER, new AsciiSymbol('M', "RED", "BG_BLACK"));
        symbolMap.put(EntityType.ITEM, new AsciiSymbol('*', "YELLOW", "BG_BLACK"));

        // Resource symbols
        symbolMap.put(EntityType.TREE, new AsciiSymbol('♣', "GREEN", "BG_BLACK"));
        symbolMap.put(EntityType.MINERAL, new AsciiSymbol('◊', "CYAN", "BG_BLACK"));
        symbolMap.put(EntityType.GEM, new AsciiSymbol('♦', "BRIGHT_PURPLE", "BG_BLACK"));

        // Workshop symbols
        symbolMap.put(EntityType.WORKSHOP, new AsciiSymbol('&', "YELLOW", "BG_BLACK"));
        symbolMap.put(EntityType.FORGE, new AsciiSymbol('Ω', "RED", "BG_BLACK"));
    }

    /**
     * Convert color string to LibGDX Color object
     */
    private Color getColorFromString(String colorStr) {
        switch (colorStr) {
            case "BLACK":
                return Color.BLACK;
            case "RED":
                return Color.RED;
            case "GREEN":
                return Color.GREEN;
            case "YELLOW":
                return Color.YELLOW;
            case "BLUE":
                return Color.BLUE;
            case "PURPLE":
                return new Color(0.5f, 0, 0.5f, 1);
            case "CYAN":
                return Color.CYAN;
            case "WHITE":
                return Color.WHITE;
            case "BRIGHT_BLACK":
                return Color.DARK_GRAY;
            case "BRIGHT_RED":
                return Color.RED.cpy().add(0.3f, 0.3f, 0.3f, 0);
            case "BRIGHT_GREEN":
                return Color.GREEN.cpy().add(0.3f, 0.3f, 0.3f, 0);
            case "BRIGHT_YELLOW":
                return Color.YELLOW.cpy().add(0.3f, 0.3f, 0.3f, 0);
            case "BRIGHT_BLUE":
                return Color.BLUE.cpy().add(0.3f, 0.3f, 0.3f, 0);
            case "BRIGHT_PURPLE":
                return new Color(0.8f, 0.3f, 0.8f, 1);
            case "BRIGHT_CYAN":
                return Color.CYAN.cpy().add(0.3f, 0.3f, 0.3f, 0);
            case "BRIGHT_WHITE":
                return Color.WHITE;
            case "BG_BLACK":
                return Color.BLACK;
            case "BG_RED":
                return Color.RED.cpy().mul(0.5f);
            case "BG_GREEN":
                return Color.GREEN.cpy().mul(0.5f);
            case "BG_YELLOW":
                return Color.YELLOW.cpy().mul(0.5f);
            case "BG_BLUE":
                return Color.BLUE.cpy().mul(0.5f);
            case "BG_PURPLE":
                return new Color(0.25f, 0, 0.25f, 1);
            case "BG_CYAN":
                return Color.CYAN.cpy().mul(0.5f);
            case "BG_WHITE":
                return Color.LIGHT_GRAY;
            default:
                return Color.WHITE;
        }
    }

    /**
     * Clear the screen buffer
     */
    public void clear() {
        Gdx.gl.glClearColor(0, 0, 0, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
//        for (int y = 0; y < height; y++) {
//            for (int x = 0; x < width; x++) {
//                buffer[y][x] = new AsciiTile(' ', "WHITE", "BG_BLACK");
//            }
//        }
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
     * Draw a box with a border and optional title
     */
    public void drawBox(int x, int y, int width, int height, String title, String foreground, String background) {
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
    public void centerViewportOn(int worldX, int worldY, World world) {
        viewportX = worldX - viewportWidth / 2;
        viewportY = worldY - viewportHeight / 2;

        // Ensure viewport stays within world bounds
        if (viewportX < 0) viewportX = 0;
        if (viewportY < 0) viewportY = 0;
        if (viewportX + viewportWidth > world.getWidth()) viewportX = world.getWidth() - viewportWidth;
        if (viewportY + viewportHeight > world.getHeight()) viewportY = world.getHeight() - viewportHeight;
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
     * Render world terrain within the current viewport
     */
    public void renderWorld(World world) {

        for (int y = 0; y < viewportHeight; y++) {
            for (int x = 0; x < viewportWidth; x++) {
                int worldX = x + viewportX;
                int worldY = y + viewportY;

                if (worldX >= 0 && worldX < world.getWidth() && worldY >= 0 && worldY < world.getHeight()) {
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
        // This implementation matches your existing code
        if (tile == null) return EntityType.WALL;

        if (tile.getMaterial() == core.engine.tiles.TileMaterial.STONE && !tile.isExcavated()) {
            return EntityType.WALL;
        } else if (tile.getMaterial() == core.engine.tiles.TileMaterial.STONE && tile.isExcavated()) {
            return EntityType.FLOOR;
        } else if (tile.getMaterial() == core.engine.tiles.TileMaterial.WATER) {
            return EntityType.WATER;
        } else if (tile.getMaterial() == core.engine.tiles.TileMaterial.MAGMA) {
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
        // This matches your existing implementation
        if (entity.getType().equals("DWARF")) {
            return EntityType.DWARF;
        } else if (entity.getType().equals("ANIMAL")) {
            return EntityType.ANIMAL;
        } else if (entity.getType().equals("MONSTER")) {
            return EntityType.MONSTER;
        } else if (entity.getType().equals("ITEM")) {
            return EntityType.ITEM;
        } else {
            return EntityType.FLOOR; // Default
        }
    }
}