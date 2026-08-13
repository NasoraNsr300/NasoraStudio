import { createClient } from "@supabase/supabase-js";

const APPROVED_EMAIL = "customer.test@nasora.local";
const nickname = "Nasora Test Customer";
const email = (process.env.TEST_CUSTOMER_EMAIL ?? APPROVED_EMAIL).trim().toLowerCase();
const password = process.env.TEST_CUSTOMER_PASSWORD ?? "";
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const secretKey = (process.env.SUPABASE_SECRET_KEY ?? "").trim();

if (process.env.NODE_ENV === "production") {
  throw new Error("Test customer reset is disabled in production.");
}
if (email !== APPROVED_EMAIL) {
  throw new Error(`Only ${APPROVED_EMAIL} can be reset.`);
}
if (password.length < 12) {
  throw new Error("TEST_CUSTOMER_PASSWORD must be at least 12 characters.");
}
if (!supabaseUrl || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

async function findUserByEmail() {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === APPROVED_EMAIL);
    if (found) return found;
    if (data.users.length < perPage) return null;
  }

  throw new Error("User lookup exceeded the safe pagination limit.");
}

const existing = await findUserByEmail();
const accountAttributes = {
  app_metadata: { role: "member" },
  email_confirm: true,
  password,
  user_metadata: { nickname, preferred_locale: "th" },
};

const accountResult = existing
  ? await supabase.auth.admin.updateUserById(existing.id, accountAttributes)
  : await supabase.auth.admin.createUser({ email, ...accountAttributes });

if (accountResult.error) throw accountResult.error;

const user = accountResult.data.user;
if (!user || user.email?.toLowerCase() !== APPROVED_EMAIL) {
  throw new Error("Supabase Auth returned an unexpected test identity.");
}

const { data: resetSummary, error: resetError } = await supabase.rpc(
  "gateway_reset_test_customer",
  {
    p_contact_value: APPROVED_EMAIL,
    p_email: APPROVED_EMAIL,
    p_nickname: nickname,
    p_user_id: user.id,
  },
);

if (resetError) throw resetError;

const { data: resetAvatarId, error: resetAvatarError } = await supabase.rpc(
  "gateway_reset_test_customer_avatar",
  { p_user_id: user.id },
);
if (resetAvatarError) throw resetAvatarError;

process.stdout.write(`${JSON.stringify({
  account: existing ? "reset" : "created",
  email: APPROVED_EMAIL,
  memberRole: true,
  resetSummary,
  avatarCleanupScheduled: Boolean(resetAvatarId),
  signInPath: "/th?auth=1",
  userId: user.id,
}, null, 2)}\n`);
