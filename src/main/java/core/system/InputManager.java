package core.system;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.function.Consumer;

/**
 * Input manager for terminal-based ASCII games.
 * Handles keyboard input in raw mode for immediate key detection.
 */
public class InputManager implements Runnable {
    // Queue to store input events
    private final Queue<InputEvent> eventQueue = new ConcurrentLinkedQueue<>();

    // Flag to control the input thread
    private volatile boolean running = false;

    // Thread for non-blocking input handling
    private Thread inputThread;

    // Input handlers mapped to specific keys
    private final Map<Integer, Consumer<InputEvent>> keyHandlers = new HashMap<>();

    // Mapping of common key names to their ANSI/ASCII codes
    public static final class Keys {
        // Control keys
        public static final int ESC = 27;
        public static final int ENTER = 13;
        public static final int SPACE = 32;
        public static final int BACKSPACE = 127;
        public static final int TAB = 9;

        // Arrow keys (these are multi-byte sequences in ANSI terminals)
        // We'll represent them as negative values for simplicity
        public static final int UP = -1;
        public static final int DOWN = -2;
        public static final int LEFT = -3;
        public static final int RIGHT = -4;

        // Function keys
        public static final int F1 = -5;
        public static final int F2 = -6;
        public static final int F3 = -7;
        public static final int F4 = -8;
        public static final int F5 = -9;
        public static final int F6 = -10;
        public static final int F7 = -11;
        public static final int F8 = -12;
        public static final int F9 = -13;
        public static final int F10 = -14;

        // Page navigation
        public static final int PAGE_UP = -15;
        public static final int PAGE_DOWN = -16;
        public static final int HOME = -17;
        public static final int END = -18;
        public static final int INSERT = -19;
        public static final int DELETE = -20;
    }

    /**
     * Represents an input event
     */
    public static class InputEvent {
        private final int keyCode;
        private final char keyChar;
        private final long timestamp;
        private final boolean isSpecialKey;

        public InputEvent(int keyCode, char keyChar, boolean isSpecialKey) {
            this.keyCode = keyCode;
            this.keyChar = keyChar;
            this.timestamp = System.currentTimeMillis();
            this.isSpecialKey = isSpecialKey;
        }

        public int getKeyCode() {
            return keyCode;
        }

        public char getKeyChar() {
            return keyChar;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public boolean isSpecialKey() {
            return isSpecialKey;
        }

        @Override
        public String toString() {
            if (isSpecialKey) {
                return "SpecialKey: " + keyCodeToString(keyCode);
            } else {
                return "Key: '" + keyChar + "' (code: " + keyCode + ")";
            }
        }

        private String keyCodeToString(int code) {
            switch (code) {
                case Keys.UP: return "UP";
                case Keys.DOWN: return "DOWN";
                case Keys.LEFT: return "LEFT";
                case Keys.RIGHT: return "RIGHT";
                case Keys.F1: return "F1";
                case Keys.F2: return "F2";
                case Keys.F3: return "F3";
                case Keys.F4: return "F4";
                case Keys.F5: return "F5";
                case Keys.F6: return "F6";
                case Keys.F7: return "F7";
                case Keys.F8: return "F8";
                case Keys.F9: return "F9";
                case Keys.F10: return "F10";
                case Keys.PAGE_UP: return "PAGE_UP";
                case Keys.PAGE_DOWN: return "PAGE_DOWN";
                case Keys.HOME: return "HOME";
                case Keys.END: return "END";
                case Keys.INSERT: return "INSERT";
                case Keys.DELETE: return "DELETE";
                default: return "UNKNOWN(" + code + ")";
            }
        }
    }

