import { prisma } from "@/lib/db";
import type { Client, ClientPortalToken, Document } from "@prisma/client";

const TOKEN_VALIDITY_DAYS = 30;

/** Buat/reset token portal untuk klien. Token lama menjadi invalid. */
export async function ensurePortalToken(clientId: string): Promise<ClientPortalToken> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_VALIDITY_DAYS);

  return prisma.clientPortalToken.upsert({
    where: { clientId },
    create: { clientId, expiresAt },
    update: { expiresAt },
  });
}

/** Validasi token → klien (null jika invalid/expired). */
export async function validatePortalToken(
  token: string,
): Promise<{ client: Client; token: ClientPortalToken } | null> {
  const found = await prisma.clientPortalToken.findUnique({
    where: { token },
    include: { client: true },
  });
  if (!found) return null;
  if (found.expiresAt < new Date()) return null;
  return { client: found.client, token: found };
}

/** Dokumen klien (melalui token). */
export async function getPortalDocuments(
  clientId: string,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
