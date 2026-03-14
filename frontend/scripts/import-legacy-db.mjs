import pg from "pg";
import { PrismaClient } from "@prisma/client";

const legacyUrl = process.env.LEGACY_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!legacyUrl) {
  console.error("Missing LEGACY_DATABASE_URL.");
  process.exit(1);
}

if (!targetUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const prisma = new PrismaClient({ log: ["error"] });
const legacy = new pg.Client({
  connectionString: legacyUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await legacy.connect();

  const categoriesRes = await legacy.query(`
    SELECT id, name, slug, description, image_url, icon
    FROM categories
    ORDER BY id ASC
  `);

  const categoryIdsByLegacyId = new Map();
  for (const row of categoriesRes.rows) {
    const category = await prisma.category.upsert({
      where: { slug: row.slug },
      update: {
        name: row.name,
        description: row.description,
        image_url: row.image_url,
        icon: row.icon,
      },
      create: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        image_url: row.image_url,
        icon: row.icon,
      },
      select: { id: true },
    });
    categoryIdsByLegacyId.set(String(row.id), category.id);
  }

  const productsRes = await legacy.query(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.compare_at_price,
      p.stock,
      p.status,
      p.tag_delivery,
      p.delivery_delay_days,
      p.sku,
      p.metadata,
      p.featured,
      p.is_promo,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'url', pi.url,
          'alt', pi.alt,
          'sort_order', pi.sort_order
        )) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) AS images,
      COALESCE(
        json_agg(DISTINCT cp.category_id) FILTER (WHERE cp.category_id IS NOT NULL),
        '[]'::json
      ) AS category_ids
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN category_product cp ON cp.product_id = p.id
    GROUP BY p.id
    ORDER BY p.id ASC
  `);

  let created = 0;
  let updated = 0;
  let images = 0;

  for (const row of productsRes.rows) {
    const existing = await prisma.product.findUnique({
      where: { slug: row.slug },
      select: { id: true },
    });

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            slug: row.slug,
            description: row.description,
            price: row.price,
            compare_at_price: row.compare_at_price,
            stock: row.stock,
            status: row.status,
            tag_delivery: row.tag_delivery,
            delivery_delay_days: row.delivery_delay_days,
            sku: row.sku,
            metadata: row.metadata,
            featured: Boolean(row.featured),
            is_promo: Boolean(row.is_promo),
          },
          select: { id: true },
        })
      : await prisma.product.create({
          data: {
            name: row.name,
            slug: row.slug,
            description: row.description,
            price: row.price,
            compare_at_price: row.compare_at_price,
            stock: row.stock,
            status: row.status,
            tag_delivery: row.tag_delivery,
            delivery_delay_days: row.delivery_delay_days,
            sku: row.sku,
            metadata: row.metadata,
            featured: Boolean(row.featured),
            is_promo: Boolean(row.is_promo),
          },
          select: { id: true },
        });

    if (existing) updated += 1;
    else created += 1;

    await prisma.$transaction(async (tx) => {
      await tx.categoryProduct.deleteMany({ where: { product_id: product.id } });

      const mappedCategoryIds = (Array.isArray(row.category_ids) ? row.category_ids : [])
        .map((legacyId) => categoryIdsByLegacyId.get(String(legacyId)))
        .filter(Boolean);

      if (mappedCategoryIds.length) {
        await tx.categoryProduct.createMany({
          data: mappedCategoryIds.map((category_id) => ({ product_id: product.id, category_id })),
        });
      }

      await tx.productImage.deleteMany({ where: { product_id: product.id } });

      const productImages = Array.isArray(row.images) ? row.images : [];
      if (productImages.length) {
        await tx.productImage.createMany({
          data: productImages
            .filter((image) => image && image.url)
            .map((image, index) => ({
              product_id: product.id,
              url: image.url,
              alt: image.alt ?? null,
              sort_order: Number.isInteger(image.sort_order) ? image.sort_order : index,
            })),
        });
        images += productImages.length;
      }
    });
  }

  console.log(JSON.stringify({ categories: categoriesRes.rows.length, products: productsRes.rows.length, created, updated, images }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([legacy.end(), prisma.$disconnect()]);
  });