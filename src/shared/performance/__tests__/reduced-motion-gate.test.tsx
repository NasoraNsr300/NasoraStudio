import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReducedMotionGate } from "@/shared/performance/reduced-motion-gate";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubMatchMedia(value: MediaQueryList) {
  vi.stubGlobal("matchMedia", vi.fn(() => value));
}

describe("ReducedMotionGate", () => {
  it("never mounts animated children when reduced motion is enabled", () => {
    stubMatchMedia({
      addEventListener: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    render(<ReducedMotionGate><canvas aria-label="particles" /></ReducedMotionGate>);
    expect(screen.queryByLabelText("particles")).not.toBeInTheDocument();
  });

  it("mounts only while motion is allowed and reacts to preference changes", () => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    let matches = false;
    stubMatchMedia({
      addEventListener: vi.fn((_name, callback) => { listener = callback as (event: MediaQueryListEvent) => void; }),
      get matches() { return matches; },
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    render(<ReducedMotionGate><canvas aria-label="particles" /></ReducedMotionGate>);
    expect(screen.getByLabelText("particles")).toBeInTheDocument();
    act(() => { matches = true; listener?.({ matches: true } as MediaQueryListEvent); });
    expect(screen.queryByLabelText("particles")).not.toBeInTheDocument();
  });
});
