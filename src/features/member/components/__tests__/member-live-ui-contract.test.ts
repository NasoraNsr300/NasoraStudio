import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workspace = process.cwd();

function source(path: string) {
  return readFileSync(resolve(workspace, path), "utf8");
}

describe("member live UI contract", () => {
  it("does not render fixture artwork or fixture avatars", () => {
    const files = [
      "src/features/member/components/member-sidebar.tsx",
      "src/features/member/components/member-profile-form.tsx",
      "src/features/member/components/member-job-page.tsx",
      "src/shared/components/public-shell/account-menu.tsx",
    ];

    for (const file of files) expect(source(file)).not.toContain("/fixtures/");
  });

  it("does not expose the mock member job route", () => {
    expect(source("src/app/[locale]/member/jobs/[jobId]/page.tsx")).not.toContain('jobId === "demo"');
  });

  it("does not keep inert mock controls or hard-coded notification counts", () => {
    const files = [
      "src/features/member/components/member-job-page.tsx",
      "src/features/member/components/member-profile-form.tsx",
      "src/features/member/components/member-profile-page.tsx",
      "src/features/member/components/member-sidebar.tsx",
    ];
    const combined = files.map(source).join("\n");

    expect(combined).not.toContain('href="#"');
    expect(combined).not.toMatch(/coming soon|เร็ว ๆ นี้/);
    expect(source("src/features/member/components/member-sidebar.tsx")).not.toContain('<b>3</b>');
    expect(source("src/features/member/components/member-job-page.tsx")).not.toContain('6,500 THB');
  });
});
