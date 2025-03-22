package core.engine.display;

/**
 * Represents a single character in the ASCII display
 */
class AsciiTile {
    private char symbol;
    private String foreground;
    private String background;

    public AsciiTile(char symbol, String foreground, String background) {
        this.symbol = symbol;
        this.foreground = foreground;
        this.background = background;
    }

    public char getSymbol() {
        return symbol;
    }

    public String getForeground() {
        return foreground;
    }

    public String getBackground() {
        return background;
    }
}