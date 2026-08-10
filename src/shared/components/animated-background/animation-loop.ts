export type AnimationLoop = {
  isRunning(): boolean;
  start(): void;
  stop(): void;
};

export function createAnimationLoop(
  draw: FrameRequestCallback,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame,
  cancelFrame: typeof cancelAnimationFrame = cancelAnimationFrame,
): AnimationLoop {
  let frameId: number | null = null;
  let running = false;

  const tick: FrameRequestCallback = (time) => {
    frameId = null;
    if (!running) return;
    draw(time);
    if (running) frameId = requestFrame(tick);
  };

  return {
    isRunning: () => running,
    start() {
      if (running) return;
      running = true;
      frameId = requestFrame(tick);
    },
    stop() {
      if (!running && frameId === null) return;
      running = false;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    },
  };
}