    /**
     * Initialize the input manager
     */
    public void initialize() {
        try {
            // Set terminal to raw mode (no echo, no buffering)
            // This uses stty command to configure the terminal
            String[] cmd = {"/bin/sh", "-c", "stty raw -echo </dev/tty"};
            Runtime.getRuntime().exec(cmd).waitFor();

            // Register a shutdown hook to restore terminal settings
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    String[] restoreCmd = {"/bin/sh", "-c", "stty sane </dev/tty"};
                    Runtime.getRuntime().exec(restoreCmd).waitFor();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }));

        } catch (Exception e) {
            System.err.println("Failed to initialize terminal for raw input: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Start the input processing thread
     */
    public void start() {
        if (inputThread != null && inputThread.isAlive()) {
            return;
        }

        running = true;
        inputThread = new Thread(this);
        inputThread.setDaemon(true);
        inputThread.start();
    }

    /**
     * Stop the input processing thread
     */
    public void stop() {
        running = false;
        if (inputThread != null) {
            inputThread.interrupt();
        }
    }

    /**
     * Register a handler for a specific key
     */
    public void registerKeyHandler(int keyCode, Consumer<InputEvent> handler) {
        keyHandlers.put(keyCode, handler);
    }

    /**
     * Remove a handler for a specific key
     */
    public void unregisterKeyHandler(int keyCode) {
        keyHandlers.remove(keyCode);
    }

    /**
     * Get the next input event from the queue (non-blocking)
     */
    public InputEvent pollEvent() {
        return eventQueue.poll();
    }

    /**
     * Check if there are pending input events
     */
    public boolean hasEvents() {
        return !eventQueue.isEmpty();
    }

    /**
     * Background thread that reads input
     */
    @Override
    public void run() {
        try {
            while (running) {
                if (System.in.available() > 0) {
                    processInput();
                } else {
                    // Sleep to avoid 100% CPU usage
                    Thread.sleep(10);
                }
            }
        } catch (Exception e) {
            if (running) {
                System.err.println("Error in input thread: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    /**
     * Process available input
     */
    private void processInput() throws IOException {
        int firstByte = System.in.read();

        // Check for escape sequences (special keys start with ESC)
        if (firstByte == Keys.ESC) {
            // ESC key alone or beginning of escape sequence
            if (System.in.available() == 0) {
                // Just ESC key
                addInputEvent(new InputEvent(Keys.ESC, (char) Keys.ESC, false));
            } else {
                // Handle escape sequences for special keys
                processEscapeSequence();
            }
        } else {
            // Regular key
            addInputEvent(new InputEvent(firstByte, (char) firstByte, false));
        }
    }

    /**
     * Process ANSI escape sequences for special keys
     */
    private void processEscapeSequence() throws IOException {
        // Most ANSI escape sequences start with ESC [
        if (System.in.read() == '[') {
            int nextByte = System.in.read();

            switch (nextByte) {
                case 'A': // Up arrow
                    addInputEvent(new InputEvent(Keys.UP, '\0', true));
                    break;
                case 'B': // Down arrow
                    addInputEvent(new InputEvent(Keys.DOWN, '\0', true));
                    break;
                case 'C': // Right arrow
                    addInputEvent(new InputEvent(Keys.RIGHT, '\0', true));
                    break;
                case 'D': // Left arrow
                    addInputEvent(new InputEvent(Keys.LEFT, '\0', true));
                    break;
                case '5': // Page Up (needs to consume a trailing ~)
                    System.in.read(); // Consume the trailing ~
                    addInputEvent(new InputEvent(Keys.PAGE_UP, '\0', true));
                    break;
                case '6': // Page Down (needs to consume a trailing ~)
                    System.in.read(); // Consume the trailing ~
                    addInputEvent(new InputEvent(Keys.PAGE_DOWN, '\0', true));
                    break;
                case '1': // Home or F1-F4
                    nextByte = System.in.read();
                    if (nextByte == '~') {
                        addInputEvent(new InputEvent(Keys.HOME, '\0', true));
                    } else if (nextByte >= '1' && nextByte <= '4') {
                        System.in.read(); // Consume the trailing ~
                        addInputEvent(new InputEvent(Keys.F1 - 1 + (nextByte - '0'), '\0', true));
                    }
                    break;
                case '4': // End
                    System.in.read(); // Consume the trailing ~
                    addInputEvent(new InputEvent(Keys.END, '\0', true));
                    break;
                case '2': // Insert
                    System.in.read(); // Consume the trailing ~
                    addInputEvent(new InputEvent(Keys.INSERT, '\0', true));
                    break;
                case '3': // Delete
                    System.in.read(); // Consume the trailing ~
                    addInputEvent(new InputEvent(Keys.DELETE, '\0', true));
                    break;
                default:
                    // Other escape sequences
                    break;
            }
        } else {
            // Other escape sequences (ALT combinations, etc.)
        }
    }

    /**
     * Add an input event to the queue and trigger handlers
     */
    private void addInputEvent(InputEvent event) {
        eventQueue.add(event);

        // Trigger any registered handlers
        Consumer<InputEvent> handler = keyHandlers.get(event.getKeyCode());
        if (handler != null) {
            handler.accept(event);
        }
    }

    /**
     * Clean up resources
     */
    public void shutdown() {
        stop();
        try {
            // Restore terminal settings
            String[] cmd = {"/bin/sh", "-c", "stty sane </dev/tty"};
            Runtime.getRuntime().exec(cmd).waitFor();
        } catch (Exception e) {
            System.err.println("Failed to restore terminal settings: " + e.getMessage());
        }
    }
}
