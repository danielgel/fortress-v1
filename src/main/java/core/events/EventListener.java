package core.events;

/**
 * Interface for objects that can listen to events
 */
public interface EventListener {
    void onEvent(GameEvent event);

}