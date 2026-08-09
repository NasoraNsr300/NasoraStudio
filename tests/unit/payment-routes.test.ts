import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminRepository: { findReviewSlip: vi.fn(), findVerificationResult: vi.fn(), verify: vi.fn() },
  createAdminPaymentRepository: vi.fn(),
  createClient: vi.fn(),
  createPaymentGatewayClient: vi.fn(),
  createPaymentRepository: vi.fn(),
  createR2SlipStorage: vi.fn(),
  paymentRepository: { allocateSlip: vi.fn(), beginPut: vi.fn(), createIntent: vi.fn(), failSlip: vi.fn(), finalizeSlip: vi.fn(), recoverIntent: vi.fn() },
  storage: { deleteObject: vi.fn(), headObject: vi.fn(), putObject: vi.fn() },
}));

vi.mock("@/shared/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/payments/data/payment-gateway-client.server", () => ({ createPaymentGatewayClient: mocks.createPaymentGatewayClient }));
vi.mock("@/features/payments/data/payment-repository", () => ({ createPaymentRepository: mocks.createPaymentRepository }));
vi.mock("@/features/payments/data/admin-payment-repository.server", () => ({ createAdminPaymentRepository: mocks.createAdminPaymentRepository }));
vi.mock("@/features/payments/storage/r2-slip-storage.server", () => ({ createR2SlipStorage: mocks.createR2SlipStorage, normalizeEtag: (value: string) => value.replace(/^W\//, "").replace(/^\"|\"$/g, "").trim() }));

import { GET as recoverIntent, POST as createIntent } from "@/app/api/member/payments/[quoteId]/intent/route";
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

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
function upload(body: Uint8Array, headers: HeadersInit = {}) {
  const requestBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(requestBody).set(body);
  return new Request(`https://nasora.example/api/member/payments/${paymentId}/slip-upload`, {
    body: requestBody,
    headers: { "content-length": String(body.byteLength), "content-type": "image/png", "idempotency-key": idempotencyKey, origin: "https://nasora.example", ...headers },
    method: "POST",
  });
}

function authClient(role = "member", email = role === "admin" ? "nasora.nsr300@gmail.com" : "member@example.com") {
  return { auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role }, email, id: "user-1" } }, error: null })) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminRepository.findVerificationResult.mockReset().mockResolvedValue(null);
  mocks.paymentRepository.createIntent.mockReset();
  mocks.paymentRepository.recoverIntent.mockReset();
  mocks.storage.deleteObject.mockReset().mockResolvedValue(undefined);
  process.env.PROMPTPAY_ID = "0812345678";
  mocks.createClient.mockResolvedValue(authClient());
  mocks.createPaymentGatewayClient.mockReturnValue({ rpc: vi.fn() });
  mocks.createPaymentRepository.mockReturnValue(mocks.paymentRepository);
  mocks.createAdminPaymentRepository.mockReturnValue(mocks.adminRepository);
  mocks.createR2SlipStorage.mockReturnValue(mocks.storage);
  mocks.paymentRepository.failSlip.mockResolvedValue(undefined);
  mocks.paymentRepository.beginPut.mockResolvedValue(undefined);
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

  it("validates private R2 configuration before creating an intent", async () => {
    mocks.createR2SlipStorage.mockImplementationOnce(() => { throw new Error("r2_not_configured"); });
    const response = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(503);
    expect(mocks.paymentRepository.createIntent).not.toHaveBeenCalled();
  });

  it("validates the server-only Supabase secret before creating an intent", async () => {
    mocks.createPaymentGatewayClient.mockImplementationOnce(() => { throw new Error("payment_gateway_not_configured"); });
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

  it("returns conflict when another idempotency key already owns the pending intent", async () => {
    mocks.paymentRepository.createIntent.mockRejectedValueOnce(new Error("payment_intent_pending"));
    const response = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(409);
  });

  it("does not return PromptPay data when an exact-key replay is already closed", async () => {
    mocks.paymentRepository.createIntent.mockResolvedValueOnce({ amountSatang: 50_000, id: paymentId, kind: "deposit", status: "closed" });
    const response = await createIntent(post(`/api/member/payments/${quoteId}/intent`, { depositSatang: 50_000, idempotencyKey, requestId }), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty("promptPayPayload");
  });

  it("recovers a canonical pending intent with a regenerated PromptPay payload", async () => {
    mocks.paymentRepository.recoverIntent.mockResolvedValue({ amountSatang: 50_000, id: paymentId, kind: "deposit", quoteId, slipStatus: "rejected", status: "pending" });
    const response = await recoverIntent(new Request(`https://nasora.example/api/member/payments/${quoteId}/intent?requestId=${requestId}`), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amountSatang: 50_000, kind: "deposit", paymentId, quoteId, promptPayPayload: expect.stringMatching(/6304[0-9A-F]{4}$/), slipStatus: "rejected", status: "pending" });
    expect(mocks.paymentRepository.createIntent).not.toHaveBeenCalled();
  });

  it("recovers active review state without returning obsolete PromptPay data", async () => {
    mocks.paymentRepository.recoverIntent.mockResolvedValue({ amountSatang: 50_000, id: paymentId, kind: "deposit", quoteId, slipStatus: "pending_review", status: "pending" });
    const response = await recoverIntent(new Request(`https://nasora.example/api/member/payments/${quoteId}/intent?requestId=${requestId}`), { params: Promise.resolve({ quoteId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ amountSatang: 50_000, kind: "deposit", paymentId, quoteId, slipStatus: "pending_review", status: "pending" });
  });

  it("uploads a validated image once through the same-origin gateway without returning a bearer URL", async () => {
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey: "payment-slips/025f6aa2-6227-4b74-a833-e9fca9db998a.png", status: "authorized" });
    mocks.storage.putObject.mockResolvedValue({ etag: "etag-1" });
    mocks.paymentRepository.finalizeSlip.mockResolvedValue({ id: slipId, status: "pending_review" });
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.storage.putObject).toHaveBeenCalledOnce();
    expect(mocks.paymentRepository.allocateSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String) }));
    const attemptId = mocks.paymentRepository.allocateSlip.mock.calls[0][0].attemptId;
    expect(mocks.paymentRepository.finalizeSlip).toHaveBeenCalledWith({ attemptId, contentType: "image/png", etag: "etag-1", idempotencyKey, sizeBytes: png.byteLength, slipId, userId: "user-1" });
    expect(await response.json()).toEqual({ status: "pending_review" });
  });

  it("rejects an oversized declared body before allocating or writing", async () => {
    const response = await uploadSlip(upload(png, { "content-length": String(5 * 1024 * 1024 + 1) }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(413);
    expect(mocks.paymentRepository.allocateSlip).not.toHaveBeenCalled();
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects spoofed or truncated image bytes before allocating", async () => {
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey: "payment-slips/private.png", status: "authorized" });
    const response = await uploadSlip(upload(new Uint8Array([137, 80, 78, 71]), { "content-length": "4" }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(415);
    expect(mocks.paymentRepository.allocateSlip).toHaveBeenCalledBefore(mocks.paymentRepository.failSlip);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String), cleanupRequired: false, idempotencyKey, slipId, userId: "user-1" }));
  });

  it("best-effort deletes an orphan before failing reused authorized rows with invalid bytes", async () => {
    const objectKey = "payment-slips/orphan.png";
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey, status: "authorized" });
    mocks.storage.deleteObject.mockRejectedValueOnce(new Error("r2_delete_failed"));
    const response = await uploadSlip(upload(new Uint8Array([137, 80, 78, 71]), { "content-length": "4" }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(415);
    expect(mocks.storage.deleteObject).toHaveBeenCalledWith(objectKey);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String), cleanupRequired: true, idempotencyKey, slipId, userId: "user-1" }));
  });

  it("best-effort deletes only the durable superseded-attempt key before reading a replacement", async () => {
    const staleAttemptId = "e1a9d2cd-31d6-4d90-847f-f17efb90a86f";
    const staleKey = "payment-slips/stale-attempt.png";
    const winnerKey = "payment-slips/winner-attempt.png";
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ cleanupAttemptId: staleAttemptId, cleanupObjectKey: staleKey, id: slipId, objectKey: winnerKey, status: "authorized" });
    mocks.storage.putObject.mockResolvedValue({ etag: "winner-etag" });
    mocks.paymentRepository.finalizeSlip.mockResolvedValue({ id: slipId, status: "pending_review" });
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.storage.deleteObject).toHaveBeenCalledWith(staleKey);
    expect(mocks.storage.deleteObject).not.toHaveBeenCalledWith(winnerKey);
    expect(mocks.storage.deleteObject).toHaveBeenCalledBefore(mocks.storage.putObject);
  });

  it("rechecks attempt ownership immediately before PUT and never writes after losing the lease", async () => {
    const losingKey = "payment-slips/fenced-before-put.png";
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey: losingKey, status: "authorized" });
    mocks.paymentRepository.beginPut.mockRejectedValue(new Error("payment_slip_attempt_lost"));
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(409);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.storage.deleteObject).toHaveBeenCalledWith(losingKey);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ cleanupRequired: false }));
  });

  it("does not delete a possible winner object after an ambiguous finalization failure", async () => {
    const objectKey = "payment-slips/025f6aa2-6227-4b74-a833-e9fca9db998a.png";
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey, status: "authorized" });
    mocks.storage.putObject.mockResolvedValue({ etag: "etag-1" });
    mocks.paymentRepository.finalizeSlip.mockRejectedValue(new Error("finalize_failed"));
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(400);
    expect(mocks.storage.deleteObject).not.toHaveBeenCalledWith(objectKey);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String), cleanupRequired: true, idempotencyKey, slipId, userId: "user-1" }));
  });

  it("persists cleanup when a fenced losing-attempt object cannot be deleted", async () => {
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey: "payment-slips/private.png", status: "authorized" });
    mocks.storage.putObject.mockResolvedValue({ etag: "etag-1" });
    mocks.paymentRepository.finalizeSlip.mockRejectedValue(new Error("payment_slip_attempt_lost"));
    mocks.storage.deleteObject.mockRejectedValue(new Error("delete_failed"));
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(409);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String), cleanupRequired: true, idempotencyKey, slipId, userId: "user-1" }));
  });

  it("allows only one same-key request to PUT while the database lease is active", async () => {
    const winnerKey = "payment-slips/winner.png";
    mocks.paymentRepository.allocateSlip
      .mockResolvedValueOnce({ id: slipId, objectKey: winnerKey, status: "authorized" })
      .mockRejectedValueOnce(new Error("payment_slip_upload_in_progress"));
    mocks.storage.putObject.mockResolvedValue({ etag: "winner-etag" });
    mocks.paymentRepository.finalizeSlip.mockResolvedValue({ id: slipId, status: "pending_review" });
    const [winner, loser] = await Promise.all([
      uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) }),
      uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) }),
    ]);
    expect(winner.status).toBe(200);
    expect(loser.status).toBe(409);
    expect(mocks.storage.putObject).toHaveBeenCalledTimes(1);
    expect(mocks.paymentRepository.beginPut).toHaveBeenCalledTimes(1);
    expect(mocks.storage.deleteObject).not.toHaveBeenCalledWith(winnerKey);
  });

  it("cleans only its leased object when finalize loses to a newer attempt", async () => {
    const losingKey = "payment-slips/losing-attempt.png";
    mocks.paymentRepository.allocateSlip.mockResolvedValue({ id: slipId, objectKey: losingKey, status: "authorized" });
    mocks.storage.putObject.mockResolvedValue({ etag: "losing-etag" });
    mocks.paymentRepository.finalizeSlip.mockRejectedValue(new Error("payment_slip_attempt_lost"));
    const response = await uploadSlip(upload(png), { params: Promise.resolve({ paymentId }) });
    const attemptId = mocks.paymentRepository.allocateSlip.mock.calls[0][0].attemptId;
    expect(response.status).toBe(409);
    expect(mocks.storage.deleteObject).toHaveBeenCalledWith(losingKey);
    expect(mocks.paymentRepository.failSlip).toHaveBeenCalledWith(expect.objectContaining({ attemptId }));
  });

  it("requires admin app_metadata and revalidates object metadata before approval", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findReviewSlip.mockResolvedValue({ contentType: "image/jpeg", etag: "etag", id: paymentId, objectKey: "payment-slips/random.jpg", sizeBytes: 123 });
    mocks.storage.headObject.mockResolvedValue({ contentType: "image/jpeg", etag: "\"etag\"", sizeBytes: 123 });
    mocks.adminRepository.findVerificationResult.mockResolvedValue(null);
    mocks.adminRepository.verify.mockResolvedValue({ intentId: paymentId, paymentId: "fed71710-0713-44e5-8712-6105a0cd57bc", slipStatus: "approved" });
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.adminRepository.verify).toHaveBeenCalledWith({ adminUserId: "user-1", decision: "approve", idempotencyKey, paymentId, reason: null });
  });

  it("replays a terminal decision before HEAD after a lost response", async () => {
    const terminal = { intentId: paymentId, paymentId: "fed71710-0713-44e5-8712-6105a0cd57bc", slipStatus: "approved" };
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findVerificationResult.mockResolvedValue(terminal);
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(terminal);
    expect(mocks.storage.headObject).not.toHaveBeenCalled();
    expect(mocks.adminRepository.verify).not.toHaveBeenCalled();
  });

  it("rechecks terminal replay before returning 404 after a concurrent commit", async () => {
    const terminal = { intentId: paymentId, paymentId: "fed71710-0713-44e5-8712-6105a0cd57bc", slipStatus: "approved" };
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findVerificationResult.mockResolvedValueOnce(null).mockResolvedValueOnce(terminal);
    mocks.adminRepository.findReviewSlip.mockResolvedValue(null);
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(terminal);
    expect(mocks.adminRepository.findVerificationResult).toHaveBeenCalledTimes(2);
  });

  it("returns conflict when a terminal decision is retried with another key", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findVerificationResult.mockRejectedValue(new Error("idempotency_key_mismatch"));
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(409);
    expect(mocks.storage.headObject).not.toHaveBeenCalled();
  });

  it("rejects a pending slip even when its R2 object is missing", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findVerificationResult.mockResolvedValue(null);
    mocks.adminRepository.findReviewSlip.mockResolvedValue({ contentType: "image/jpeg", etag: "etag", id: paymentId, objectKey: "payment-slips/missing.jpg", sizeBytes: 123 });
    mocks.adminRepository.verify.mockResolvedValue({ intentId: paymentId, paymentId: null, slipStatus: "rejected" });
    mocks.storage.deleteObject.mockRejectedValue(new Error("r2_object_not_found"));
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "reject", idempotencyKey, reason: "Unreadable" }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(200);
    expect(mocks.storage.headObject).not.toHaveBeenCalled();
    expect(mocks.adminRepository.verify).toHaveBeenCalled();
  });

  it("requires the exact immutable admin identity", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin", "other-admin@example.com"));
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(403);
    expect(mocks.adminRepository.findReviewSlip).not.toHaveBeenCalled();
  });

  it("does not approve when the persisted and current R2 ETags differ", async () => {
    mocks.createClient.mockResolvedValue(authClient("admin"));
    mocks.adminRepository.findReviewSlip.mockResolvedValue({ contentType: "image/jpeg", etag: "expected", id: paymentId, objectKey: "payment-slips/random.jpg", sizeBytes: 123 });
    mocks.adminRepository.findVerificationResult.mockResolvedValue(null);
    mocks.storage.headObject.mockResolvedValue({ contentType: "image/jpeg", etag: "changed", sizeBytes: 123 });
    const response = await verifySlip(post(`/api/admin/payments/${paymentId}/verify`, { decision: "approve", idempotencyKey }), { params: Promise.resolve({ paymentId }) });
    expect(response.status).toBe(422);
    expect(mocks.adminRepository.verify).not.toHaveBeenCalled();
  });
});
