import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { privateQueueFixtureRecords } from "@/data/fixtures/public-content";
import { projectPublicQueueItem } from "@/data/fixture-public-content-repository";
import { QueuePage } from "@/features/queue/components/queue-page";
import type { PublicQueueItem } from "@/shared/types/public-content";

afterEach(cleanup);

const queue: PublicQueueItem[] = privateQueueFixtureRecords.map((item) => projectPublicQueueItem(item, "en"));

describe("QueuePage", () => {
  it("renders the public queue fields, including member nicknames and Guest aliases", () => {
    render(<QueuePage items={queue} locale="en" />);

    expect(screen.getByRole("columnheader", { name: "Position" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Service" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Deadline" })).toBeVisible();
    expect(screen.getByText("Mali")).toBeVisible();
    expect(screen.getByText("Guest Comet")).toBeVisible();
    expect(screen.getByText("Sketching")).toBeVisible();
    expect(screen.getByText("18 Aug 2026")).toBeVisible();
  });

  it("keeps queue rows as public records rather than private-detail links or buttons", () => {
    render(<QueuePage items={queue} locale="en" />);

    expect(screen.queryByRole("link", { name: /Mali|Nox|Guest Comet/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mali|Nox|Guest Comet/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/quote-mali|payment-mali|mali@example\.test|private\.example/)).not.toBeInTheDocument();
  });

  it("filters the already public queue in the page without changing the URL", () => {
    render(<QueuePage items={queue} locale="en" />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search queue" }), { target: { value: "Coloring" } });
    expect(screen.getByText("Nox")).toBeVisible();
    expect(screen.queryByText("Mali")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("uses Thai labels when requested", () => {
    render(<QueuePage items={privateQueueFixtureRecords.map((item) => projectPublicQueueItem(item, "th"))} locale="th" />);

    expect(screen.getByRole("columnheader", { name: "ลำดับ" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "ค้นหาคิว" })).toBeVisible();
  });
});
