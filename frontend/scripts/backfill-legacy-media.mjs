import { PrismaClient } from "@prisma/client";
import { isBlobUrl, persistRemoteAssetUrl } from "./lib/media-to-blob.mjs";

const prisma = new PrismaClient({ log: ["error"] });

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? "").trim());
}

async function backfillCategories(summary) {
  const categories = await prisma.category.findMany({
    where: { image_url: { not: null } },
    select: { id: true, slug: true, image_url: true },
  });

  for (const category of categories) {
    const currentUrl = String(category.image_url ?? "").trim();
    if (!currentUrl || !isHttpUrl(currentUrl) || isBlobUrl(currentUrl)) continue;

    try {
      const imageUrl = await persistRemoteAssetUrl(currentUrl, {
        directory: "categories",
        fileName: category.slug,
      });
      if (!imageUrl || imageUrl === currentUrl) continue;

      await prisma.category.update({ where: { id: category.id }, data: { image_url: imageUrl } });
      summary.updated += 1;
    } catch (error) {
      summary.skipped += 1;
      console.warn(`[category:${category.slug}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function backfillProductImages(summary) {
  const images = await prisma.productImage.findMany({
    select: { id: true, product_id: true, url: true, alt: true },
  });

  for (const image of images) {
    const currentUrl = String(image.url ?? "").trim();
    if (!currentUrl || !isHttpUrl(currentUrl) || isBlobUrl(currentUrl)) continue;

    try {
      const blobUrl = await persistRemoteAssetUrl(currentUrl, {
        directory: "products",
        fileName: image.alt || `product-${image.product_id}`,
      });
      if (!blobUrl || blobUrl === currentUrl) continue;

      await prisma.productImage.update({ where: { id: image.id }, data: { url: blobUrl } });
      summary.updated += 1;
    } catch (error) {
      summary.skipped += 1;
      console.warn(`[product-image:${image.id}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN.");
  }

  const summary = { updated: 0, skipped: 0 };
  await backfillCategories(summary);
  await backfillProductImages(summary);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });