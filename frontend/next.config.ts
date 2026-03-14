import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(frontendRoot, "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
