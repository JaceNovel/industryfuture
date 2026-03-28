import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function resolvePrismaCommand() {
  const isWindows = process.platform === "win32";
  const localBin = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    isWindows ? "prisma.cmd" : "prisma"
  );

  if (fs.existsSync(localBin)) return localBin;
  return isWindows ? "prisma.cmd" : "prisma";
}

function run(prismaArgs, extraEnv = {}) {
  execFileSync(resolvePrismaCommand(), prismaArgs, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function runNode(nodeArgs, extraEnv = {}) {
  execFileSync(process.execPath, nodeArgs, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("[prisma:deploy] DATABASE_URL not set; skipping schema deployment.");
  process.exit(0);
}

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const hasMigrations =
  fs.existsSync(migrationsDir) &&
  fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .some((entry) => entry.isDirectory());

console.log(
  `[prisma:deploy] Applying Prisma schema via ${
    hasMigrations ? "migrate deploy" : "db push"
  }...`
);

// Ensure Prisma Client is in sync with the deployed schema
run(["generate"]);

if (hasMigrations) {
  run(["migrate", "deploy"]);
} else {
  // Repo currently ships without migrations; db push is the safest default to
  // create missing tables in a fresh DB (used by README local setup).
  run(["db", "push"]);
}

// Optional: bootstrap an initial admin user so production isn't locked out.
// Requires BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD.
try {
  runNode(["scripts/bootstrap-admin.mjs"]);
} catch (error) {
  console.log("[prisma:deploy] Admin bootstrap step failed; continuing.");
  if (error instanceof Error) {
    console.log(`[prisma:deploy] ${error.message}`);
  }
}
