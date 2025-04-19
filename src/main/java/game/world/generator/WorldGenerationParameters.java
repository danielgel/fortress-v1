package game.world.generator;

public class WorldGenerationParameters {
    private int width;
    private int height;
    private int depth;
    private long seed; // For random generation

    public WorldGenerationParameters() {
        // Default values
        this.width = 100;
        this.height = 100;
        this.depth = 10;
        this.seed = System.currentTimeMillis(); // Random seed
    }

    // Getters and setters
    public int getWidth() {
        return width;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public int getDepth() {
        return depth;
    }

    public void setDepth(int depth) {
        this.depth = depth;
    }

    public long getSeed() {
        return seed;
    }

    public void setSeed(long seed) {
        this.seed = seed;
    }
}
