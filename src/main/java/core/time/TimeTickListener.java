package core.time;

public interface TimeTickListener {
    /**
     * Called when a time tick occurs.
     * @param deltaTime Time elapsed since the last tick in milliseconds.
     */
    void onTimeTick(long deltaTime);
}
