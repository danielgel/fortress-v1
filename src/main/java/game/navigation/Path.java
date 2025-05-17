package game.navigation;

import java.util.ArrayList;
import java.util.List;

/**
 * A path from one position to another
 */
public class Path {
    private final List<Position> waypoints;
    private boolean isComplete;
    private int currentWaypointIndex;

    /**
     * Creates a new empty path
     */
    public Path() {
        waypoints = new ArrayList<>();
        isComplete = false;
        currentWaypointIndex = 0;
    }

    /**
     * Adds a waypoint to the path
     *
     * @param waypoint The position to add as a waypoint
     */
    public void addWaypoint(Position waypoint) {
        waypoints.add(waypoint);
    }

    /**
     * Gets the next waypoint in the path
     *
     * @return The next waypoint, or null if the path is empty or complete
     */
    public Position getNextWaypoint() {
        if (currentWaypointIndex >= waypoints.size()) {
            return null;
        }
        return waypoints.get(currentWaypointIndex);
    }

    /**
     * Advances to the next waypoint in the path
     */
    public void advanceToNextWaypoint() {
        currentWaypointIndex++;
    }

    /**
     * Checks if the path has been fully traversed
     *
     * @return true if the path is complete, false otherwise
     */
    public boolean isPathComplete() {
        return currentWaypointIndex >= waypoints.size();
    }

    /**
     * Gets the total length of the path
     *
     * @return The number of waypoints in the path
     */
    public int getLength() {
        return waypoints.size();
    }

    /**
     * Sets whether this path is a complete path or just a partial one
     *
     * @param complete true if the path is complete, false otherwise
     */
    public void setComplete(boolean complete) {
        isComplete = complete;
    }

    /**
     * Checks if this path is a complete path
     *
     * @return true if the path is complete, false otherwise
     */
    public boolean isComplete() {
        return isComplete;
    }

    /**
     * Gets all waypoints in this path
     *
     * @return The list of waypoints
     */
    public List<Position> getWaypoints() {
        return new ArrayList<>(waypoints);
    }

    /**
     * Gets a specific waypoint in the path
     *
     * @param index The index of the waypoint
     * @return The waypoint at the specified index, or null if out of bounds
     */
    public Position getWaypoint(int index) {
        if (index < 0 || index >= waypoints.size()) {
            return null;
        }
        return waypoints.get(index);
    }

    /**
     * Resets the path to the beginning
     */
    public void reset() {
        currentWaypointIndex = 0;
    }

    /**
     * Gets the current waypoint index
     *
     * @return The current waypoint index
     */
    public int getCurrentWaypointIndex() {
        return currentWaypointIndex;
    }

    /**
     * Sets the current waypoint index
     *
     * @param index The index to set
     */
    public void setCurrentWaypointIndex(int index) {
        if (index >= 0 && index < waypoints.size()) {
            currentWaypointIndex = index;
        }
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Path[complete=").append(isComplete)
                .append(", waypoints=").append(waypoints.size())
                .append(", current=").append(currentWaypointIndex)
                .append("]:");

        for (int i = 0; i < waypoints.size(); i++) {
            Position pos = waypoints.get(i);
            sb.append("\n  ").append(i).append(": (")
                    .append(pos.getX()).append(", ")
                    .append(pos.getY()).append(", ")
                    .append(pos.getZ()).append(")");

            if (i == currentWaypointIndex) {
                sb.append(" <-- current");
            }
        }

        return sb.toString();
    }

}