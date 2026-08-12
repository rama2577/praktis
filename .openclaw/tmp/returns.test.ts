import { describe, it, expect } from "vitest";
import { createReturnSchema, returnItemSchema } from "@/lib/schemas";
import { z } from "zod";

function reqWith(body: unknown): Request {
  return new Request("http://x/api", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Return validation (Phase 39)", () => {
  describe("returnItemSchema", () => {
    it("valid item accepted", () => {
      const r = returnItemSchema.safeParse({
        sale_item_id: "00000000-0000-4000-8000-000000000001",
        qty: 3,
      });
      expect(r.success).toBe(true);
    });

    it("rejects zero qty", () => {
      const r = returnItemSchema.safeParse({
        sale_item_id: "00000000-0000-4000-8000-000000000001",
        qty: 0,
      });
      expect(r.success).toBe(false);
    });

    it("rejects negative qty", () => {
      const r = returnItemSchema.safeParse({
        sale_item_id: "00000000-0000-4000-8000-000000000001",
        qty: -1,
      });
      expect(r.success).toBe(false);
    });

    it("rejects empty id", () => {
      const r = returnItemSchema.safeParse({
        sale_item_id: "",
        qty: 1,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("createReturnSchema", () => {
    it("valid payload accepted", () => {
      const r = createReturnSchema.safeParse({
        sale_id: "00000000-0000-4000-8000-000000000001",
        items: [
          { sale_item_id: "00000000-0000-4000-8000-000000000002", qty: 1 },
        ],
      });
      expect(r.success).toBe(true);
    });

    it("rejects empty items array", () => {
      const r = createReturnSchema.safeParse({
        sale_id: "00000000-0000-4000-8000-000000000001",
        items: [],
      });
      expect(r.success).toBe(false);
    });

    it("accepts optional reason", () => {
      const r = createReturnSchema.safeParse({
        sale_id: "00000000-0000-4000-8000-000000000001",
        items: [
          { sale_item_id: "00000000-0000-4000-8000-000000000002", qty: 2 },
        ],
        reason: "Barang rusak",
      });
      expect(r.success).toBe(true);
    });

    it("rejects missing sale_id", () => {
      const r = createReturnSchema.safeParse({
        items: [
          { sale_item_id: "00000000-0000-4000-8000-000000000002", qty: 1 },
        ],
      });
      expect(r.success).toBe(false);
    });
  });
});
