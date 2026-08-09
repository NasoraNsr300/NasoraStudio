import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminRepository: { findReviewSlip: vi.fn(), verify: vi.fn() },
  createAdminPaymentRepository: vi.fn(),
  createClient: vi.fn(),
  createPaymentRepository: vi.fn(),
  paymentRepository: { authorizeSlip: vi.fn(), confirmSlip: vi.fn(), createIntent: vi.fn(), findOwnedSlip: vi.fn() },
  storage: { createObjectKey: vi.fn(), createUploadUrl: vi.fn(), headObject: vi.fn() },
}));

vi.mock("@/shared/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/payments/data/payment-repository", () => ({ createPaymentRepository: mocks.createPaymentRepository }));
vi.mock("@/features/payments/data/admin-payment-repository.server", () => ({ createAdminPaymentRepository: mocks.createAdminPaymentRepository }));
vi.mock("@/features/payments/storage/r2-slip-storage.server", () => ({ createR2SlipStorage: () => mocks.storage }));

import { POST as createIntent } from "@/app/api/member/payments/[quoteId]/intent/route";
import { POST as uploadSlip } from "@/app/api/member/payments/[paymentId]/slip-upload/route";
import { POST as verifySlip } from "@/app/api/admin/payments/[paymentId]/verify/route";

const quoteId = "bf49a462-ef33-44d4-95d4-1a0de68472c5";
const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";
const paymentId = "d75a0770-6178-4bb8-9a75-f076984ffac8";
const slipId = "a2eae2d8-f2ed-47bd-8335-43a79e33e4b7";
const idempotencyKey = "6e6b4722-cf84-40de-96fe-098a74771709";

function post(path: string, body: unknown, headers: HeadersInit = {}) {
  return new Request(`https://nasora.example${path}`, { body: JSON.stringify(body), headers: { "content-type": "application/json", origin: "https://nasora.example", ...headers }, method: "POST" });
}

function authClient(role = "member") {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role }, id: "user-1" } }, error: null })) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PROMPTPAY_ID = "0812345678";
  mocks.createClient.mockResolvedValue(authClient());
  mocks.createPaymentRepository.mockReturnValue(mocks.paymentRepository);
  mocks.createAdminPaymentRepository.mockReturnValue(mocks.adminRepository);
  mocks.paymentRepository.createIntent.mockResolvedValue({ amountSatang: 50_000, id: paymentId, kind: "deposit", status: "pending" });
});

describe("payment mutation routes", () => {
  it("creates an idempotent deposit intent and server-generated PromptPay payload", async () => {
    const response = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amountSatang: 50_000, paymentId, promptPayPayload: expect.stringMatching(/6304[0-9A-F]{4}$/) });
    expect(mocks.paymentRepository.createIntent).toHaveBeenCalledWith({ amountSatang: 50_000, idempotencyKey, quoteId, requestId });
  });

  it("fails safely when PromptPay is not configured", async () => {
    delete process.env.PROMPTPAY_ID;
    const response = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(503);
    expect(mocks.paymentRepository.createIntent).not.toHaveBeenCalled();
  });

  it("uses only the request URL for same-origin validation and requires exact JSON", async () => {
    const spoofed = post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }, { "x-forwarded-host": "attacker.example" });
    expect((await createIntent(spoofed, { params: Promise.resolve({ quoteId }) })).status).toBe(200);
    const charset = post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }, { "content-type": "application/json; charset=utf-8" });
    expect((await createIntent(charset, { params: Promise.resolve({ quoteId }) })).status).toBe(415);
  });

  it("rejects malformed UUIDs and unknown JSON fields before mutation", async () => {
    const badId = await createIntent(post("/api/member/payments/nope/intent", { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId: "nope" }) });
    const extra = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, extra: true, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(badId.status).toBe(400);
    expect(extra.status).toBe(400);
  });

  it("authorizes only bounded image uploads with an unpredictable private key", async () => {
    mocks.storage.createObjectKey.mockReturnValue("payment-slips/random.webp");
    mocks.storage.createUploadUrl.mockResolvedValue("https://account.r2.cloudflarestorage.com/signed");
    mocks.paymentRepository.authorizeSlip.mockResolvedValue({ deleteAfter: "2026-09-08T00:00:00.000Z", id: slipId, objectKey: "payment-slips/random.webp" });
    const response = await uploadSlip(post(`/api/member/payments/${paymentId}/slip-upload`, { action: "authorize", contentType: "image/webp", idempotencyKey, sizeBytes: 5 * 1024 * 1024 }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.storage.createUploadUrl).toHaveBeenCalledWith("payment-slips/random.webp", "image/webp");
  });

  it("HEAD-validates R2 metadata before submitting a slip for review", async () => {
    mocks.paymentRepository.findOwnedSlip.mockResolvedValue({ contentType: "image/png", id: slipId, objectKey: "payment-slips/random.png", sizeBytes: 400 });
    mocks.storage.headObject.mockResolvedValue({ contentType: "image/png", etag: "etag-1", sizeBytes: 400 });
    mocks.paymentRepository.confirmSlip.mockResolvedValue({ id: slipId, status: "pending_review" });
    const response = await uploadSlip(post(`/api/member/payments/${paymentId}/slip-upload`, { action: "confirm", slipId }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.paymentRepository.confirmSlip).toHaveBeenCalledWith(slipId, "etag-1");
  });

  it("does not submit a slip whose actual R2 metadata differs", async () => {
    mocks.paymentRepository.findOwnedSlip.mockResolvedValue({ contentType: "image/png", id: slipId, objectKey: "payment-slips/random.png", sizeBytes: 400 });
    mocks.storage.headObject.mockResolvedValue({ contentType: "text/html", etag: "etag-1", sizeBytes: 400 });
    const response = await uploadSlip(post(`/api/member/payments/${paymentId}/slip-upload`, { action: "confirm", slipId }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(422);
    expect(mocks.paymentRepository.confirmSlip).not.toHaveBeenCalled();
  });

  it("requires admin app_metadata and revalidates object metadata before approval", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findReviewSlip.mockResolvedValue({ contentType: "image/jpeg", id: paymentId, objectKey: "payment-slips/random.jpg", sizeBytes: 123 });
    mocks.storage.headObject.mockResolvedValue({ contentType: "image/jpeg", etag: "etag", sizeBytes: 123 });
    mocks.adminRepository.verify.mockResolvedValue({ intentId: paymentId, paymentId: "fed71710-0713-44e5-8712-6105a0cd57bc", slipStatus: "approved" });
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.adminRepository.verify).toHaveBeenCalledWith({ decision: "approve", idempotencyKey, paymentId, reason: null });
  });
});
