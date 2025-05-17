package game.navigation;

import game.world.Tile;
import game.world.World;

import java.util.*;

/**
 * Implementation of A* pathfinding algorithm for entity navigation
 */
public class AStar {
    private final World world;
    private final int maxSearchDistance;
    private final boolean allowDiagonal;

    // Open and closed lists for A* algorithm
    private final PriorityQueue<Node> openList;
    private final Set<Node> closedList;

    // Maps for tracking nodes and their costs
    private final Map<String, Node> allNodes;

    /**
     * Creates a new A* pathfinder
     *
     * @param world The game world to navigate through
     * @param maxSearchDistance Maximum number of nodes to search before giving up
     * @param allowDiagonal Whether diagonal movement is allowed
     */
    public AStar(World world, int maxSearchDistance, boolean allowDiagonal) {
        this.world = world;
        this.maxSearchDistance = maxSearchDistance;
        this.allowDiagonal = allowDiagonal;

        // Use a priority queue for the open list to always get the best node first
        this.openList = new PriorityQueue<>(Comparator.comparingDouble(Node::getFCost));
        this.closedList = new HashSet<>();
        this.allNodes = new HashMap<>();
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
        // Clear any previous search data
        openList.clear();
        closedList.clear();
        allNodes.clear();

        // Check if the start and target are the same
        if (isPositionEqual(start, target)) {
            Path path = new Path();
            path.addWaypoint(new Position(target.getX(), target.getY(), target.getZ()));
            path.setComplete(true);
            return path;
        }

        // Check if the target is even reachable
        if (!isWalkable(target, constraints)) {
            return null;
        }

        // Initialize the starting node
        Node startNode = getNode((int)start.getX(), (int)start.getY(), (int)start.getZ());
        Node targetNode = getNode((int)target.getX(), (int)target.getY(), (int)target.getZ());

        startNode.setG(0);
        startNode.setH(calculateHeuristic(startNode, targetNode));
        startNode.updateF();

        // Add the start node to the open list
        openList.add(startNode);

        int searchCount = 0;

        // Main A* loop
        while (!openList.isEmpty() && searchCount < maxSearchDistance) {
            // Get the node with the lowest F cost from the open list
            Node current = openList.poll();

            // If we've reached the target, construct and return the path
            if (current.equals(targetNode)) {
                return constructPath(current);
            }

            // Move current node from open to closed list
            closedList.add(current);

            // Check all neighbors
            List<Node> neighbors = getNeighbors(current, constraints);
            for (Node neighbor : neighbors) {
                // Skip if the neighbor is in the closed list
                if (closedList.contains(neighbor)) {
                    continue;
                }

                // Calculate the new G cost
                double newG = current.getG() + getMovementCost(current, neighbor, constraints);

                // If this path to the neighbor is better or the neighbor isn't in the open list
                if (newG < neighbor.getG() || !openList.contains(neighbor)) {
                    neighbor.setG(newG);
                    neighbor.setH(calculateHeuristic(neighbor, targetNode));
                    neighbor.updateF();
                    neighbor.setParent(current);

                    if (!openList.contains(neighbor)) {
                        openList.add(neighbor);
                    } else {
                        // Update the neighbor in the open list
                        // (PriorityQueue doesn't automatically re-sort when elements change)
                        openList.remove(neighbor);
                        openList.add(neighbor);
                    }
                }
            }

            searchCount++;
        }

        // No path found
        return null;
    }

    /**
     * Construct a path by following parent pointers from target to start
     */
    private Path constructPath(Node target) {
        Path path = new Path();
        Node current = target;

        // Follow the chain of parents back to the start
        // The path will be in reverse order, from target to start
        Stack<Position> positions = new Stack<>();

        while (current != null) {
            positions.push(new Position(current.getX(), current.getY(), current.getZ()));
            current = current.getParent();
        }

        // Reverse the path so it goes from start to target
        while (!positions.isEmpty()) {
            path.addWaypoint(positions.pop());
        }

        path.setComplete(true);
        return path;
    }

