import { describe, expect, it, vi } from "vitest";

import { createAnimationLoop } from "@/shared/components/animated-background/animation-loop";

describe("createAnimationLoop", () => {
  it("keeps only one scheduled frame when start is called repeatedly", () => {
    const callbacks: FrameRequestCallback[] = [];
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancelFrame = vi.fn();
    const draw = vi.fn();
    const loop = createAnimationLoop(draw, requestFrame, cancelFrame);

    loop.start();
    loop.start();
    loop.start();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    callbacks[0](0);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it("cancels the pending frame and can restart cleanly", () => {
    const requestFrame = vi.fn(() => 42);
    const cancelFrame = vi.fn();
    const loop = createAnimationLoop(vi.fn(), requestFrame, cancelFrame);

    loop.start();
    loop.stop();
    loop.stop();
    loop.start();

    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });
});
