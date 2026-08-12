import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { isRateLimited, rateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Rate limiting — maks 5 gagal per 15 menit per email
        const redis = getRedis();
        const rlKey = rateLimitKey("login", email);
        const hits = await redis.incr(rlKey);
        if (hits === 1) await redis.expire(rlKey, 900); // 15 menit
        if (isRateLimited(hits, 5)) {
          logger.warn({ email, hits, event: "login.rate_limited" }, "login diblokir rate limit");
          // Penundaan agar tidak membocorkan timing
          await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
          return null;
        }

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user || !user.active) {
          logger.info({ email, event: "login.failed", reason: user ? "inactive" : "not_found" }, "login gagal");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          logger.info({ email, event: "login.failed", reason: "invalid_password" }, "login gagal");
          return null;
        }

        // Reset counter setelah login sukses
        await redis.del(rlKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          firmId: user.firmId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.firmId = user.firmId as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.firmId = token.firmId as string;
      }
      return session;
    },
  },
});