    /**
     * Calculate the heuristic (estimated distance) between two nodes
     */
    private double calculateHeuristic(Node from, Node to) {
        // Manhattan distance for 4-directional movement
        if (!allowDiagonal) {
            return Math.abs(from.getX() - to.getX()) +
                    Math.abs(from.getY() - to.getY()) +
                    Math.abs(from.getZ() - to.getZ()) * 10; // Z-level changes are costly
        }

        // Euclidean distance for 8-directional movement
        double dx = from.getX() - to.getX();
        double dy = from.getY() - to.getY();
        double dz = (from.getZ() - to.getZ()) * 10; // Z-level changes are costly

        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    /**
     * Get or create a node at the specified coordinates
     */
    private Node getNode(int x, int y, int z) {
        String key = x + "," + y + "," + z;
        if (!allNodes.containsKey(key)) {
            allNodes.put(key, new Node(x, y, z));
        }
        return allNodes.get(key);
    }

    /**
     * Get all valid neighbors for a node
     */
    private List<Node> getNeighbors(Node node, PathfindingConstraints constraints) {
        List<Node> neighbors = new ArrayList<>();
        int x = node.getX();
        int y = node.getY();
        int z = node.getZ();

        // Orthogonal neighbors (N, S, E, W)
        checkAndAddNeighbor(neighbors, x, y-1, z, constraints); // North
        checkAndAddNeighbor(neighbors, x+1, y, z, constraints); // East
        checkAndAddNeighbor(neighbors, x, y+1, z, constraints); // South
        checkAndAddNeighbor(neighbors, x-1, y, z, constraints); // West

        // Diagonal neighbors (NE, SE, SW, NW)
        if (allowDiagonal) {
            // Only allow diagonal movement if the adjacent orthogonal tiles are walkable
            // (to prevent cutting corners)
            boolean n = isWalkable(new Position(x, y-1, z), constraints);
            boolean e = isWalkable(new Position(x+1, y, z), constraints);
            boolean s = isWalkable(new Position(x, y+1, z), constraints);
            boolean w = isWalkable(new Position(x-1, y, z), constraints);

            if (n && e) checkAndAddNeighbor(neighbors, x+1, y-1, z, constraints); // NE
            if (e && s) checkAndAddNeighbor(neighbors, x+1, y+1, z, constraints); // SE
            if (s && w) checkAndAddNeighbor(neighbors, x-1, y+1, z, constraints); // SW
            if (w && n) checkAndAddNeighbor(neighbors, x-1, y-1, z, constraints); // NW
        }

        // Z-level movement (stairs, ramps, etc.)
        // These would be added based on tile properties
        if (constraints.canUseStairs()) {
            // Check for stairs up
            if (hasStairsUp(x, y, z)) {
                checkAndAddNeighbor(neighbors, x, y, z+1, constraints);
            }

            // Check for stairs down
            if (hasStairsDown(x, y, z)) {
                checkAndAddNeighbor(neighbors, x, y, z-1, constraints);
            }
        }

        return neighbors;
    }

    /**
     * Check if a position has stairs going up
     */
    private boolean hasStairsUp(int x, int y, int z) {
        Tile tile = world.getTileAt(x, y, z);
        // You would need to implement this based on your Tile class
        // For example, check if the tile type is STAIRS_UP
        return false; // Placeholder
    }

    /**
     * Check if a position has stairs going down
     */
    private boolean hasStairsDown(int x, int y, int z) {
        Tile tile = world.getTileAt(x, y, z);
        // You would need to implement this based on your Tile class
        // For example, check if the tile type is STAIRS_DOWN
        return false; // Placeholder
    }

    /**
     * Check if a position is walkable and add it to the neighbor list if so
     */
    private void checkAndAddNeighbor(List<Node> neighbors, int x, int y, int z, PathfindingConstraints constraints) {
        Position pos = new Position(x, y, z);
        if (isWalkable(pos, constraints)) {
            neighbors.add(getNode(x, y, z));
        }
    }

    /**
     * Check if a position is walkable
     */
    private boolean isWalkable(Position pos, PathfindingConstraints constraints) {
        Tile tile = world.getTileAt((int)pos.getX(), (int)pos.getY(), (int)pos.getZ());

        // If no tile exists at this position, it's not walkable
        if (tile == null) {
            return false;
        }

        // Check if the tile is walkable based on its properties
        if (!tile.isWalkable()) {
            return false;
        }

        // Apply constraints
        if (constraints != null) {
            // Check if the entity can swim when the tile is water
            if (tile.getMaterial() == core.engine.tiles.TileMaterial.WATER && !constraints.canSwim()) {
                return false;
            }

            // Check if the entity can fly when the tile is open air
            if (!tile.isExcavated() && !constraints.canFly()) {
                return false;
            }

            // Add more constraint checks as needed
        }

        return true;
    }

    /**
     * Get the cost of moving from one node to another
     */
    private double getMovementCost(Node from, Node to, PathfindingConstraints constraints) {
        // Basic cost for orthogonal movement
        double cost = 1.0;

        // Diagonal movement costs more
        if (from.getX() != to.getX() && from.getY() != to.getY()) {
            cost = 1.414; // sqrt(2)
        }

        // Z-level changes cost more
        if (from.getZ() != to.getZ()) {
            cost += 5.0;
        }

        // Apply terrain-based costs
        Tile fromTile = world.getTileAt(from.getX(), from.getY(), from.getZ());
        Tile toTile = world.getTileAt(to.getX(), to.getY(), to.getZ());

        // Different materials have different movement costs
        if (toTile != null) {
            if (toTile.getMaterial() == core.engine.tiles.TileMaterial.WATER) {
                if (constraints.canSwim()) {
                    cost *= 2.0; // Swimming is slower
                } else {
                    cost *= 10.0; // Very difficult if can't swim
                }
            }

            // Add more material-based costs as needed
        }

        return cost;
    }

    /**
     * Check if two positions are at the same location
     */
    private boolean isPositionEqual(Position a, Position b) {
        return (int)a.getX() == (int)b.getX() &&
                (int)a.getY() == (int)b.getY() &&
                (int)a.getZ() == (int)b.getZ();
    }
}