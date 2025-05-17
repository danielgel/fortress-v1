package game.navigation;

/**************************************
 * PATHFINDING SYSTEM
 **************************************/

import game.world.World;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;


/**
 * Handles pathfinding for all entities
 */
public class PathfindingSystem {
    private final World world;
    private final AStar astar;

    // Cache for entity paths
    private final Map<UUID, Path> entityPaths;

    // Default settings
    private static final int DEFAULT_MAX_SEARCH_DISTANCE = 500;
    private static final boolean DEFAULT_ALLOW_DIAGONAL = true;

    /**
     * Creates a new pathfinding system
     *
     * @param world The game world to navigate through
     */
    public PathfindingSystem(World world) {
        this.world = world;
        this.astar = new AStar(world, DEFAULT_MAX_SEARCH_DISTANCE, DEFAULT_ALLOW_DIAGONAL);
        this.entityPaths = new HashMap<>();
    }

    /**
     * Find a path from start to target position
     *
     * @param start Starting position
     * @param target Target position
     * @param constraints Additional constraints on movement
     * @return A path if one is found, null otherwise
     */
    public Path findPath(Position start, Position target, PathfindingConstraints constraints) {
        return astar.findPath(start, target, constraints);
    }

    /**
     * Find a path for a specific entity
     *
     * @param entityId The entity's unique ID
     * @param start Starting position
     * @param target Target position
     * @param constraints Additional constraints on movement
     * @return A path if one is found, null otherwise
     */
    public Path findPathForEntity(UUID entityId, Position start, Position target, PathfindingConstraints constraints) {
        Path path = astar.findPath(start, target, constraints);
        if (path != null) {
            entityPaths.put(entityId, path);
        }
        return path;
    }

    /**
     * Get the current path for an entity
     *
     * @param entityId The entity's unique ID
     * @return The entity's current path, or null if none exists
     */
    public Path getPathForEntity(UUID entityId) {
        return entityPaths.get(entityId);
    }

    /**
     * Clear the path for an entity
     *
     * @param entityId The entity's unique ID
     */
    public void clearPathForEntity(UUID entityId) {
        entityPaths.remove(entityId);
    }

    /**
     * Update an entity's position along its path
     *
     * @param entityId The entity's unique ID
     * @param currentPosition The entity's current position
     * @param movementSpeed The entity's movement speed
     * @return The new position the entity should move to, or null if no path exists
     */
    public Position updateEntityPosition(UUID entityId, Position currentPosition, double movementSpeed) {
        Path path = entityPaths.get(entityId);
        if (path == null || path.isPathComplete()) {
            return null;
        }

        Position nextWaypoint = path.getNextWaypoint();
        if (nextWaypoint == null) {
            return null;
        }

        // Calculate distance to next waypoint
        double dx = nextWaypoint.getX() - currentPosition.getX();
        double dy = nextWaypoint.getY() - currentPosition.getY();
        double dz = nextWaypoint.getZ() - currentPosition.getZ();
        double distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // If we're close enough to the waypoint, advance to the next one
        if (distance < movementSpeed) {
            path.advanceToNextWaypoint();
            return updateEntityPosition(entityId, currentPosition, movementSpeed - distance);
        }

        // Otherwise, move towards the waypoint
        double ratio = movementSpeed / distance;
        double newX = currentPosition.getX() + dx * ratio;
        double newY = currentPosition.getY() + dy * ratio;
        double newZ = currentPosition.getZ() + dz * ratio;

        return new Position(newX, newY, newZ);
    }

    /**
     * Check if a direct path exists between two positions
     *
     * @param start Starting position
     * @param target Target position
     * @param constraints Additional constraints on movement
     * @return true if a direct path exists, false otherwise
     */
    public boolean hasDirectPath(Position start, Position target, PathfindingConstraints constraints) {
        // For simple cases, check if the target is right next to the start
        double dx = Math.abs(target.getX() - start.getX());
        double dy = Math.abs(target.getY() - start.getY());
        double dz = Math.abs(target.getZ() - start.getZ());

        // Check if positions are adjacent
        boolean isAdjacent = (dx <= 1 && dy <= 1 && dz <= 1);

        // If positions are adjacent, check if the move is valid
        if (isAdjacent) {
            // Create a temporary node for target position
            Node targetNode = new Node((int)target.getX(), (int)target.getY(), (int)target.getZ());

            // Check if the target position is walkable
            Tile targetTile = world.getTileAt((int)target.getX(), (int)target.getY(), (int)target.getZ());

            if (targetTile == null) {
                return false;
            }

            // Check basic walkability
            if (!targetTile.isWalkable()) {
                return false;
            }

            // Apply constraints
            if (constraints != null) {
                // Check water tiles
                if (targetTile.getMaterial() == core.engine.tiles.TileMaterial.WATER && !constraints.canSwim()) {
                    return false;
                }

                // Add more constraint checks as needed
            }

            return true;
        }

        // For non-adjacent positions, we need to run a full pathfinding search
        return findPath(start, target, constraints) != null;
    }

    /**
     * Create a simple path to a target without pathfinding
     * Useful for following entities or for simple movement
     *
     * @param start Starting position
     * @param target Target position
     * @return A path with just the target position
     */
    public Path createDirectPath(Position start, Position target) {
        Path path = new Path();
        path.addWaypoint(new Position(start.getX(), start.getY(), start.getZ())); // Start point
        path.addWaypoint(new Position(target.getX(), target.getY(), target.getZ())); // End point
        path.setComplete(true);
        return path;
    }

    /**
     * Set the maximum search distance for the A* algorithm
     *
     * @param distance The maximum number of nodes to search
     */
    public void setMaxSearchDistance(int distance) {
        // We would need to update the AStar instance or create a new one
        // This would require modifying the AStar class to allow changing the max distance
    }

    /**
     * Set whether diagonal movement is allowed
     *
     * @param allowDiagonal true to allow diagonal movement, false otherwise
     */
    public void setAllowDiagonal(boolean allowDiagonal) {
        // We would need to update the AStar instance or create a new one
        // This would require modifying the AStar class to allow changing this setting
    }

    /**
     * Import a Tile class for local use
     * This is just a placeholder for compilation
     */
    private static class Tile {
        public boolean isWalkable() {
            return true;
        }

        public Object getMaterial() {
            return null;
        }
    }
}