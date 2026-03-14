import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

function usage() {
  console.log("Usage: npm run import:products -- /absolute/or/relative/path/to/products.json");
}

function slugify(input) {
  const base = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || "item";
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function deliveryTagFromText(name, description) {
  const haystack = `${name ?? ""} ${description ?? ""}`.toLowerCase();
  return haystack.includes("stock") || haystack.includes("disponible")
    ? "PRET_A_ETRE_LIVRE"
    : "SUR_COMMANDE";
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalImagePath(jsonPath, rawImagePath) {
  const jsonDir = path.dirname(jsonPath);
  const candidates = [
    path.resolve(jsonDir, rawImagePath),
    path.resolve(jsonDir, "..", rawImagePath),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function uploadLocalImage(absPath) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return null;
  }

  const buffer = await fs.readFile(absPath);
  const ext = path.extname(absPath) || ".bin";
  const fileName = path.basename(absPath, ext);
  const blob = await put(
    `products/import-${Date.now()}-${slugify(fileName)}${ext}`,
    buffer,
    {
      access: "public",
      token: blobToken,
      addRandomSuffix: true,
    },
  );

  return blob.url;
}

async function uniqueProductSlug(rawSlug, productId = null) {
  const base = slugify(rawSlug);
  let slug = base;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.product.findFirst({
      where: {
        slug,
        ...(productId ? { id: { not: productId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function resolveCategoryIds(categoryNames) {
  const names = Array.isArray(categoryNames) ? categoryNames : [];
  const ids = [];

  for (const rawName of names) {
    const name = String(rawName ?? "").trim();
    if (!name) continue;

    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name },
      create: {
        name,
        slug: slugify(name),
      },
      select: { id: true },
    });

    ids.push(category.id);
  }

  return [...new Set(ids)];
}

async function normalizeImageUrl(jsonPath, image) {
  const rawPath = String(image?.path ?? image?.url ?? "").trim();
  if (!rawPath) return null;
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  const localPath = await resolveLocalImagePath(jsonPath, rawPath);
  if (!localPath) return null;

  return await uploadLocalImage(localPath);
}

async function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const jsonPath = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(jsonPath, "utf8");
  const payload = JSON.parse(raw);

  if (!Array.isArray(payload)) {
    throw new Error("Invalid products JSON: expected an array.");
  }

  let created = 0;
  let updated = 0;
  let imagesImported = 0;
  let imagesSkipped = 0;

  for (const row of payload) {
    if (!row || typeof row !== "object") continue;

    const name = String(row.name ?? "").trim();
    const rawSlug = String(row.slug ?? name).trim();
    if (!name && !rawSlug) continue;

    const existing = await prisma.product.findFirst({
      where: { slug: slugify(rawSlug) },
      select: { id: true, slug: true },
    });

    const slug = await uniqueProductSlug(rawSlug || name, existing?.id ?? null);
    const categoryIds = await resolveCategoryIds(row.categories);
    const data = {
      name: name || rawSlug,
      slug,
      description: row.description ? String(row.description) : null,
      price: safeNumber(row.price, 0),
      compare_at_price: row.compare_at_price == null ? null : safeNumber(row.compare_at_price, 0),
      stock: Math.max(0, Math.trunc(safeNumber(row.stock, 999))),
      status: String(row.status ?? "active"),
      tag_delivery: String(row.tag_delivery ?? deliveryTagFromText(row.name, row.description)),
      delivery_delay_days: row.delivery_delay_days == null ? null : Math.max(0, Math.trunc(safeNumber(row.delivery_delay_days, 0))),
      sku: row.sku ? String(row.sku) : null,
      metadata: row.metadata ?? null,
      featured: Boolean(row.featured),
      is_promo: Boolean(row.is_promo),
    };

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.product.create({ data, select: { id: true } });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }

    await prisma.$transaction(async (tx) => {
      await tx.categoryProduct.deleteMany({ where: { product_id: product.id } });
      if (categoryIds.length) {
        await tx.categoryProduct.createMany({
          data: categoryIds.map((category_id) => ({ product_id: product.id, category_id })),
        });
      }

      await tx.productImage.deleteMany({ where: { product_id: product.id } });

      const images = Array.isArray(row.images) ? row.images : [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const url = await normalizeImageUrl(jsonPath, image);
        if (!url) {
          imagesSkipped += 1;
          continue;
        }

        await tx.productImage.create({
          data: {
            product_id: product.id,
            url,
            alt: image?.alt ? String(image.alt) : null,
            sort_order: Number.isInteger(image?.sort_order) ? image.sort_order : index,
          },
        });
        imagesImported += 1;
      }
    });
  }

  console.log(JSON.stringify({ created, updated, imagesImported, imagesSkipped }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });