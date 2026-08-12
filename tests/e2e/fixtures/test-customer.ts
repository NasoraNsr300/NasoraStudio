export const TEST_CUSTOMER_EMAIL = "customer.test@nasora.local";

export function getTestCustomerCredentials(environment = process.env) {
  if (environment.RUN_TEST_CUSTOMER_E2E !== "1") return null;

  const email = environment.TEST_CUSTOMER_EMAIL?.trim().toLowerCase() ?? TEST_CUSTOMER_EMAIL;
  const password = environment.TEST_CUSTOMER_PASSWORD ?? "";

  if (email !== TEST_CUSTOMER_EMAIL) {
    throw new Error(`E2E customer must be ${TEST_CUSTOMER_EMAIL}.`);
  }
  if (password.length < 12) {
    throw new Error("TEST_CUSTOMER_PASSWORD must be at least 12 characters.");
  }

  return { email, password };
}
