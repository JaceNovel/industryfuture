import { PrismaClient } from "@prisma/client";

declare global {
  var __industryfuture_prisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__industryfuture_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__industryfuture_prisma__ = prisma;
}