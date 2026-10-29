/** Ticks per second at each speed setting (index = speed - 1). */
export const SPEED_TPS = [10, 20, 40, 100];

/** Turns real frame time into fixed simulation ticks. Replaces the old scheduler thread. */
export class TickClock {
  speed = 1;
  paused = false;
  private acc = 0;

  /** Runs `tick` the right number of times for `dtMs` of real time. Returns ticks run. */
  advance(dtMs: number, tick: () => void): number {
    if (this.paused) return 0;
    this.acc += Math.min(dtMs, 250) / 1000;
    const interval = 1 / SPEED_TPS[this.speed - 1];
    let n = 0;
    while (this.acc >= interval && n < 20) {
      this.acc -= interval;
      tick();
      n++;
    }
    if (n === 20) this.acc = 0;
    return n;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(1, Math.min(SPEED_TPS.length, speed));
  }
}
