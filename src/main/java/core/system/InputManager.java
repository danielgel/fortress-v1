package core.system;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import game.GameEngine;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

public class InputManager {

    private final Map<Integer, InputConsumer> keyHandlers = new HashMap<>();


    public InputManager registerEvent(int key, Consumer<InputManager.InputEvent> handler) {
        InputConsumer consumer = new InputConsumer();
        consumer.handler = handler;
        consumer.options = new InputOptions();
        keyHandlers.put(key, consumer);
        return this;
    }

    public InputManager registerEvent(int key, InputOptions options, Consumer<InputManager.InputEvent> handler) {
        InputConsumer consumer = new InputConsumer();
        consumer.handler = handler;
        consumer.options = options;
        keyHandlers.put(key, consumer);
        return this;
    }

    public void removeEvent(int key) {
        keyHandlers.remove(key);
    }

    public void removeAllEvents(int[] key) {
        Arrays.stream(key).forEach(keyHandlers::remove);
    }


    public void handleInput() {
        keyHandlers.forEach((key, value) -> {
            InputEvent inputEvent = new InputEvent(key, false);

            if (value.options.isSingleShot() && Gdx.input.isKeyJustPressed(key)) {
                inputEvent.isSingleShot = true;
                value.handler.accept(inputEvent);
                return;
            }
            if (!value.options.isSingleShot() && Gdx.input.isKeyPressed(key)) {
                inputEvent.isSingleShot = false;
                value.handler.accept(inputEvent);
                return;
            }
        });
    }


    public static class InputEvent {
        private final int keyCode;
        private final String keyString;
        private final long timestamp;
        private final boolean isSpecialKey;
        private boolean isSingleShot = false;

        public InputEvent(int keyCode, boolean isSpecialKey) {
            this.keyCode = keyCode;
            this.keyString = keyCodeToString(keyCode);
            this.isSpecialKey = isSpecialKey;
//            this.isSingleShot = isSingleShot;
            this.timestamp = System.currentTimeMillis();
        }

        public int getKeyCode() {
            return keyCode;
        }

        public String getKey() {
            return keyString;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public boolean isSpecialKey() {
            return isSpecialKey;
        }

        public boolean isSingleShot() {
            return isSingleShot;
        }

        @Override
        public String toString() {
            if (isSpecialKey) {
                return "SpecialKey: " + keyCodeToString(keyCode);
            } else {
                return "Key: '" + keyString + "' (code: " + keyCode + ")";
            }
        }

        private String keyCodeToString(int code) {
            switch (code) {
                case InputManagerExampleClass.Keys.UP:
                    return "UP";
                case InputManagerExampleClass.Keys.DOWN:
                    return "DOWN";
                case InputManagerExampleClass.Keys.LEFT:
                    return "LEFT";
                case InputManagerExampleClass.Keys.RIGHT:
                    return "RIGHT";
                case InputManagerExampleClass.Keys.F1:
                    return "F1";
                case InputManagerExampleClass.Keys.F2:
                    return "F2";
                case InputManagerExampleClass.Keys.F3:
                    return "F3";
                case InputManagerExampleClass.Keys.F4:
                    return "F4";
                case InputManagerExampleClass.Keys.F5:
                    return "F5";
                case InputManagerExampleClass.Keys.F6:
                    return "F6";
                case InputManagerExampleClass.Keys.F7:
                    return "F7";
                case InputManagerExampleClass.Keys.F8:
                    return "F8";
                case InputManagerExampleClass.Keys.F9:
                    return "F9";
                case InputManagerExampleClass.Keys.F10:
                    return "F10";
                case InputManagerExampleClass.Keys.PAGE_UP:
                    return "PAGE_UP";
                case InputManagerExampleClass.Keys.PAGE_DOWN:
                    return "PAGE_DOWN";
                case InputManagerExampleClass.Keys.HOME:
                    return "HOME";
                case InputManagerExampleClass.Keys.END:
                    return "END";
                case InputManagerExampleClass.Keys.INSERT:
                    return "INSERT";
                case InputManagerExampleClass.Keys.DELETE:
                    return "DELETE";
                default:
                    return "UNKNOWN(" + code + ")";
            }
        }
    }

    private static class InputConsumer {

        public InputOptions options;
        public Consumer<InputManager.InputEvent> handler;
    }
}
