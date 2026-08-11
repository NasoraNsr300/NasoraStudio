import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSiteSettingsForm } from "@/features/site-settings/components/admin-site-settings-form";

afterEach(cleanup);

const initialSettings = {
  adminNote: "ตรวจคิว",
  businessHours: "11:00 – 22:00",
  commissionsOpen: true,
  discordContact: "nasora.studio",
  homeDescription: { en: "Stories", th: "เรื่องราว" },
  homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
  particlesEnabled: true,
  queueCapacity: 10,
  shootingStarsEnabled: true,
  updatedAt: "2026-08-12T00:00:00.000Z",
};

describe("AdminSiteSettingsForm", () => {
  it("saves edited settings and reports success", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({ settings: { ...initialSettings, commissionsOpen: false } }),
      ok: true,
    });
    render(<AdminSiteSettingsForm fetcher={fetcher} initialSettings={initialSettings} />);

    await user.click(screen.getByRole("switch", { name: "เปิดรับงาน" }));
    await user.click(screen.getByRole("button", { name: "บันทึกการตั้งค่า" }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({ commissionsOpen: false });
    expect(await screen.findByRole("status")).toHaveTextContent("บันทึกแล้ว");
  });

  it("restores saved values when save fails", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({ json: async () => ({ error: "บันทึกไม่สำเร็จ" }), ok: false });
    render(<AdminSiteSettingsForm fetcher={fetcher} initialSettings={initialSettings} />);

    await user.click(screen.getByRole("switch", { name: "เปิดรับงาน" }));
    expect(screen.getByRole("switch", { name: "เปิดรับงาน" })).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByRole("button", { name: "บันทึกการตั้งค่า" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
    expect(screen.getByRole("switch", { name: "เปิดรับงาน" })).toHaveAttribute("aria-checked", "true");
  });
});
