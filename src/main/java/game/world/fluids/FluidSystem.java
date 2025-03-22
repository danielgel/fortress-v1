package game.world.fluids;

import core.time.TimeTickListener;
import game.navigation.Position;
import game.world.World;

import java.util.List;

public class FluidSystem implements TimeTickListener {
    private World world;
//    private List<FluidSource> activeSources;
    private List<Position> activeFluidTiles;

    @Override
    public void onTimeTick(long deltaTime) {
        simulateFluidFlow(deltaTime);
    }

    private void simulateFluidFlow(long deltaTime) {
        // Calculate flow between tiles
    }
}