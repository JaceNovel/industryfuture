import path from "node:path";
import { put } from "@vercel/blob";

const LEGACY_STORAGE_HOSTS = new Set([
  "api.futurind.space",
  "futurind.space",
  "www.futurind.space",
]);

const CONTENT_TYPE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function slugify(input) {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}

function normalizeBaseUrl(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.replace(/\/$/, "") : "";
}

export function isBlobUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl ?? ""));
    return url.hostname.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function rewriteLegacyAssetUrl(rawUrl, legacyAssetBaseUrl = process.env.LEGACY_ASSET_BASE_URL) {
  const value = String(rawUrl ?? "").trim();
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  const baseUrl = normalizeBaseUrl(legacyAssetBaseUrl);
  if (baseUrl && LEGACY_STORAGE_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith("/storage/")) {
    return `${baseUrl}${parsed.pathname}${parsed.search}`;
  }

  return parsed.toString();
}

function extensionFromUrlOrContentType(sourceUrl, contentType) {
  try {
    const parsed = new URL(sourceUrl);
    const ext = path.extname(parsed.pathname);
    if (ext && ext.length <= 8) {
      return ext.toLowerCase();
    }
  } catch {
    // ignore
  }

  return CONTENT_TYPE_EXTENSIONS[String(contentType ?? "").toLowerCase()] ?? ".bin";
}

export async function persistRemoteAssetUrl(rawUrl, options = {}) {
  const value = String(rawUrl ?? "").trim();
  if (!value) return null;
  if (isBlobUrl(value)) return value;

  const blobToken = String(options.blobToken ?? process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
  if (!blobToken) {
    return value;
  }

  const sourceUrl = rewriteLegacyAssetUrl(value, options.legacyAssetBaseUrl);
  const response = await fetch(sourceUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Unable to fetch asset (${response.status}) from ${sourceUrl}`);
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const extension = extensionFromUrlOrContentType(sourceUrl, contentType);
  const fileName = path.basename(new URL(sourceUrl).pathname, extension) || options.fileName || "asset";
  const blob = await put(
    `${options.directory ?? "media"}/${Date.now()}-${slugify(fileName)}${extension}`,
    Buffer.from(await response.arrayBuffer()),
    {
      access: "public",
      token: blobToken,
      addRandomSuffix: true,
      contentType,
    },
  );

  return blob.url;
}