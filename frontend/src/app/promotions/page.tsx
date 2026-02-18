"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2)} €`;
}

export default function PromotionsPage() {
  const productsQuery = useQuery({
    queryKey: ["products", "promotions"],
    queryFn: () => apiGet<ProductsResponse>("/api/products?promo=1&sort=newest"),
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
        </div>
        <Link href="/shop" className="text-sm underline underline-offset-4 hover:text-foreground">
          Voir tous les produits
        </Link>
      </div>

      <div className="mt-6">
        {productsQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : null}
        {productsQuery.isError ? (
          <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.images?.[0]?.url;

            return (
              <Link
                key={p.id ?? p.slug}
                href={`/product/${p.slug}`}
                className="group rounded-xl border bg-card/40 backdrop-blur hover:bg-muted/20"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-muted/20">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.images?.[0]?.alt ?? p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="relative h-full w-full p-3 sm:p-6">
                      <Image
                        src={PLACEHOLDER_IMG}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, 50vw"
                        className="object-contain opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3 sm:space-y-2 sm:p-4">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground sm:text-sm">{formatPrice(p.price)}</div>
                </div>
              </Link>
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
