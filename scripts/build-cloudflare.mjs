import { resolve } from "node:path";

import { runSafeProductionBuild } from "./run-safe-production-build.mjs";

runSafeProductionBuild(resolve("node_modules/@opennextjs/cloudflare/dist/cli/index.js"), ["build"]);
