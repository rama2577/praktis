import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockOutbox = {
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
};
const mockWebhook = {
  findMany: vi.fn().mockResolvedValue([]),
};
const mockNotifLog = {
  create: vi.fn(),
};
const mockPrisma = {
  outboxEvent: mockOutbox,
  webhookSubscription: mockWebhook,
  notificationLog: mockNotifLog,
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/events", () => ({
  emit: vi.fn(),
  on: vi.fn(),
  listenerCount: vi.fn(),
}));

// Mock fetch global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { enqueueOutbox, processOutbox } = await import("../src/server/outbox");
const { signPayload } = await import("../src/server/notifications");

describe("outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueueOutbox menulis ke DB + emit in-process", async () => {
    await enqueueOutbox("journalApproved", {
      journalId: "j-1", firmId: "f-1", clientId: "c-1", description: "Test",
    });
    expect(mockOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "journalApproved" }),
    });
  });

  it("processOutbox proceses events and dispatches webhooks", async () => {
    mockOutbox.findMany.mockResolvedValueOnce([{
      id: "e1", eventType: "slaBreach",
      payload: { firmId: "f-1", stage: "JUNIOR_REVIEW" },
      status: "PENDING", retryCount: 0, maxRetries: 3,
      processAfter: new Date(0), createdAt: new Date(),
    }]);
    mockWebhook.findMany.mockResolvedValueOnce([{
      id: "w-1", url: "https://firma.example.com/webhook",
      secret: "secret123", eventTypes: ["slaBreach"], enabled: true,
    }]);
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "OK" });
    mockOutbox.update.mockResolvedValueOnce({ id: "e1", status: "PROCESSED" });

    const result = await processOutbox();
    expect(result.processed).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://firma.example.com/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Praktis-Event": "slaBreach",
          "X-Praktis-Delivery": "e1",
          "X-Praktis-Signature": expect.any(String),
        }),
      }),
    );
    expect(mockNotifLog.create).toHaveBeenCalled();
  });

  it("processOutbox marks FAILED on max retries", async () => {
    mockOutbox.findMany.mockResolvedValueOnce([{
      id: "e2", eventType: "journalException",
      payload: { journalId: "j-2", firmId: "f-1", clientId: "c-1" },
      status: "PENDING", retryCount: 2, maxRetries: 3,
      processAfter: new Date(0), createdAt: new Date(),
    }]);
    mockWebhook.findMany.mockResolvedValueOnce([]);
    (await import("@/lib/events")).emit.mockImplementationOnce(() => {
      throw new Error("emit error");
    });
    mockOutbox.update.mockResolvedValueOnce({ id: "e2", status: "FAILED" });

    const result = await processOutbox();
    expect(result.failed).toBe(1);
    expect(mockOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", retryCount: 3 }),
      }),
    );
  });
});

describe("signPayload", () => {
  it("menghasilkan HMAC-SHA256 hex signature", () => {
    const sig = signPayload("secret123", '{"test":true}');
    expect(sig).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(sig)).toBe(true);
  });

  it("signature berbeda untuk input berbeda", () => {
    const s1 = signPayload("k1", "a");
    const s2 = signPayload("k1", "b");
    expect(s1).not.toBe(s2);
  });
});
