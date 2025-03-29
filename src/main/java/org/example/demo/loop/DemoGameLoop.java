package org.example.demo.loop;

import core.engine.display.TerminalRenderer;
import core.time.TimeTickManager;

import java.io.IOException;

public class DemoGameLoop {
    public static void main(String[] args) throws IOException {
        TimeTickManager timeTickManager = new TimeTickManager(1000);
        TerminalRenderer renderer = new TerminalRenderer(80, 25);
    }
}
