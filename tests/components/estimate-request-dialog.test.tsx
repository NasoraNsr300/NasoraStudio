import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serviceTypes } from "@/data/fixtures/public-content";
import { EstimateRequestDialog } from "@/features/commission/components/estimate-request-dialog";
import type { createCommissionRequestRepository } from "@/features/commission/data/commission-request-repository";

afterEach(cleanup);

const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody")!;
type Repository = ReturnType<typeof createCommissionRequestRepository>;

function createRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    cancel: vi.fn(),
    listMine: vi.fn(),
    loadMemberIdentity: vi.fn().mockResolvedValue({
      data: { contact: { kind: "discord", value: "@stardust" }, nickname: "Stardust" },
      ok: true,
    }),
    submit: vi.fn().mockResolvedValue({ data: { requestCode: "REQ-ABC1234567", requestId: "request-1" }, ok: true }),
    ...overrides,
  } as Repository;
}

describe("EstimateRequestDialog", () => {
  it("automatically shows Guest fields when signed out and hides reference upload", () => {
    render(<EstimateRequestDialog auth={{ status: "signedOut", user: null }} locale="en" onClose={() => undefined} repository={createRepository()} service={service} />);

    expect(screen.getByRole("button", { name: "Guest" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Guest" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Member" })).toBeDisabled();
    expect(screen.getByPlaceholderText("For example: Lunaris, StarWalker")).toBeVisible();
    expect(screen.queryByText("Loading member information...")).not.toBeInTheDocument();
    expect(screen.queryByText("Upload more")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("moves the selected treatment when the usage type changes", async () => {
    const user = userEvent.setup();
    render(<EstimateRequestDialog auth={{ status: "signedOut", user: null }} locale="en" onClose={() => undefined} repository={createRepository()} service={service} />);

    const personal = screen.getByRole("radio", { name: "Personal" });
    const commercial = screen.getByRole("radio", { name: "Commercial" });
    const personalOption = personal.closest("label");
    const commercialOption = commercial.closest("label");

    expect(personal).toBeChecked();
    expect(personalOption).toHaveAttribute("data-selected", "true");
    expect(commercialOption).toHaveAttribute("data-selected", "false");

    await user.click(commercial);

    expect(commercial).toBeChecked();
    expect(personalOption).toHaveAttribute("data-selected", "false");
    expect(commercialOption).toHaveAttribute("data-selected", "true");
  });

  it("automatically loads member identity when signed in", async () => {
    const repository = createRepository();
    render(<EstimateRequestDialog
      auth={{ status: "signedIn", user: { email: "member@example.com", id: "user-1", nickname: "Session name" } }}
      locale="en"
      onClose={() => undefined}
      repository={repository}
      service={service}
    />);

    expect(screen.getByRole("button", { name: "Member" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Member" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guest" })).toBeDisabled();
    await waitFor(() => expect(screen.getByText("Stardust")).toBeVisible());
    expect(screen.getByText("@stardust")).toBeVisible();
    expect(screen.queryByPlaceholderText("For example: Lunaris, StarWalker")).not.toBeInTheDocument();
    expect(repository.loadMemberIdentity).toHaveBeenCalledWith("user-1", "member@example.com");
  });

  it("validates and submits a Guest brief once, then shows its reference", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue({ data: { requestCode: "REQ-ABC1234567", requestId: "request-1" }, ok: true });
    const repository = createRepository({ submit } as Partial<Repository>);
    render(<EstimateRequestDialog auth={{ status: "signedOut", user: null }} locale="en" onClose={() => undefined} repository={repository} service={service} />);

    await user.type(screen.getByPlaceholderText("For example: Lunaris, StarWalker"), "Moon");
    await user.type(screen.getByPlaceholderText("For example: @username"), "@moon");
    await user.type(screen.getByPlaceholderText("Minimum"), "3500");
    await user.type(screen.getByPlaceholderText("Maximum"), "6000");
    await user.type(screen.getByLabelText("Preferred deadline"), "2099-09-01");
    await user.type(screen.getByLabelText("Character / project description"), "A calm full-body night illustration");
    await user.type(screen.getByLabelText("Mood, palette, and style"), "Blue and gold");
    await user.click(screen.getByRole("button", { name: "Increase Extra characters" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Review and submit" }));

    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][0]).toMatchObject({
      budget_max_satang: 600_000,
      budget_min_satang: 350_000,
      extra_character_count: 1,
      guest_display_name: "Moon",
      requester_mode: "guest",
      service_type_slug: service.slug,
    });
    expect(await screen.findByText("REQ-ABC1234567")).toBeVisible();
    expect(screen.getByRole("button", { name: "Review and submit" })).toBeDisabled();
  });

  it("keeps entered values when submission fails", async () => {
    const user = userEvent.setup();
    const repository = createRepository({
      submit: vi.fn().mockResolvedValue({ message: "Network unavailable", ok: false }),
    } as Partial<Repository>);
    render(<EstimateRequestDialog auth={{ status: "signedOut", user: null }} locale="en" onClose={() => undefined} repository={repository} service={service} />);

    await user.type(screen.getByPlaceholderText("For example: Lunaris, StarWalker"), "Moon");
    await user.type(screen.getByPlaceholderText("For example: @username"), "@moon");
    await user.type(screen.getByPlaceholderText("Minimum"), "3500");
    await user.type(screen.getByPlaceholderText("Maximum"), "6000");
    await user.type(screen.getByLabelText("Preferred deadline"), "2099-09-01");
    await user.type(screen.getByLabelText("Character / project description"), "A calm full-body night illustration");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Review and submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.getByPlaceholderText("For example: Lunaris, StarWalker")).toHaveValue("Moon");
  });
});
