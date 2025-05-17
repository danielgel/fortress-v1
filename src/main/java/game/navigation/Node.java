package game.navigation;


/**
 * Represents a node in the A* pathfinding grid
 */
public class Node {
    private final int x;
    private final int y;
    private final int z;

    private double g; // Cost from start to this node
    private double h; // Heuristic cost from this node to target
    private double f; // Total cost (g + h)

    private Node parent; // Parent node for path reconstruction

    /**
     * Creates a new node at the specified coordinates
     */
    public Node(int x, int y, int z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.g = Double.MAX_VALUE; // Initialize with "infinity"
        this.h = 0;
        this.f = Double.MAX_VALUE;
        this.parent = null;
    }

    /**
     * Update the F cost based on G and H
     */
    public void updateF() {
        this.f = this.g + this.h;
    }

    // Getters and setters

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public int getZ() {
        return z;
    }

    public double getG() {
        return g;
    }

    public void setG(double g) {
        this.g = g;
    }

    public double getH() {
        return h;
    }

    public void setH(double h) {
        this.h = h;
    }

    public double getFCost() {
        return f;
    }

    public Node getParent() {
        return parent;
    }

    public void setParent(Node parent) {
        this.parent = parent;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Node node = (Node) o;

        if (x != node.x) return false;
        if (y != node.y) return false;
        return z == node.z;
    }

    @Override
    public int hashCode() {
        int result = x;
        result = 31 * result + y;
        result = 31 * result + z;
        return result;
    }

    @Override
    public String toString() {
        return "Node{" +
                "x=" + x +
                ", y=" + y +
                ", z=" + z +
                ", f=" + f +
                '}';
    }
}