package game.ui;

import java.util.*;
import java.util.function.Supplier;

public class UiBuffer {

    private final List<UiSupplier> buffer;
    private final Map<UUID, Integer> itemsMap;


    private Supplier<String> emptySupplier = () -> "";

    public UiBuffer() {
        buffer = new ArrayList<>();
        itemsMap = new HashMap<>();
    }

    public List<UiSupplier> getBuffer() {
        return buffer;
    }

    public void remove(UUID id) {
        int index = itemsMap.get(id);
        buffer.remove(index);
    }

    public UUID addToBuffer(Supplier<String> stringSupplier) {
        UUID id = UUID.randomUUID();
        buffer.add(new UiSupplier(stringSupplier, emptySupplier, emptySupplier));
        itemsMap.put(id, buffer.size() - 1);
        return id;
    }

    public UUID addToBuffer(Supplier<String> stringSupplier, Supplier<String> foreground, Supplier<String> background) {
        UUID id = UUID.randomUUID();
        buffer.add(new UiSupplier(stringSupplier, foreground, background));
        itemsMap.put(id, buffer.size() - 1);
        return id;
    }

}
