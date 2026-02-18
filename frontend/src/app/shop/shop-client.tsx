"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Filter } from "lucide-react";

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

export default function ShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/api/categories"),
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category) p.set("category", category);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (tag) p.set("tag", tag);
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [search, category, minPrice, maxPrice, tag, sort]);

  const productsQuery = useQuery({
    queryKey: ["products", queryString],
    queryFn: () => apiGet<ProductsResponse>(`/api/products?${queryString}`),
  });

  const applyToUrl = () => {
    router.push(`/shop?${queryString}`);
  };

  const Filters = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Toutes</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Tag livraison</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="PRET_A_ETRE_LIVRE">PRÊT À ÊTRE LIVRÉ</option>
          <option value="SUR_COMMANDE">SUR COMMANDE</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Min €</Label>
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Max €</Label>
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="decimal" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tri</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Nouveaux</option>
          <option value="featured">Featured</option>
          <option value="price_asc">Prix ↑</option>
          <option value="price_desc">Prix ↓</option>
        </select>
      </div>

      <Button className="w-full" onClick={applyToUrl}>
        Appliquer
      </Button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
          <p className="text-sm text-muted-foreground">Recherche, tri et filtres.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyToUrl();
            }}
            className="w-full sm:w-80"
          />
          <Button onClick={applyToUrl} variant="secondary">
            Go
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" className="gap-2 md:hidden">
                <Filter className="h-4 w-4" /> Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{Filters}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:block">
          <Card className="bg-card/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Filtres</CardTitle>
            </CardHeader>
            <CardContent>{Filters}</CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Separator />
          {productsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : productsQuery.isError ? (
            <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {(productsQuery.data?.data ?? []).map((p) => {
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
                      <div className="relative h-full w-full p-6">
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground sm:text-sm">{formatPrice(p.price)}</div>
                      </div>
                      {p.tag_delivery ? (
                        <Badge variant="secondary" className="shrink-0">
                          {p.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRÊT" : "COMMANDE"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
