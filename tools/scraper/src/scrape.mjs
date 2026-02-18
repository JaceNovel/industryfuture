import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import slugify from "slugify";
import { stringify } from "csv-stringify/sync";

const SOURCE_URL = "https://avenir-industrie.vercel.app/";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const EXPORTS_DIR = path.join(ROOT, "exports");
const IMAGES_DIR = path.join(EXPORTS_DIR, "images");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function safeSlug(input) {
  const base = (input ?? "").toString().trim();
  const s = slugify(base || "item", { lower: true, strict: true, trim: true });
  return s || "item";
}

function extractPrice(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ");
  const match = t.match(/(\d+[\d\s]*([\.,]\d{1,2})?)\s*(€|eur)/i);
  if (!match) return null;
  const raw = match[1].replace(/\s+/g, "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function extractCategoriesFromText(text, name) {
  const lines = (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out = [];
  for (const l of lines) {
    const lower = l.toLowerCase();
    if (name && l === name) continue;
    if (extractPrice(l) !== null) continue;
    if (/(stock|disponible|€|eur)/i.test(lower)) continue;
    if (l.length > 40) continue;
    out.push(l);
  }

  return [...new Set(out)].slice(0, 3);
}

class RateLimiter {
  constructor({ minDelayMs }) {
    this.minDelayMs = minDelayMs;
    this.lastAt = 0;
  }

  async wait() {
    const now = Date.now();
    const waitMs = Math.max(0, this.minDelayMs - (now - this.lastAt));
    if (waitMs > 0) await sleep(waitMs);
    this.lastAt = Date.now();
  }
}

async function withRetry(fn, { retries = 3, baseDelayMs = 500, label = "op" } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const delay = baseDelayMs * attempt;
      console.warn(`[${nowIso()}] ${label} failed (attempt ${attempt}/${retries}): ${e?.message ?? e}`);
      if (attempt < retries) await sleep(delay);
    }
  }
  throw lastErr;
}

function isProbablyProductLink(href) {
  if (!href) return false;
  try {
    const u = new URL(href);
    if (u.origin !== new URL(SOURCE_URL).origin) return false;
    if (u.pathname === "/") return false;
    if (u.pathname.startsWith("/auth")) return false;
    return true;
  } catch {
    return false;
  }
}

async function ensureDirs() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

