package core.system;

public class InputOptions {
    private boolean singleShot;

    public InputOptions() {
    }

    public InputOptions(boolean singleShot) {
        this.singleShot = singleShot;
    }

    public boolean isSingleShot() {
        return singleShot;
    }

    public InputOptions setSingleShot(boolean singleShot) {
        this.singleShot = singleShot;
        return this;
    }
}
