package core.events;


/**************************************
 * EVENT SYSTEM
 **************************************/

import java.util.List;
import java.util.Map;

/**
 * Manages game events and their listeners
 */
public class EventManager {
    private Map<EventType, List<EventListener>> listeners;

    public void fireEvent(GameEvent event) {
        // Notify all relevant listeners
        if (listeners.containsKey(event.getType())) {
            for (EventListener listener : listeners.get(event.getType())) {
                listener.onEvent(event);
            }
        }
    }

    public void registerListener(EventType type, EventListener listener) {
        listeners.get(type).add(listener);
    }
}
