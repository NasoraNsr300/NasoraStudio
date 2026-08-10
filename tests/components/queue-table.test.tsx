import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { privateQueueFixtureRecords } from "@/data/fixtures/private-queue-fixtures.server";
import { projectPublicQueueItem } from "@/data/fixture-public-content-repository";
import type { PublicQueueItem } from "@/shared/types/public-content";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), useSearchParams: vi.fn(() => new URLSearchParams()) }));
vi.mock("next/navigation", () => ({ useSearchParams: navigation.useSearchParams }));

import { QueueSearch } from "@/features/queue/components/queue-search";

afterEach(() => {
  cleanup();
  navigation.params = new URLSearchParams();
  navigation.useSearchParams.mockImplementation(() => navigation.params);
});

const queue: PublicQueueItem[] = privateQueueFixtureRecords.map((item) => projectPublicQueueItem(item, "en"));

describe("QueuePage", () => {
  it("renders the public queue fields, including member nicknames and Guest aliases", () => {
    render(<QueueSearch items={queue} locale="en" />);
    const table = screen.getByRole("table");

    expect(screen.getByRole("columnheader", { name: "Position" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Service" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Deadline" })).toBeVisible();
    expect(within(table).getByText("Mali")).toBeVisible();
    expect(within(table).getByText("Guest Comet")).toBeVisible();
    expect(within(table).getByText("Sketching")).toBeVisible();
    expect(within(table).getByText("18 Aug 2026")).toBeVisible();
  });

  it("keeps queue rows as public records rather than private-detail links or buttons", () => {
    render(<QueueSearch items={queue} locale="en" />);

    expect(screen.queryByRole("link", { name: /Mali|Nox|Guest Comet/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mali|Nox|Guest Comet/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/quote-mali|payment-mali|mali@example\.test|private\.example/)).not.toBeInTheDocument();
  });

  it("filters supplied public queue records from the current queue q parameter", () => {
    navigation.params = new URLSearchParams("q=Coloring");
    navigation.useSearchParams.mockImplementation(() => navigation.params);
    render(<QueueSearch items={queue} locale="en" />);

    expect(screen.getByText("Nox")).toBeVisible();
    expect(screen.queryByText("Mali")).not.toBeInTheDocument();
  });

  it("updates its filter when client navigation supplies a new q parameter", () => {
    navigation.params = new URLSearchParams("q=Coloring");
    navigation.useSearchParams.mockImplementation(() => navigation.params);
    const { rerender } = render(<QueueSearch items={queue} locale="en" />);
    expect(screen.getByText("Nox")).toBeVisible();

    navigation.params = new URLSearchParams("q=Sketching");
    rerender(<QueueSearch items={queue} locale="en" />);
    expect(screen.getByText("Mali")).toBeVisible();
  });

  it("uses Thai labels when requested", () => {
    render(<QueueSearch items={privateQueueFixtureRecords.map((item) => projectPublicQueueItem(item, "th"))} locale="th" />);

    expect(screen.getByRole("columnheader", { name: "ลำดับ" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "คิวงาน" })).toBeVisible();
  });
});
