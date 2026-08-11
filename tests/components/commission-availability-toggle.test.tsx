import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommissionAvailabilityToggle } from "@/features/site-settings/components/commission-availability-toggle";

afterEach(cleanup);

describe("CommissionAvailabilityToggle", () => {
  it("saves an optimistic availability change", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({ json: async () => ({ commissionsOpen: false }), ok: true });
    render(<CommissionAvailabilityToggle fetcher={fetcher} initialOpen />);

    await user.click(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" }));
    expect(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" })).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  });

  it("rolls back and exposes an error when persistence fails", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({ json: async () => ({ error: "บันทึกไม่สำเร็จ" }), ok: false });
    render(<CommissionAvailabilityToggle fetcher={fetcher} initialOpen />);

    await user.click(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
    expect(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" })).toHaveAttribute("aria-checked", "true");
  });
});
