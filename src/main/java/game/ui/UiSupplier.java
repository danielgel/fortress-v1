package game.ui;

import java.util.function.Supplier;

public class UiSupplier {

    private Supplier<String> text;
    private Supplier<String> foreground;

    public UiSupplier(Supplier<String> text, Supplier<String> foreground, Supplier<String> background) {
        this.text = text;
        this.foreground = foreground;
        this.background = background;
    }

    public Supplier<String> getBackground() {
        return background;
    }

    public UiSupplier setBackground(Supplier<String> background) {
        this.background = background;
        return this;
    }

    public Supplier<String> getForeground() {
        return foreground;
    }

    public UiSupplier setForeground(Supplier<String> foreground) {
        this.foreground = foreground;
        return this;
    }

    public Supplier<String> getText() {
        return text;
    }

    public UiSupplier setText(Supplier<String> text) {
        this.text = text;
        return this;
    }

    private Supplier<String> background;

}
