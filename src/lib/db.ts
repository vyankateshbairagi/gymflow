import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Standard Next.js Prisma singleton pattern: in development, Next.js hot
// reloads modules, which would otherwise create a new PrismaClient (and a
// new DB connection pool) on every reload. Stashing the instance on the
// global object survives hot reloads. In production, each server instance
// gets exactly one client for its lifetime.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
