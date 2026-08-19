import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import { runSafeProductionBuild } from "./run-safe-production-build.mjs";

const requiredEnvironmentKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "PROMPTPAY_ID",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PAYMENT_SLIPS_BUCKET",
  "R2_PRIVATE_ASSETS_BUCKET",
  "RESEND_API_KEY",
  "ADMIN_EMAIL_SENDER",
  "CRON_SECRET",
];

const localEnvironment = existsSync(".env.local")
  ? parseEnv(readFileSync(".env.local", "utf8"))
  : {};
const deploymentEnvironment = { ...localEnvironment, ...process.env };
const missingKeys = requiredEnvironmentKeys.filter((key) => !deploymentEnvironment[key]?.trim());

if (missingKeys.length > 0) {
  throw new Error(`Missing Vercel environment variables: ${missingKeys.join(", ")}`);
}
if (/[<>]/.test(deploymentEnvironment.ADMIN_EMAIL_SENDER)) {
  throw new Error("ADMIN_EMAIL_SENDER must contain an email address only.");
}

runSafeProductionBuild(resolve("node_modules/next/dist/bin/next"), ["build"]);
