package core.time;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class TimeTickManager {
    private final List<TimeTickListener> listeners = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "game-tick");
        // Daemon so a missed shutdown() cannot keep the JVM alive after the window closes.
        thread.setDaemon(true);
        return thread;
    });

    private long tickIntervalMs;
    private ScheduledFuture<?> tickTask;
    private boolean isShutDown = false;
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
     * Starts the time tick mechanism. Does nothing if already running or shut down.
     */
    public synchronized void start() {
        if (isShutDown || isRunning()) return;

        lastTickTime = System.currentTimeMillis();

        tickTask = scheduler.scheduleAtFixedRate(() -> {
            long currentTime = System.currentTimeMillis();
            long deltaTime = currentTime - lastTickTime;
            lastTickTime = currentTime;

            // Notify all registered entities. A listener that throws would otherwise
            // cancel the repeating task silently and stop the clock for good.
            for (TimeTickListener listener : listeners) {
                try {
                    listener.onTimeTick(deltaTime);
                } catch (RuntimeException e) {
                    System.err.println("Tick listener " + listener.getClass().getName() + " failed:");
                    e.printStackTrace();
                }
            }
        }, 0, tickIntervalMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Stops the time tick mechanism. The manager can be started again afterwards.
     */
    public synchronized void stop() {
        if (tickTask != null) {
            tickTask.cancel(false);
            tickTask = null;
        }
    }

    /**
     * Shuts down the time tick mechanism and cleans up resources.
     * The manager cannot be restarted afterwards.
     */
    public synchronized void shutdown() {
        stop();
        isShutDown = true;
        scheduler.shutdown();
        listeners.clear();
    }

    /**
     * @return true if ticks are currently being delivered.
     */
    public synchronized boolean isRunning() {
        return tickTask != null && !tickTask.isCancelled();
    }

    /**
     * Changes the tick interval, restarting the ticker if it was already running.
     * @param newTickIntervalMs The new interval between ticks in milliseconds.
     */
    public synchronized void setTickInterval(long newTickIntervalMs) {
        if (newTickIntervalMs == tickIntervalMs) return;

        boolean wasRunning = isRunning();
        stop();
        tickIntervalMs = newTickIntervalMs;
        if (wasRunning) {
            start();
        }
    }

    /**
     * @return The current tick interval in milliseconds.
     */
    public synchronized long getTickIntervalMs() {
        return tickIntervalMs;
    }
}
