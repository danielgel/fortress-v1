package entities;

import core.time.TimeTickListener;

public class GameEntity implements TimeTickListener {
        private final String name;
        private double x, y;
        private double velocityX, velocityY;

        public GameEntity(String name, double x, double y) {
            this.name = name;
            this.x = x;
            this.y = y;
        }

        public void setVelocity(double velocityX, double velocityY) {
            this.velocityX = velocityX;
            this.velocityY = velocityY;
        }

        @Override
        public void onTimeTick(long deltaTime) {
            // Convert deltaTime from milliseconds to seconds for physics calculations
            double deltaSeconds = deltaTime / 1000.0;

            // Update position based on velocity and elapsed time
            x += velocityX * deltaSeconds;
            y += velocityY * deltaSeconds;

            System.out.println(name + " position updated to: (" + x + ", " + y + ")");
        }
    }
