package game.navigation;

/**
 * Constraints for pathfinding based on entity capabilities
 * This class defines movement restrictions for different entity types
 */
public class PathfindingConstraints {
    private boolean canFly;
    private boolean canSwim;
    private boolean canClimb;
    private boolean canDigThrough;
    private boolean canOpenDoors;
    private boolean canUseStairs;
    private double maxWaterDepth;
    private double maxSlopeAngle;
    private double maxJumpHeight;
    private double maxFallHeight;

    /**
     * Creates a default set of constraints (walking only)
     */
    public PathfindingConstraints() {
        this.canFly = false;
        this.canSwim = false;
        this.canClimb = false;
        this.canDigThrough = false;
        this.canOpenDoors = true;
        this.canUseStairs = true;
        this.maxWaterDepth = 0.0;
        this.maxSlopeAngle = 30.0;
        this.maxJumpHeight = 1.0;
        this.maxFallHeight = 3.0;
    }

    /**
     * Creates a custom set of constraints
     */
    public PathfindingConstraints(boolean canFly, boolean canSwim, boolean canClimb,
                                  boolean canDigThrough, boolean canOpenDoors, boolean canUseStairs) {
        this.canFly = canFly;
        this.canSwim = canSwim;
        this.canClimb = canClimb;
        this.canDigThrough = canDigThrough;
        this.canOpenDoors = canOpenDoors;
        this.canUseStairs = canUseStairs;

        // Set default values for numeric constraints
        this.maxWaterDepth = canSwim ? Double.MAX_VALUE : 0.0;
        this.maxSlopeAngle = canClimb ? 75.0 : 30.0;
        this.maxJumpHeight = canFly ? Double.MAX_VALUE : 1.0;
        this.maxFallHeight = canFly ? 0.0 : 3.0;
    }

    // Getters and setters

    public boolean canFly() {
        return canFly;
    }

    public PathfindingConstraints setCanFly(boolean canFly) {
        this.canFly = canFly;
        return this;
    }

    public boolean canSwim() {
        return canSwim;
    }

    public PathfindingConstraints setCanSwim(boolean canSwim) {
        this.canSwim = canSwim;
        return this;
    }

    public boolean canClimb() {
        return canClimb;
    }

    public PathfindingConstraints setCanClimb(boolean canClimb) {
        this.canClimb = canClimb;
        return this;
    }

    public boolean canDigThrough() {
        return canDigThrough;
    }

    public PathfindingConstraints setCanDigThrough(boolean canDigThrough) {
        this.canDigThrough = canDigThrough;
        return this;
    }

    public boolean canOpenDoors() {
        return canOpenDoors;
    }

    public PathfindingConstraints setCanOpenDoors(boolean canOpenDoors) {
        this.canOpenDoors = canOpenDoors;
        return this;
    }

    public boolean canUseStairs() {
        return canUseStairs;
    }

    public PathfindingConstraints setCanUseStairs(boolean canUseStairs) {
        this.canUseStairs = canUseStairs;
        return this;
    }

    public double getMaxWaterDepth() {
        return maxWaterDepth;
    }

    public PathfindingConstraints setMaxWaterDepth(double maxWaterDepth) {
        this.maxWaterDepth = maxWaterDepth;
        return this;
    }

    public double getMaxSlopeAngle() {
        return maxSlopeAngle;
    }

    public PathfindingConstraints setMaxSlopeAngle(double maxSlopeAngle) {
        this.maxSlopeAngle = maxSlopeAngle;
        return this;
    }

    public double getMaxJumpHeight() {
        return maxJumpHeight;
    }

    public PathfindingConstraints setMaxJumpHeight(double maxJumpHeight) {
        this.maxJumpHeight = maxJumpHeight;
        return this;
    }

    public double getMaxFallHeight() {
        return maxFallHeight;
    }

    public PathfindingConstraints setMaxFallHeight(double maxFallHeight) {
        this.maxFallHeight = maxFallHeight;
        return this;
    }

    /**
     * Creates constraints for a flying entity
     */
    public static PathfindingConstraints forFlying() {
        return new PathfindingConstraints(true, false, false, false, true, true);
    }

    /**
     * Creates constraints for a swimming entity
     */
    public static PathfindingConstraints forSwimming() {
        return new PathfindingConstraints(false, true, false, false, true, true);
    }

    /**
     * Creates constraints for a climbing entity
     */
    public static PathfindingConstraints forClimbing() {
        return new PathfindingConstraints(false, false, true, false, true, true);
    }

    /**
     * Creates constraints for a digging entity
     */
    public static PathfindingConstraints forDigging() {
        return new PathfindingConstraints(false, false, false, true, true, true);
    }

    /**
     * Creates constraints for a ghost-like entity (can pass through everything)
     */
    public static PathfindingConstraints forGhost() {
        return new PathfindingConstraints(true, true, true, true, true, true);
    }
}