import { existsSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

const localEnvironmentPath = ".env.local";
const backupEnvironmentPath = ".env.local.runtime-backup";

const runtimeOnlyKeys = [
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
  "APP_BASE_URL",
  "NASORA_BASE_URL",
  "RUN_TEST_CUSTOMER_E2E",
  "TEST_CUSTOMER_EMAIL",
  "TEST_CUSTOMER_PASSWORD",
];

export function runSafeProductionBuild(entrypoint, args) {
  if (existsSync(backupEnvironmentPath) && !existsSync(localEnvironmentPath)) {
    renameSync(backupEnvironmentPath, localEnvironmentPath);
  }
  if (existsSync(backupEnvironmentPath)) {
    throw new Error(`${backupEnvironmentPath} already exists; refusing to overwrite it.`);
  }

  const childEnvironment = { ...process.env };
  for (const key of runtimeOnlyKeys) delete childEnvironment[key];

  let movedLocalEnvironment = false;
  if (existsSync(localEnvironmentPath)) {
    const localEnvironment = parseEnv(readFileSync(localEnvironmentPath, "utf8"));
    for (const [key, value] of Object.entries(localEnvironment)) {
      if (key.startsWith("NEXT_PUBLIC_")) childEnvironment[key] = value;
    }
    renameSync(localEnvironmentPath, backupEnvironmentPath);
    movedLocalEnvironment = true;
  }

  try {
    const result = spawnSync(process.execPath, [entrypoint, ...args], {
      env: childEnvironment,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  } finally {
    if (movedLocalEnvironment && existsSync(backupEnvironmentPath)) {
      renameSync(backupEnvironmentPath, localEnvironmentPath);
    }
  }
}
