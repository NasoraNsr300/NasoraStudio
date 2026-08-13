import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function css(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("responsive layout contracts", () => {
  it("keeps commission controls touch-safe and stacks detail content only on small screens", () => {
    const source = css("src/features/commission/components/commission.module.css");
    expect(source).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.viewModeButton\s*\{[^}]*min-height:\s*44px[^}]*min-width:\s*44px/);
    expect(source).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.detailClose\s*\{[^}]*height:\s*44px[^}]*width:\s*44px/);
    expect(source).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.estimateForm\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(source).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.estimateCounter button\s*\{[^}]*height:\s*44px[^}]*width:\s*44px/);
    const identity = css("src/features/commission/components/estimate-request-identity.module.css");
    expect(identity).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.guestIdentity input,\s*\.guestIdentity select\s*\{[^}]*min-height:\s*44px/);
    expect(source).toMatch(/@media \(max-width: 780px\)[\s\S]*?\.detailBody\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(source).toMatch(/@media \(max-width: 520px\)[\s\S]*?\.detailFooter\s*\{[^}]*align-items:\s*stretch[^}]*flex-direction:\s*column/);
  });

  it("uses a horizontally scrollable member navigation and single-column phone forms", () => {
    const sidebar = css("src/features/member/components/member-sidebar.module.css");
    const pages = css("src/features/member/components/member-pages.module.css");
    expect(sidebar).toMatch(/@media \(max-width: 1100px\)[\s\S]*?\.sidebar nav\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/);
    expect(pages).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.fieldPair\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(pages).toMatch(/@media \(max-width: 720px\)[\s\S]*?\[data-mobile-thread-open="false"\][\s\S]*?\.chat\s*\{[^}]*display:\s*none/);
  });

  it("lets the public mobile search shrink inside the viewport", () => {
    const source = css("src/shared/components/public-shell/public-shell.module.css");
    expect(source).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.search\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*min-width:\s*0/);
  });

  it("turns the admin shell into an icon rail and a phone drawer without changing desktop rules", () => {
    const source = css("src/features/admin/components/admin-dashboard.module.css");
    expect(source).toMatch(/@media \(max-width: 1100px\)[\s\S]*?\.adminShell,\.adminShellCollapsed\s*\{[^}]*grid-template-columns:\s*76px minmax\(0,1fr\)[^}]*min-width:\s*0/);
    expect(source).toMatch(/@media \(max-width: 1100px\)[\s\S]*?\.main,\.dashboardShell \.main\s*\{[^}]*overflow-y:\s*auto/);
    expect(source).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.sidebar\s*\{[^}]*position:\s*fixed/);
    expect(source).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.sidebar\[data-collapsed="true"\][^}]*transform:\s*translateX\(-100%\)/);
  });
});
