package core.time;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class TimeTickManager {
    private final List<TimeTickListener> listeners = new ArrayList<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final long tickIntervalMs;
    private boolean isRunning = false;
    private long lastTickTime;

    /**
     * Creates a TimeTickManager with the specified tick interval.
     * @param tickIntervalMs The interval between ticks in milliseconds.
     */
    public TimeTickManager(long tickIntervalMs) {
        this.tickIntervalMs = tickIntervalMs;
    }

    /**
     * Registers an entity to receive time tick updates.
     * @param listener The entity that will receive updates.
     */
    public void registerListener(TimeTickListener listener) {
        listeners.add(listener);
    }

    /**
     * Unregisters an entity from receiving time tick updates.
     * @param listener The entity to unregister.
     */
    public void unregisterListener(TimeTickListener listener) {
        listeners.remove(listener);
    }

    /**
     * Starts the time tick mechanism.
     */
    public void start() {
        if (isRunning) return;

        isRunning = true;
        lastTickTime = System.currentTimeMillis();

        scheduler.scheduleAtFixedRate(() -> {
            if (!isRunning) return;

            long currentTime = System.currentTimeMillis();
            long deltaTime = currentTime - lastTickTime;
            lastTickTime = currentTime;

            // Notify all registered entities
            for (TimeTickListener listener : new ArrayList<>(listeners)) {
                listener.onTimeTick(deltaTime);
            }
        }, 0, tickIntervalMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Stops the time tick mechanism.
     */
    public void stop() {
        isRunning = false;
    }

    /**
     * Shuts down the time tick mechanism and cleans up resources.
     */
    public void shutdown() {
        stop();
        scheduler.shutdown();
        listeners.clear();
    }

    /**
     * Changes the tick interval. This requires restarting the manager.
     * @param newTickIntervalMs The new interval between ticks in milliseconds.
     */
    public void setTickInterval(long newTickIntervalMs) {
        boolean wasRunning = isRunning;
        if (wasRunning) {
            stop();
        }

        scheduler.shutdown();
        try {
            scheduler.awaitTermination(1, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Create a new manager with the updated interval
        if (wasRunning) {
            start();
        }
    }

    /**
     * @return The current tick interval in milliseconds.
     */
    public long getTickIntervalMs() {
        return tickIntervalMs;
    }
}
