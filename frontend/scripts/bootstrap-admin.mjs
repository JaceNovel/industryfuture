import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
const name = (process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Admin").slice(0, 255);

if (!process.env.DATABASE_URL) {
  console.log("[bootstrap-admin] DATABASE_URL not set; skipping.");
  process.exit(0);
}

if (!email || !password) {
  console.log("[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set; skipping.");
  process.exit(0);
}

if (password.length < 8) {
  console.log("[bootstrap-admin] Password must be at least 8 characters; skipping.");
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { id: true, email: true, role: true },
  });

  if (existing) {
    console.log(`[bootstrap-admin] User already exists (${existing.email}); role=${existing.role}.`);
    process.exit(0);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: "admin",
      password: await hash(password, 10),
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`[bootstrap-admin] Admin user created: ${user.email} (id=${user.id}).`);
} finally {
  await prisma.$disconnect().catch(() => null);
}
