type MaintenanceEnvironment = {
  CRON_SECRET: string;
  NASORA_BASE_URL: string;
};

type MaintenanceContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type MaintenanceFetcher = (input: string, init: RequestInit) => Promise<Response>;

const endpoints = [
  "/api/internal/email-outbox/dispatch",
  "/api/internal/cleanup/dispatch",
] as const;

export async function runMaintenance(environment: MaintenanceEnvironment, fetcher: MaintenanceFetcher = fetch) {
  const secret = environment.CRON_SECRET?.trim();
  let baseUrl: URL;
  try { baseUrl = new URL(environment.NASORA_BASE_URL); }
  catch { throw new Error("invalid_maintenance_environment"); }
  if (!secret || baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.pathname !== "/") {
    throw new Error("invalid_maintenance_environment");
  }

  const responses = await Promise.all(endpoints.map((endpoint) => fetcher(
    `${baseUrl.origin}${endpoint}`,
    { headers: { authorization: `Bearer ${secret}` }, method: "POST" },
  )));
  if (responses.some((response) => !response.ok)) throw new Error("maintenance_request_failed");
}

const maintenanceWorker = {
  scheduled(_controller: unknown, environment: MaintenanceEnvironment, context: MaintenanceContext) {
    context.waitUntil(runMaintenance(environment));
  },
};

export default maintenanceWorker;
