package game.navigation;

import java.util.List;

/**
 * A path from one position to another
 */
public class Path {
    private List<Position> waypoints;
    private boolean isComplete;

    public Position getNextWaypoint() {
        return waypoints.get(0);
    }

    public void advanceToNextWaypoint() {
        waypoints.remove(0);
    }
}