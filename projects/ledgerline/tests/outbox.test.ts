import { describe, it, expect, vi } from "vitest";

// Mock prisma — simpel: outbox service hanya menggunakan create + findMany + update
const mockOutbox = {
  create: vi.fn().mockResolvedValue({ id: "evt-1", status: "PENDING" }),
  findMany: vi.fn().mockResolvedValue([]),
  update: vi.fn(),
};
const mockPrisma = {
  outboxEvent: mockOutbox,
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/events", () => ({
  emit: vi.fn(),
  on: vi.fn(),
  listenerCount: vi.fn(),
}));

// Lazy import — setelah mock
const { enqueueOutbox, processOutbox } = await import("../src/server/outbox");
const { emit } = await import("../src/lib/events");

describe("outbox", () => {
  it("enqueueOutbox menulis ke DB + emit in-process", async () => {
    mockOutbox.create.mockResolvedValueOnce({ id: "evt-1", status: "PENDING" });
    await enqueueOutbox("journalApproved", {
      journalId: "j-1",
      firmId: "f-1",
      clientId: "c-1",
      description: "Test",
    });
    expect(mockOutbox.create).toHaveBeenCalledWith({
      data: {
        eventType: "journalApproved",
        payload: { journalId: "j-1", firmId: "f-1", clientId: "c-1", description: "Test" },
      },
    });
    expect(emit).toHaveBeenCalledWith("journalApproved", {
      journalId: "j-1",
      firmId: "f-1",
      clientId: "c-1",
      description: "Test",
    });
  });

  it("processOutbox menandai PROCESSED untuk event sukses", async () => {
    mockOutbox.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        eventType: "slaBreach",
        payload: { firmId: "f-1", stage: "JUNIOR_REVIEW" },
        status: "PENDING",
        retryCount: 0,
        maxRetries: 3,
        processAfter: new Date(0),
        createdAt: new Date(),
      },
    ]);
    mockOutbox.update.mockResolvedValueOnce({ id: "e1", status: "PROCESSED" });

    const result = await processOutbox();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e1" },
        data: expect.objectContaining({ status: "PROCESSED" }),
      }),
    );
  });

  it("processOutbox menandai FAILED setelah maxRetries", async () => {
    mockOutbox.findMany.mockResolvedValueOnce([
      {
        id: "e2",
        eventType: "journalException",
        payload: { journalId: "j-2", firmId: "f-1", clientId: "c-1" },
        status: "PENDING",
        retryCount: 2,
        maxRetries: 3,
        processAfter: new Date(0),
        createdAt: new Date(),
      },
    ]);
    // emit throws → simulate failure
    const emitMock = emit as ReturnType<typeof vi.fn>;
    emitMock.mockImplementationOnce(() => {
      throw new Error("simulated failure");
    });
    mockOutbox.update.mockResolvedValueOnce({ id: "e2", status: "FAILED" });

    const result = await processOutbox();
    expect(result.failed).toBe(1);
    expect(mockOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e2" },
        data: expect.objectContaining({
          status: "FAILED",
          retryCount: 3,
          lastError: expect.stringContaining("simulated failure"),
        }),
      }),
    );
  });

  it("processOutbox mengosongkan saat tidak ada event pending", async () => {
    mockOutbox.findMany.mockResolvedValueOnce([]);
    const result = await processOutbox();
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
  });
});