async function downloadImage(url, destAbsPath, limiter, { dryRun }) {
  if (dryRun) return;
  await limiter.wait();

  await withRetry(
    async () => {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "IndustryFutureScraper/1.0 (+contact@futurin.space)",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(destAbsPath, buf);
    },
    { label: `download ${url}` }
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log(`[${nowIso()}] Starting scraper`);
  console.log(`[${nowIso()}] Source: ${SOURCE_URL}`);
  console.log(`[${nowIso()}] Mode: ${dryRun ? "DRY" : "WRITE"}`);

  await ensureDirs();

  const limiter = new RateLimiter({ minDelayMs: 1000 });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "IndustryFutureScraper/1.0 (+contact@futurin.space)",
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  await limiter.wait();
  await withRetry(
    () => page.goto(SOURCE_URL, { waitUntil: "networkidle", timeout: 60_000 }),
    { label: "goto home" }
  );

  // Collect candidates: anchors with images and some text.
  const candidates = await page.$$eval("a[href]", (anchors) => {
    const out = [];
    for (const a of anchors) {
      const href = a.href;
      const img = a.querySelector("img");
      const imgUrl = img?.currentSrc || img?.src || null;
      const text = (a.innerText || "").trim();
      if (!imgUrl) continue;
      if (text.length < 2) continue;
      out.push({ href, imgUrl, text });
    }
    return out;
  });

  const byHref = new Map();
  for (const c of candidates) {
    if (!isProbablyProductLink(c.href)) continue;
    if (!byHref.has(c.href)) byHref.set(c.href, c);
  }

  const productLinks = [...byHref.values()];
  console.log(`[${nowIso()}] Found ${productLinks.length} product link candidates`);

  const products = [];

  for (let i = 0; i < productLinks.length; i++) {
    const c = productLinks[i];

    const nameLine = c.text.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "";
    const name = nameLine || "Produit";
    const slug = safeSlug(name);

    const baseObj = {
      name,
      slug,
      description: null,
      price: extractPrice(c.text),
      compare_at_price: null,
      stock: 999,
      status: "active",
      tag_delivery: /stock|disponible/i.test(c.text) ? "PRET_A_ETRE_LIVRE" : "SUR_COMMANDE",
      delivery_delay_days: null,
      categories: extractCategoriesFromText(c.text, name),
      images: [],
      source_url: c.href,
    };

    // Try visiting details page for richer content.
    await limiter.wait();

    const detail = await withRetry(
      async () => {
        const p2 = await context.newPage();
        try {
          await p2.goto(c.href, { waitUntil: "networkidle", timeout: 60_000 });
          // Best-effort selectors.
          const title = await p2
            .locator("h1")
            .first()
            .textContent()
            .then((t) => t?.trim() || null)
            .catch(() => null);

          const mainText = await p2
            .locator("main")
            .first()
            .innerText()
            .then((t) => t?.trim() || null)
            .catch(() => null);

          const allImgs = await p2.$$eval("main img", (imgs) => {
            return imgs
              .map((img) => img.currentSrc || img.src)
              .filter(Boolean);
          });

          return { title, mainText, allImgs };
        } finally {
          await p2.close();
        }
      },
      { label: `goto detail ${c.href}` }
    );

    const finalName = detail.title || baseObj.name;
    const finalSlug = safeSlug(baseObj.slug || finalName);

    const description = detail.mainText
      ? detail.mainText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 120)
          .join("\n")
      : null;

    const imageUrls = [c.imgUrl, ...(detail.allImgs || [])]
      .filter(Boolean)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));

    const uniqueImages = [];
    const seen = new Set();
    for (const u of imageUrls) {
      if (seen.has(u)) continue;
      seen.add(u);
      uniqueImages.push(u);
    }

    const images = [];
    for (let idx = 0; idx < uniqueImages.length; idx++) {
      const imgUrl = uniqueImages[idx];
      const ext = (() => {
        try {
          const u = new URL(imgUrl);
          const e = path.extname(u.pathname);
          if (e && e.length <= 5) return e;
        } catch {
          // ignore
        }
        return ".jpg";
      })();

      const filename = `${finalSlug}-${idx}${ext}`;
      const relPath = path.posix.join("exports/images", filename);
      const absPath = path.join(IMAGES_DIR, filename);

      await downloadImage(imgUrl, absPath, limiter, { dryRun });

      images.push({
        path: relPath,
        alt: finalName,
        sort_order: idx,
      });
    }

    const merged = {
      ...baseObj,
      name: finalName,
      slug: finalSlug,
      description,
      images,
      tag_delivery: /stock|disponible/i.test(`${c.text}\n${description || ""}`)
        ? "PRET_A_ETRE_LIVRE"
        : "SUR_COMMANDE",
      price: baseObj.price ?? 0,
    };

    products.push(merged);
    console.log(`[${nowIso()}] (${i + 1}/${productLinks.length}) ${merged.slug}`);
  }

  await browser.close();

  const jsonPath = path.join(EXPORTS_DIR, "products.json");
  const csvPath = path.join(EXPORTS_DIR, "products.csv");

  const csv = stringify(
    products.map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price ?? 0,
      tag_delivery: p.tag_delivery,
      categories: (p.categories || []).join("|"),
      images: (p.images || []).map((im) => im.path).join("|"),
      source_url: p.source_url,
    })),
    { header: true }
  );

  if (dryRun) {
    console.log(`[${nowIso()}] Dry-run complete. Products: ${products.length}`);
    console.log(`[${nowIso()}] Sample:`, products[0] ?? null);
    return;
  }

  await fs.writeFile(jsonPath, JSON.stringify(products, null, 2), "utf-8");
  await fs.writeFile(csvPath, csv, "utf-8");

  console.log(`[${nowIso()}] Wrote: ${path.relative(ROOT, jsonPath)}`);
  console.log(`[${nowIso()}] Wrote: ${path.relative(ROOT, csvPath)}`);
  console.log(`[${nowIso()}] Images dir: ${path.relative(ROOT, IMAGES_DIR)}`);
}

main().catch((e) => {
  console.error(`[${nowIso()}] Fatal:`, e);
  process.exitCode = 1;
});
