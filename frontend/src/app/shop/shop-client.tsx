"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
import { motion } from "framer-motion";
import { ArrowUpDown, Filter, Search } from "lucide-react";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page?: number;
  total?: number;
};

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const DARK_BLUE_GRADIENT = "radial-gradient(900px 300px at 20% 0%, rgb(46, 47, 49), transparent 60%), radial-gradient(700px 240px at 90% 20%, rgb(46, 47, 49), transparent 55%)";
const GOLD_GRADIENT = "linear-gradient(135deg, #f9e79f, #d4af37, #b8860b)";
const REAL_GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";
function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  return `${formatted} F CFA`;
}

export default function ShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams]);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page") ?? 1);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  });

  // Keep local state in sync when the URL changes (e.g. user clicks a category link while already on /shop)
  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextSort = searchParams.get("sort") ?? "newest";
    const nextCategory = searchParams.get("category") ?? "";
    const nextMinPrice = searchParams.get("minPrice") ?? "";
    const nextMaxPrice = searchParams.get("maxPrice") ?? "";
    const nextTag = searchParams.get("tag") ?? "";
    const rawPage = Number(searchParams.get("page") ?? 1);
    const nextPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

    if (search !== nextSearch) setSearch(nextSearch);
    if (sort !== nextSort) setSort(nextSort);
    if (category !== nextCategory) setCategory(nextCategory);
    if (minPrice !== nextMinPrice) setMinPrice(nextMinPrice);
    if (maxPrice !== nextMaxPrice) setMaxPrice(nextMaxPrice);
    if (tag !== nextTag) setTag(nextTag);
    if (page !== nextPage) setPage(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

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
    p.set("page", String(page));
    return p.toString();
  }, [search, category, minPrice, maxPrice, tag, sort, page]);

  const productsQuery = useQuery({
    queryKey: ["products", queryString],
    queryFn: () => apiGet<ProductsResponse>(`/api/products?${queryString}`),
  });

  const hasSearch = search.trim().length > 0;
  const noSearchResult = !productsQuery.isLoading && !productsQuery.isError && (productsQuery.data?.data?.length ?? 0) === 0 && hasSearch;

  const similarProductsQuery = useQuery({
    queryKey: ["products", "similar-fallback", search.trim().toLowerCase()],
    queryFn: () => apiGet<ProductsResponse>("/api/products?sort=newest&perPage=8"),
    enabled: noSearchResult,
  });

  const applyToUrl = () => {
    setPage(1);

    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category) p.set("category", category);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (tag) p.set("tag", tag);
    if (sort) p.set("sort", sort);
    p.set("page", "1");

    router.push(`/shop?${p.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.floor(nextPage));
    setPage(safePage);

    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(safePage));
    router.push(`/shop?${p.toString()}`);
  };

  const Filters = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <select
          className="h-11 w-full rounded-full border border-[#d4af37]/25 bg-white/70 px-4 text-sm text-slate-900 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] outline-none transition-all focus:border-[#d4af37]/55 focus:ring-2 focus:ring-[#d4af37]/20"
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
          className="h-11 w-full rounded-full border border-[#d4af37]/25 bg-white/70 px-4 text-sm text-slate-900 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] outline-none transition-all focus:border-[#d4af37]/55 focus:ring-2 focus:ring-[#d4af37]/20"
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
          <Label>Min FCFA</Label>
          <Input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            inputMode="decimal"
            className="h-11 rounded-full border-[#d4af37]/25 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
          />
        </div>
        <div className="space-y-2">
          <Label>Max FCFA</Label>
          <Input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            inputMode="decimal"
            className="h-11 rounded-full border-[#d4af37]/25 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="inline-flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-[#8b6b16]" /> Tri
        </Label>
        <select
          className="h-11 w-full rounded-full border border-[#d4af37]/25 bg-white/70 px-4 text-sm text-slate-900 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] outline-none transition-all focus:border-[#d4af37]/55 focus:ring-2 focus:ring-[#d4af37]/20"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Nouveaux</option>
          <option value="featured">Featured</option>
          <option value="price_asc">Prix ↑</option>
          <option value="price_desc">Prix ↓</option>
        </select>
      </div>

   <Button
  className="w-full rounded-full border-none text-white shadow-[0_16px_32px_-24px_rgba(212,175,55,0.8)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(212,175,55,0.85)]"
  style={{ backgroundImage: REAL_GOLD_GRADIENT }}
  onClick={applyToUrl}
>
  Appliquer
</Button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  className="relative overflow-hidden rounded-[28px] border border-slate-800/20 p-6 ..."
>
        <div
  className="pointer-events-none absolute inset-0"
  style={{
    backgroundColor: "#172953",
    opacity: 0.9, 
  }}
/>


        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold tracking-tight text-white md:text-4xl">
  Catalogue
</h1>
           <p className="text-sm text-white">
  Recherche, tri et filtres.
</p>
          </div>
          <div className="hidden h-px w-full max-w-xs md:block" style={{ backgroundImage: DARK_BLUE_GRADIENT }} />
        </div>

        <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-80">
            {/** Animation zoom du texte 'Recherche' et gestion du placeholder */}
            {(() => {
              const [animateZoom, setAnimateZoom] = useState(false);
              useEffect(() => {
                setAnimateZoom(true);
                const timer = setTimeout(() => setAnimateZoom(false), 600);
                return () => clearTimeout(timer);
              }, []);
              return (
                <>
                  <input
                    type="text"
                    placeholder={animateZoom ? "" : "Recherche"}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyToUrl();
                    }}
                    className="w-full rounded-lg border border-gray-400 bg-white px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:border-gray-500"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={20} />
                  {animateZoom && (
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    >
                      Recherche
                    </motion.span>
                  )}
                </>
              );
            })()}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                className="h-11 w-full gap-2 rounded-full border-none text-white font-semibold md:hidden"
                style={{ backgroundColor: '#d4af37' }}
              >
                <Filter className="h-5 w-5 text-white" /> Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] p-6">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{Filters}</div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-5 md:grid-cols-[300px_1fr]">
        <aside className="hidden md:block">
          <Card className="rounded-[24px] border border-[#d4af37]/18 bg-white/60 shadow-[0_22px_46px_-42px_rgba(212,175,55,0.55)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">Filtres</CardTitle>
            </CardHeader>
            <CardContent>{Filters}</CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <div className="h-px w-full" style={{ backgroundImage: DARK_BLUE_GRADIENT }} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {productsQuery.data?.total != null ? (
                <span>
                  {productsQuery.data.total} produit(s) — page {productsQuery.data.current_page} / {productsQuery.data.last_page}
                </span>
              ) : null}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => goToPage(Math.max(1, (productsQuery.data?.current_page ?? page) - 1))}
                disabled={(productsQuery.data?.current_page ?? page) <= 1 || productsQuery.isLoading}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => goToPage((productsQuery.data?.current_page ?? page) + 1)}
                disabled={
                  productsQuery.isLoading ||
                  (productsQuery.data?.last_page != null && (productsQuery.data?.current_page ?? page) >= productsQuery.data.last_page)
                }
              >
                Suivant
              </Button>
            </div>
          </div>
          {productsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : productsQuery.isError ? (
            <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
          ) : null}

          <div className="products-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(productsQuery.data?.data ?? []).map((p, idx) => {
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
                  </Link>

                  <div className="product-content relative space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="product-title truncate text-base font-semibold text-slate-950">{p.name}</div>
                        <div className="product-price mt-0.5 text-sm font-medium text-[#8b6b16]">{formatPrice(p.price)}</div>
                      </div>
                      {p.tag_delivery ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 rounded-full border border-[#d4af37]/25 bg-[#faf8f4] text-[11px] text-[#694d08]"
                        >
                          {p.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRÊT" : "COMMANDE"}
                        </Badge>
                      ) : null}
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full border-[#d4af37]/30 bg-white/60 text-[#694d08] shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] transition-all hover:bg-[#fffaf0] hover:shadow-[0_16px_28px_-18px_rgba(212,175,55,0.75)]"
                    >
                      <Link href={href}>Voir le produit</Link>
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {noSearchResult ? (
            <div className="space-y-4 rounded-2xl border border-[#d4af37]/22 bg-white/80 p-4 sm:p-6">
              <p className="text-sm text-slate-700">
                Si vous ne trouvez pas un article, veuillez accéder au service d&apos;importation.
              </p>
              <Button asChild className="rounded-full border-none text-[#3f2e05]" style={{ backgroundImage: GOLD_GRADIENT }}>
                <Link href="/import-service">Accéder au service d&apos;importation</Link>
              </Button>

              <Separator />

              <div>
                <h3 className="text-base font-semibold text-slate-900">Articles similaires</h3>
                <div className="products-grid mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(similarProductsQuery.data?.data ?? []).slice(0, 8).map((p, idx) => {
                    const img = p.images?.[0]?.url;
                    const href = `/product/${p.slug}`;
                    return (
                      <motion.article
                        key={`similar-${p.id ?? p.slug}`}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.45, delay: Math.min(idx, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="product-card group relative overflow-hidden rounded-[20px] border border-[#d4af37]/22 bg-white shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)]"
                      >
                        <Link href={href} className="relative block">
                          <div className="product-media aspect-[4/3] overflow-hidden rounded-t-[20px] bg-[#faf8f4]">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={p.images?.[0]?.alt ?? p.name} className="h-full w-full object-contain" loading="lazy" />
                            ) : (
                              <div className="relative h-full w-full p-6">
                                <Image src={PLACEHOLDER_IMG} alt={p.name} fill sizes="100vw" className="object-contain opacity-95" />
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="product-content relative space-y-2 p-4">
                          <div className="product-title truncate text-base font-semibold text-slate-950">{p.name}</div>
                          <div className="product-price text-sm font-medium text-[#8b6b16]">{formatPrice(p.price)}</div>
                          <Button asChild variant="outline" className="w-full rounded-full border-[#d4af37]/30 bg-white/60 text-[#694d08]">
                            <Link href={href}>Voir le produit</Link>
                          </Button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}