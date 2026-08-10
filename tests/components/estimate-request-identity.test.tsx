import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  GuestEstimateIdentity,
  MemberEstimateIdentity,
  type EstimateIdentityLabels,
} from "@/features/commission/components/estimate-request-identity";

const labels: EstimateIdentityLabels = {
  contact: "Contact channel",
  contactHint: "For example: @username",
  guestNameHint: "For example: Lunaris",
  identityLoading: "Loading member information...",
  nickname: "Nickname",
};

afterEach(cleanup);

describe("Estimate request identity sections", () => {
  it("renders the immutable member identity snapshot", () => {
    render(
      <MemberEstimateIdentity
        contact="@nasora"
        labels={labels}
        loading={false}
        nickname="Nasora"
      />,
    );

    expect(screen.getByText("Nasora")).toBeVisible();
    expect(screen.getByText("@nasora")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders editable Guest identity fields using the submission field names", () => {
    render(<GuestEstimateIdentity disabled={false} labels={labels} />);

    expect(screen.getByRole("textbox", { name: "Nickname" })).toHaveAttribute(
      "name",
      "guestDisplayName",
    );
    expect(screen.getByRole("combobox", { name: "Contact channel method" })).toHaveValue(
      "discord",
    );
    expect(screen.getByRole("textbox", { name: "Contact channel value" })).toHaveAttribute(
      "name",
      "guestContactValue",
    );
  });
});
