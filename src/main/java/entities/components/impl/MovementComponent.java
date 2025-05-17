package entities.components.impl;


import entities.Entity;
import entities.components.Component;
import entities.components.ComponentType;
import game.navigation.Path;
import game.navigation.PathfindingConstraints;
import game.navigation.PathfindingSystem;
import game.navigation.Position;

/**
 * Component for entity movement and navigation
 */
public class MovementComponent extends Component {
    // Movement properties
    private double movementSpeed;
    private double maxMovementSpeed;
    private double turnRate;

    // Pathfinding
    private Path currentPath;
    private Position targetPosition;
    private PathfindingConstraints constraints;
    private boolean isMoving;
    private boolean hasReachedDestination;

    // Navigation state
    private double facing; // Direction facing in radians (0 = East, PI/2 = North, etc.)

    /**
     * Creates a new movement component
     *
     * @param owner The entity this component belongs to
     */
    public MovementComponent(Entity owner) {
        super(owner);
        this.movementSpeed = 1.0;
        this.maxMovementSpeed = 2.0;
        this.turnRate = Math.PI / 32; // about 5.6 degrees per tick
        this.isMoving = false;
        this.hasReachedDestination = true;
        this.constraints = new PathfindingConstraints(); // Default constraints
    }

    @Override
    public ComponentType getType() {
        return ComponentType.MOVEMENT;
    }

    /**
     * Updates the movement component
     *
     * @param deltaTime Time passed since last update in milliseconds
     */
    @Override
    public void update(long deltaTime) {
        if (!isMoving || currentPath == null) {
            return;
        }

        // Convert delta time to seconds for smooth movement
        double deltaSeconds = deltaTime / 1000.0;

        // Get the next waypoint from the path
        Position nextWaypoint = currentPath.getNextWaypoint();
        if (nextWaypoint == null) {
            // We've reached the end of the path
            stopMoving();
            hasReachedDestination = true;
            return;
        }

        // Get current position
        Position currentPosition = owner.getPosition();

        // Calculate direction to the next waypoint
        double dx = nextWaypoint.getX() - currentPosition.getX();
        double dy = nextWaypoint.getY() - currentPosition.getY();
        double distance = Math.sqrt(dx*dx + dy*dy);

        // Update facing direction
        updateFacingDirection(dx, dy, deltaSeconds);

        // If we're close enough to the waypoint, move to the next one
        if (distance < movementSpeed * deltaSeconds) {
            currentPath.advanceToNextWaypoint();
            // If we've reached the end of the path, stop moving
            if (currentPath.isPathComplete()) {
                stopMoving();
                hasReachedDestination = true;
            }
            return;
        }

        // Otherwise, move towards the waypoint
        double moveDistance = movementSpeed * deltaSeconds;
        double ratio = moveDistance / distance;

        // Calculate new position
        double newX = currentPosition.getX() + dx * ratio;
        double newY = currentPosition.getY() + dy * ratio;

        // Update entity position
        currentPosition.setX(newX);
        currentPosition.setY(newY);
    }

    /**
     * Update the facing direction of the entity
     */
    private void updateFacingDirection(double dx, double dy, double deltaSeconds) {
        // Calculate target angle
        double targetAngle = Math.atan2(dy, dx);

        // Normalize current angle to [-PI, PI]
        double currentAngle = facing;
        while (currentAngle < -Math.PI) currentAngle += 2 * Math.PI;
        while (currentAngle > Math.PI) currentAngle -= 2 * Math.PI;

        // Calculate the difference between angles
        double diff = targetAngle - currentAngle;

        // Normalize the difference to [-PI, PI]
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;

        // Calculate how much we can turn this frame
        double maxTurn = turnRate * deltaSeconds;

        // Apply the turn, limited by turnRate
        if (Math.abs(diff) <= maxTurn) {
            facing = targetAngle;
        } else if (diff > 0) {
            facing += maxTurn;
        } else {
            facing -= maxTurn;
        }

        // Normalize the facing angle
        while (facing < -Math.PI) facing += 2 * Math.PI;
        while (facing > Math.PI) facing -= 2 * Math.PI;
    }

    /**
     * Set a movement target for the entity
     *
     * @param target The target position
     * @param pathfindingSystem The pathfinding system to use
     * @return true if a path was found, false otherwise
     */
    public boolean moveTo(Position target, PathfindingSystem pathfindingSystem) {
        // Clear any existing path
        currentPath = null;
        targetPosition = target;
        hasReachedDestination = false;

        // Get the current position
        Position currentPosition = owner.getPosition();

        // Find a path to the target
        currentPath = pathfindingSystem.findPath(currentPosition, target, constraints);

        // If no path was found, return false
        if (currentPath == null) {
            hasReachedDestination = true;
            return false;
        }

        // Start moving
        isMoving = true;
        return true;
    }

    /**
     * Stop moving
     */
    public void stopMoving() {
        isMoving = false;
    }

    /**
     * Set the movement speed
     *
     * @param speed The new movement speed
     */
    public void setMovementSpeed(double speed) {
        this.movementSpeed = Math.min(speed, maxMovementSpeed);
    }

    /**
     * Set the maximum movement speed
     *
     * @param maxSpeed The new maximum movement speed
     */
    public void setMaxMovementSpeed(double maxSpeed) {
        this.maxMovementSpeed = maxSpeed;
        if (movementSpeed > maxMovementSpeed) {
            movementSpeed = maxMovementSpeed;
        }
    }

    /**
     * Set the turn rate
     *
     * @param rate The new turn rate in radians per tick
     */
    public void setTurnRate(double rate) {
        this.turnRate = rate;
    }

    /**
     * Set the pathfinding constraints for this entity
     *
     * @param constraints The new constraints
     */
    public void setPathfindingConstraints(PathfindingConstraints constraints) {
        this.constraints = constraints;
    }

    /**
     * Get the current path
     *
     * @return The current path
     */
    public Path getCurrentPath() {
        return currentPath;
    }

    /**
     * Get the target position
     *
     * @return The target position
     */
    public Position getTargetPosition() {
        return targetPosition;
    }

    /**
     * Check if the entity is currently moving
     *
     * @return true if the entity is moving, false otherwise
     */
    public boolean isMoving() {
        return isMoving;
    }

    /**
     * Check if the entity has reached its destination
     *
     * @return true if the entity has reached its destination, false otherwise
     */
    public boolean hasReachedDestination() {
        return hasReachedDestination;
    }

    /**
     * Get the current movement speed
     *
     * @return The current movement speed
     */
    public double getMovementSpeed() {
        return movementSpeed;
    }

    /**
     * Get the maximum movement speed
     *
     * @return The maximum movement speed
     */
    public double getMaxMovementSpeed() {
        return maxMovementSpeed;
    }

    /**
     * Get the current facing direction
     *
     * @return The facing direction in radians
     */
    public double getFacing() {
        return facing;
    }

    /**
     * Set the facing direction
     *
     * @param direction The new facing direction in radians
     */
    public void setFacing(double direction) {
        this.facing = direction;
    }

    /**
     * Get the pathfinding constraints
     *
     * @return The pathfinding constraints
     */
    public PathfindingConstraints getConstraints() {
        return constraints;
    }
}