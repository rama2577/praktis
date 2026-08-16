import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Rehash password semua akun demo ke nilai `DEMO_PASSWORD`.
 * Dipakai di produksi setelah mengganti password default (TD-16 / QW-1).
 *
 * Jalankan:
 *   DEMO_PASSWORD="<kuat>" npx tsx prisma/reset-demo-password.ts
 */
const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    console.error(
      "DEMO_PASSWORD tidak diset. Jalankan: DEMO_PASSWORD=\"<kuat>\" npx tsx prisma/reset-demo-password.ts",
    );
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 10);
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of users) {
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
  }
  console.log(`Password ${users.length} akun demo diset ke DEMO_PASSWORD.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
