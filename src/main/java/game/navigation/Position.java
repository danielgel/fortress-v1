package game.navigation;

public class Position {
    private double x = 0;
    private double y = 0;
    private double z = 0;


    public static Position from(Position pos) {
        return new Position(pos.getX(), pos.getY(), pos.getZ());
    }

    public String toString() {
        return "Position (x:" + x + " y:" + y + " z:" + z + ")";
    }

    public Position() {
    }

    public Position(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public Position(double x, double y, double z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public double getX() {
        return x;
    }

    public Position setX(double x) {
        this.x = x;
        return this;
    }

    public double getY() {
        return y;
    }

    public Position setY(double y) {
        this.y = y;
        return this;
    }

    public double getZ() {
        return z;
    }

    public void setZ(double z) {
        this.z = z;
    }
}