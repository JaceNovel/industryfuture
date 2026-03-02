"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2)} €`;
}

export default function PromotionsPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10" />}>
      <PromotionsClient />
    </Suspense>
  );
}

function PromotionsClient() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";

  const productsQuery = useQuery({
    queryKey: ["products", "promotions", category],
    queryFn: () =>
      apiGet<ProductsResponse>(
        category
          ? `/api/products?promo=1&sort=newest&category=${encodeURIComponent(category)}`
          : "/api/products?promo=1&sort=newest"
      ),
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-[#d4af37]/18 bg-white p-6 shadow-[0_26px_55px_-46px_rgba(212,175,55,0.55)] md:p-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(900px 300px at 20% 0%, rgba(212,175,55,0.16), transparent 60%), radial-gradient(700px 240px at 90% 20%, rgba(184,134,11,0.12), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-950 md:text-4xl">Promotions</h1>
            <p className="mt-1 text-sm text-slate-600">Offres sélectionnées — premium, futuriste, épuré.</p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-medium text-[#694d08] underline underline-offset-4 hover:text-[#8b6b16]"
          >
            Voir tous les produits
          </Link>
        </div>
      </motion.div>

      <div className="mt-6">
        {productsQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : null}
        {productsQuery.isError ? (
          <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
        ) : null}

        <div className="mt-4 h-px w-full" style={{ backgroundImage: GOLD_GRADIENT }} />

        <div className="products-grid mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, idx) => {
            const img = p.images?.[0]?.url;
            const href = `/product/${p.slug}`;

            return (
              <motion.article
                key={p.id ?? p.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: Math.min(idx, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className="product-card group relative overflow-hidden rounded-[20px] border border-[#d4af37]/22 bg-white shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_52px_-32px_rgba(212,175,55,0.65)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f6e27a]/8 via-transparent to-[#b8860b]/6 opacity-70" />

                <Link href={href} className="relative block">
                  <div className="product-media aspect-[4/3] overflow-hidden rounded-t-[20px] bg-[#faf8f4]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.images?.[0]?.alt ?? p.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="relative h-full w-full p-6">
                        <Image
                          src={PLACEHOLDER_IMG}
                          alt={p.name}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 100vw"
                          className="object-contain opacity-95 transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="product-content relative space-y-2 p-4">
                    <div className="product-title truncate text-base font-semibold text-slate-950">{p.name}</div>
                    <div className="product-price text-sm font-medium text-[#8b6b16]">{formatPrice(p.price)}</div>
                    <div className="mt-2 inline-flex items-center justify-center rounded-full border border-[#d4af37]/25 bg-white/60 px-3 py-1 text-xs font-medium text-[#694d08] shadow-[0_10px_20px_-16px_rgba(212,175,55,0.6)]">
                      Voir le produit
                    </div>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </div>

        {!productsQuery.isLoading && !products.length ? (
          <div className="mt-4 text-sm text-muted-foreground">Aucun article en promotion pour le moment.</div>
        ) : null}
      </div>
    </main>
  );
}
