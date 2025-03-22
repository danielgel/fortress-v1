package core.engine.display;

public class RenderManager {
//    private TileRenderer tileRenderer;
//    private EntityRenderer entityRenderer;
//    private UIRenderer uiRenderer;
//    private Camera camera;

    public void render() {
        // Render the currently visible portion of the world
        renderTerrain();
        renderEntities();
        renderUI();
    }

    private void renderTerrain() {
        // Render visible tiles
    }

    private void renderEntities() {
        // Render visible entities
    }

    private void renderUI() {
        // Render user interface
    }
}