import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validatePortalToken } from "@/server/portal";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/storage";
import { enqueueDocumentProcessing } from "@/lib/queue";
import { validateUploadFile, sha256Hex } from "@/server/documents";
import type { DocumentType } from "@prisma/client";
import { ALL_DOC_TYPES } from "@/ai/doc-type-map";

const DOC_TYPES: DocumentType[] = ALL_DOC_TYPES;

type Ctx = { params: Promise<{ token: string }> };

/** POST /api/portal/[token]/documents — upload dokumen oleh klien (auth by token). */
export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await validatePortalToken(token);
  if (!result) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });

  const { client } = result;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Body multipart tidak valid" }, { status: 400 });

  const docType = String(form.get("docType") ?? "INVOICE").trim();
  const file = form.get("file");

  if (!DOC_TYPES.includes(docType as DocumentType)) {
    return NextResponse.json({ error: "Jenis dokumen tidak valid." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateUploadFile(file.name, file.type, buffer);
  if (!validation.ok) {
    return NextResponse.json(
      { error: Object.values(validation.errors).join("; ") || "File tidak valid" },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const filePath = await saveUpload({ id, clientId: client.id, fileName: file.name, buffer });

  const document = await prisma.document.create({
    data: {
      id,
      firmId: client.firmId,
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

  await enqueueDocumentProcessing(document.id, client.firmId);

  return NextResponse.json(
    { data: { id: document.id, fileName: document.fileName, status: document.status } },
    { status: 201 },
  );
}
