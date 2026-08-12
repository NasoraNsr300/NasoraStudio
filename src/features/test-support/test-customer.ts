export const APPROVED_TEST_CUSTOMER_EMAIL = "customer.test@nasora.local";

type ResetGuardInput = {
  email: string;
  nodeEnv?: string;
};

type TestCustomerEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NODE_ENV?: string;
  SUPABASE_SECRET_KEY?: string;
  TEST_CUSTOMER_EMAIL?: string;
  TEST_CUSTOMER_PASSWORD?: string;
};

export function assertTestResetAllowed({ email, nodeEnv }: ResetGuardInput) {
  if (nodeEnv === "production") {
    throw new Error("Test customer reset is disabled in production.");
  }

  if (email.trim().toLowerCase() !== APPROVED_TEST_CUSTOMER_EMAIL) {
    throw new Error(`Only ${APPROVED_TEST_CUSTOMER_EMAIL} can be reset.`);
  }
}

export function parseTestCustomerEnv(environment: TestCustomerEnvironment) {
  const email = environment.TEST_CUSTOMER_EMAIL?.trim().toLowerCase()
    ?? APPROVED_TEST_CUSTOMER_EMAIL;
  const password = environment.TEST_CUSTOMER_PASSWORD ?? "";
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim() ?? "";
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";

  assertTestResetAllowed({ email, nodeEnv: environment.NODE_ENV });

  if (!password) {
    throw new Error("TEST_CUSTOMER_PASSWORD is required.");
  }
  if (password.length < 12) {
    throw new Error("TEST_CUSTOMER_PASSWORD must be at least 12 characters.");
  }
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required.");
  }
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  return { email, password, secretKey, supabaseUrl };
}
