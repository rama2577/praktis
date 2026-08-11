import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireRoleApi } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { withTenantApi } from "@/lib/tenant-api";
import { saveUpload } from "@/lib/storage";
import { enqueueDocumentProcessing } from "@/lib/queue";
import { validateUploadFile, sha256Hex } from "@/server/documents";
import { isRateLimited, MAX_UPLOADS_PER_MINUTE, rateLimitKey } from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { ALL_DOC_TYPES } from "@/ai/doc-type-map";
import type { DocumentType } from "@prisma/client";

const DOC_TYPES: DocumentType[] = ALL_DOC_TYPES;

/**
 * POST /api/documents — upload dokumen klien (multipart/form-data).
 * Field: clientId, docType (INVOICE|BANK_STATEMENT|RECEIPT), file.
 * Rate limit: MAX_UPLOADS_PER_MINUTE per user (Redis fixed window).
 */
export const POST = withTenantApi(async (request) => {
  const guard = await requireRoleApi(OPERATIONAL_ROLES);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  // Rate limit per user (window 60 detik, Redis)
  const redis = getRedis();
  const rlKey = rateLimitKey("upload", guard.session.user.id);
  const hits = await redis.incr(rlKey);
  if (hits === 1) {
    await redis.expire(rlKey, 60);
  }
  if (isRateLimited(hits, MAX_UPLOADS_PER_MINUTE)) {
    logger.warn(
      { userId: guard.session.user.id, hits, event: "upload.rate_limited" },
      "upload diblokir rate limit",
    );
    return NextResponse.json(
      { error: `Terlalu banyak upload (maks ${MAX_UPLOADS_PER_MINUTE}/menit). Coba lagi nanti.` },
      { status: 429 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ errors: { _form: "Body multipart tidak valid" } }, { status: 400 });
  }

  const clientId = String(form.get("clientId") ?? "").trim();
  const docType = String(form.get("docType") ?? "").trim();
  const file = form.get("file");

  if (!clientId) {
    return NextResponse.json({ errors: { clientId: "Klien wajib dipilih." } }, { status: 400 });
  }
  if (!DOC_TYPES.includes(docType as DocumentType)) {
    return NextResponse.json(
      { errors: { docType: "Jenis dokumen tidak valid. Pilih salah satu kategori yang tersedia." } },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ errors: { file: "File wajib diunggah." } }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, firmId: guard.session.user.firmId, status: "ACTIVE" },
  });
  if (!client) {
    return NextResponse.json(
      { errors: { clientId: "Klien tidak ditemukan atau tidak aktif." } },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateUploadFile(file.name, file.type, buffer);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const id = randomUUID();
  const filePath = await saveUpload({ id, clientId: client.id, fileName: file.name, buffer });

  const document = await prisma.document.create({
    data: {
      id,
      firmId: guard.session.user.firmId,
      clientId: client.id,
      type: docType as DocumentType,
      mimeType: file.type,
      fileName: file.name,
      filePath,
      fileHash: sha256Hex(buffer),
      sizeBytes: buffer.length,
      status: "PENDING",
    },
  });

  await enqueueDocumentProcessing(document.id, guard.session.user.firmId);

  return NextResponse.json(
    {
      data: {
        id: document.id,
        fileName: document.fileName,
        type: document.type,
        status: document.status,
        sizeBytes: document.sizeBytes,
      },
    },
    { status: 201 },
  );
});
