package game.navigation.debug;

import core.engine.display.LibGDXRenderer;
import game.navigation.Node;
import game.navigation.Position;
import game.world.Tile;
import game.world.World;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * A visualization tool for the A* pathfinding algorithm
 * This class renders the A* search process step by step
 */
public class PathfindingVisualizer {
    private LibGDXRenderer renderer;
    private World world;
    private int viewportX, viewportY;
    private int viewportWidth, viewportHeight;

    // Visualization state
    private Map<String, NodeVisualization> visualNodeMap;
    private Position startPosition;
    private Position targetPosition;

    /**
     * Creates a new pathfinding visualizer
     *
     * @param renderer The terminal renderer to use
     * @param world The world to visualize
     */
    public PathfindingVisualizer(LibGDXRenderer renderer, World world) {
        this.renderer = renderer;
        this.world = world;
        this.visualNodeMap = new HashMap<>();

        // Set the viewport to the whole screen
        this.viewportX = 0;
        this.viewportY = 0;
        this.viewportWidth = 80; // Default width
        this.viewportHeight = 25; // Default height
    }

    /**
     * Set the viewport for visualization
     *
     * @param x The x coordinate of the top-left corner
     * @param y The y coordinate of the top-left corner
     * @param width The width of the viewport
     * @param height The height of the viewport
     */
    public void setViewport(int x, int y, int width, int height) {
        this.viewportX = x;
        this.viewportY = y;
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    /**
     * Set the start and target positions for visualization
     *
     * @param start The start position
     * @param target The target position
     */
    public void setPositions(Position start, Position target) {
        this.startPosition = start;
        this.targetPosition = target;
    }

    /**
     * Reset the visualization
     */
    public void reset() {
        visualNodeMap.clear();
    }

    /**
     * Update the visualization with the current state of the A* search
     *
     * @param openSet The set of nodes in the open list
     * @param closedSet The set of nodes in the closed list
     * @param currentNode The current node being processed
     */
    public void updateVisualization(Set<Node> openSet, Set<Node> closedSet, Node currentNode) {
        // Clear previous state
        visualNodeMap.clear();

        // Add all nodes from the open and closed sets
        for (Node node : openSet) {
            String key = node.getX() + "," + node.getY() + "," + node.getZ();
            visualNodeMap.put(key, new NodeVisualization(node, NodeState.OPEN));
        }

        for (Node node : closedSet) {
            String key = node.getX() + "," + node.getY() + "," + node.getZ();
            visualNodeMap.put(key, new NodeVisualization(node, NodeState.CLOSED));
        }

        // Mark the current node
        if (currentNode != null) {
            String key = currentNode.getX() + "," + currentNode.getY() + "," + currentNode.getZ();
            visualNodeMap.put(key, new NodeVisualization(currentNode, NodeState.CURRENT));
        }

        // Highlight the path from current node back to start
        if (currentNode != null) {
            Node pathNode = currentNode;
            while (pathNode.getParent() != null) {
                String key = pathNode.getX() + "," + pathNode.getY() + "," + pathNode.getZ();
                visualNodeMap.put(key, new NodeVisualization(pathNode, NodeState.PATH));
                pathNode = pathNode.getParent();
            }
        }
    }

    /**
     * Render the current visualization state
     *
     * @param z The z-level to render
     */
    public void render(int z) throws IOException {
        // Draw the base world
        for (int y = 0; y < viewportHeight; y++) {
            for (int x = 0; x < viewportWidth; x++) {
                int worldX = x + viewportX;
                int worldY = y + viewportY;

                Tile tile = world.getTileAt(worldX, worldY, z);

                // Draw the tile
                if (tile != null) {
                    if (tile.isWalkable()) {
                        // Walkable tile
                        renderer.setTile(x, y, '.', "BRIGHT_BLACK", "BG_BLACK");
                    } else {
                        // Wall
                        renderer.setTile(x, y, '#', "WHITE", "BG_BLACK");
                    }
                }
            }
        }

        // Draw the visualization nodes
        for (Map.Entry<String, NodeVisualization> entry : visualNodeMap.entrySet()) {
            NodeVisualization visual = entry.getValue();
            Node node = visual.getNode();

            // Only draw nodes at the current z-level
            if (node.getZ() != z) {
                continue;
            }

            // Calculate screen coordinates
            int screenX = node.getX() - viewportX;
            int screenY = node.getY() - viewportY;

            // Skip if outside viewport
            if (screenX < 0 || screenX >= viewportWidth || screenY < 0 || screenY >= viewportHeight) {
                continue;
            }

            // Draw based on node state
            switch (visual.getState()) {
                case OPEN:
                    renderer.setTile(screenX, screenY, 'o', "BRIGHT_GREEN", "BG_BLACK");
                    break;
                case CLOSED:
                    renderer.setTile(screenX, screenY, 'x', "BRIGHT_RED", "BG_BLACK");
                    break;
                case CURRENT:
                    renderer.setTile(screenX, screenY, '@', "BRIGHT_YELLOW", "BG_BLACK");
                    break;
                case PATH:
                    renderer.setTile(screenX, screenY, '*', "BRIGHT_CYAN", "BG_BLACK");
                    break;
            }
        }

        // Draw start and target positions
        if (startPosition != null && startPosition.getZ() == z) {
            int screenX = (int)startPosition.getX() - viewportX;
            int screenY = (int)startPosition.getY() - viewportY;

            if (screenX >= 0 && screenX < viewportWidth && screenY >= 0 && screenY < viewportHeight) {
                renderer.setTile(screenX, screenY, 'S', "BRIGHT_BLUE", "BG_BLACK");
            }
        }

        if (targetPosition != null && targetPosition.getZ() == z) {
            int screenX = (int)targetPosition.getX() - viewportX;
            int screenY = (int)targetPosition.getY() - viewportY;

            if (screenX >= 0 && screenX < viewportWidth && screenY >= 0 && screenY < viewportHeight) {
                renderer.setTile(screenX, screenY, 'T', "BRIGHT_PURPLE", "BG_BLACK");
            }
        }

        // Draw legend
        drawLegend();
    }

    /**
     * Draw a legend explaining the visualization
     */
    private void drawLegend() {
        int legendX = viewportWidth - 20;
        int legendY = 1;

        renderer.drawBox(legendX, legendY, 18, 8, "Pathfinding Legend", "WHITE", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 2, "S - Start", "BRIGHT_BLUE", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 3, "T - Target", "BRIGHT_PURPLE", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 4, "o - Open Set", "BRIGHT_GREEN", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 5, "x - Closed Set", "BRIGHT_RED", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 6, "@ - Current Node", "BRIGHT_YELLOW", "BG_BLACK");
        renderer.drawString(legendX + 2, legendY + 7, "* - Path", "BRIGHT_CYAN", "BG_BLACK");
    }

    /**
     * States for node visualization
     */
    private enum NodeState {
        OPEN,   // In the open set
        CLOSED, // In the closed set
        CURRENT, // Currently being processed
        PATH    // Part of the current path
    }

    /**
     * Class to hold visualization state for a node
     */
    private static class NodeVisualization {
        private Node node;
        private NodeState state;

        public NodeVisualization(Node node, NodeState state) {
            this.node = node;
            this.state = state;
        }

        public Node getNode() {
            return node;
        }

        public NodeState getState() {
            return state;
        }
    }
}