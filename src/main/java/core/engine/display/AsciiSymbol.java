package core.engine.display;

/**
 * Represents the mapping between an entity type and its ASCII representation
 */
class AsciiSymbol {
    private char symbol;
    private String foreground;
    private String background;

    public AsciiSymbol(char symbol, String foreground, String background) {
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