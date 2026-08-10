import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
