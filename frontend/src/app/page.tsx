"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ClipboardList, Gift, Globe, Percent, Sparkles, Tag, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2)} €`;
}

const samplePopular: Array<Pick<Product, "name" | "price">> = [
  { name: "Variateur industriel", price: 129.9 },
  { name: "Capteur de pression", price: 39.9 },
  { name: "Moteur 3 phases", price: 249.0 },
  { name: "Automate programmable", price: 189.0 },
  { name: "Kit maintenance", price: 24.9 },
];

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

type PopularItem = Pick<Product, "name" | "price"> | Product;

function ProductTile({ item, idx }: { item: PopularItem; idx: number }) {
  const isReal = "slug" in item;
  const href = isReal ? `/product/${item.slug}` : "/shop";
  const img = isReal ? (item.images?.[0]?.url ?? PLACEHOLDER_IMG) : PLACEHOLDER_IMG;

  return (
    <Link
      key={isReal ? (item.id ?? item.slug) : `sample-${idx}`}
      href={href}
      className="group w-[76vw] max-w-[260px] shrink-0 rounded-xl border bg-card/40 backdrop-blur hover:bg-muted/20 sm:w-[250px]"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-muted/20">
        {img.startsWith("/") ? (
          <div className="relative h-full w-full p-3 sm:p-6">
            <Image
              src={img}
              alt={item.name}
              fill
              sizes="(min-width: 1024px) 250px, (min-width: 640px) 250px, 76vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={isReal ? (item.images?.[0]?.alt ?? item.name) : item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="space-y-1 p-3 sm:space-y-2 sm:p-4">
        <div className="truncate font-medium">{item.name}</div>
        <div className="text-sm text-muted-foreground">{formatPrice(item.price)}</div>
      </div>
    </Link>
  );
}

function ProductMarqueeRow({ items, direction }: { items: PopularItem[]; direction: "left" | "right" }) {
  const loopItems = [...items, ...items];

  return (
    <div className="overflow-hidden">
      <div className={`home-marquee-track ${direction === "left" ? "home-marquee-left" : "home-marquee-right"}`}>
        {loopItems.map((item, idx) => (
          <ProductTile
            key={`${"slug" in item ? item.id ?? item.slug : `sample-${idx % items.length}`}-${idx}`}
            item={item}
            idx={idx}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const featuredQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => apiGet<{ data: Product[] }>("/api/products?sort=featured"),
  });
  const featured = featuredQuery.data?.data ?? [];
  const popularItems: PopularItem[] = (featured.length ? featured : samplePopular).slice(0, 5);
  const secondaryItems: PopularItem[] = (featured.length > 5 ? featured.slice(5, 10) : featured).length
    ? (featured.length > 5 ? featured.slice(5, 10) : featured).slice(0, 5)
    : samplePopular.slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-chart-2/30 bg-chart-2/30 backdrop-blur supports-[backdrop-filter]:bg-chart-2/30">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-chart-2/40 via-background to-chart-2/25" />
        <div className="grid gap-6 p-5 sm:gap-8 sm:p-8 md:grid-cols-2 md:items-center md:p-12">
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="gap-2 border border-destructive/30 bg-destructive/15 text-destructive"
              >
                <Sparkles className="h-4 w-4" />
                Futur d’industrie, prêt à déployer
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
            >
              Une boutique industrielle rapide, sobre, efficace.
            </motion.h1>
            <div className="max-w-prose space-y-3 text-sm text-muted-foreground">
              <p>
                Trouvez vos produits en quelques secondes, ajoutez au panier et passez commande simplement.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border bg-background/60 px-3 py-2">
                  <span className="font-medium text-foreground">Catalogue clair</span>
                  <div>Recherche + catégories + filtres.</div>
                </div>
                <div className="hidden rounded-lg border bg-background/60 px-3 py-2 sm:block">
                  <span className="font-medium text-foreground">Livraison</span>
                  <div>Badges prêt / sur commande.</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="gap-2">
                <Link href="/shop">
                  Accéder au shop <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!token ? (
                <Button asChild variant="destructive">
                  <Link href="/auth/login">Connexion</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="hidden gap-4 sm:grid">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-card/40 backdrop-blur">
                <CardHeader className="space-y-0">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4" />
                    Livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">Prêt / Sur commande</div>
                  <div className="flex items-baseline justify-between rounded-lg border bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground">Ventes 24H/24</span>
                    <span className="text-lg font-semibold text-foreground">21</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/40 backdrop-blur">
                <CardHeader className="space-y-0">
                  <CardTitle className="text-sm font-medium">Importation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">Importez vos articles</div>
                  <div className="flex items-baseline justify-between rounded-lg border bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground">Utilisateurs inscrits</span>
                    <span className="text-lg font-semibold text-foreground">12</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Produits populaires</h2>
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="/shop" className="inline-flex items-center gap-2">
              Voir tous les produits <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4">
          {featuredQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : null}
          {featuredQuery.isError ? (
            <div className="text-sm text-muted-foreground">API indisponible, produits d’exemple affichés.</div>
          ) : null}

          <div className="mt-4 space-y-4">
            <ProductMarqueeRow items={popularItems} direction="right" />
            <ProductMarqueeRow items={secondaryItems} direction="left" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="rounded-2xl border bg-destructive/5 px-4 py-10 md:px-10">
          <div className="text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-destructive md:text-3xl">
              Comment ça marche ?
            </h2>
            <p className="mt-2 text-sm text-destructive/80">
              Un processus simple en 4 étapes pour vos importations
            </p>
          </div>

          {/* Mobile: compact zig-zag rows */}
          <div className="mt-8 space-y-3 sm:hidden">
            <div className="flex">
              <div className="flex w-[92%] items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Globe className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="font-medium text-destructive">Importation</div>
                    <div className="truncate text-sm text-muted-foreground">Sélection produits</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="flex w-[92%] items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <ClipboardList className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="font-medium text-destructive">Commande</div>
                    <div className="truncate text-sm text-muted-foreground">Commande rapide</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex">
              <div className="flex w-[92%] items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="font-medium text-destructive">Expédition</div>
                    <div className="truncate text-sm text-muted-foreground">Envoi groupé</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="flex w-[92%] items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Truck className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="font-medium text-destructive">Livraison</div>
                    <div className="truncate text-sm text-muted-foreground">Chez vous</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop/tablet: cards */}
          <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-background transition-transform duration-200 will-change-transform hover:-translate-y-1">
              <CardHeader className="items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <Globe className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-lg text-destructive">Importation</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-destructive/80">
                Nous sélectionnons les meilleurs produits pour vous
              </CardContent>
            </Card>

            <Card className="bg-background transition-transform duration-200 will-change-transform hover:-translate-y-1">
              <CardHeader className="items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <ClipboardList className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-lg text-destructive">Commande</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-destructive/80">
                Passez votre commande en quelques clics
              </CardContent>
            </Card>

            <Card className="bg-background transition-transform duration-200 will-change-transform hover:-translate-y-1">
              <CardHeader className="items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-lg text-destructive">Expédition</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-destructive/80">
                Nous regroupons et expédions vos produits
              </CardContent>
            </Card>

            <Card className="bg-background transition-transform duration-200 will-change-transform hover:-translate-y-1">
              <CardHeader className="items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <Truck className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-lg text-destructive">Livraison</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-destructive/80">
                Recevez vos produits directement chez vous
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-chart-3 via-chart-2 to-chart-3">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:items-center md:p-12">
            <div className="space-y-4 text-primary-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
                <Percent className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Promotions</h2>
              <p className="max-w-prose text-sm text-primary-foreground/90">
                Découvrez nos meilleures offres et économisez sur vos achats préférés.
              </p>
              <Button asChild variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                <Link href="/promotions">Voir les promotions</Link>
              </Button>
            </div>

            {/* Mobile: compact zig-zag rows */}
            <div className="space-y-3 sm:hidden">
              <div className="flex">
                <div className="flex w-[92%] items-center justify-between gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 px-4 py-3 text-primary-foreground">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                      <Percent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 truncate font-semibold">Jusqu'à -50%</div>
                  </div>
                  <div className="truncate text-sm text-primary-foreground/85">Sélection</div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="flex w-[92%] items-center justify-between gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 px-4 py-3 text-primary-foreground">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 truncate font-semibold">2 pour 1</div>
                  </div>
                  <div className="truncate text-sm text-primary-foreground/85">Accessoires</div>
                </div>
              </div>

              <div className="flex">
                <div className="flex w-[92%] items-center justify-between gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 px-4 py-3 text-primary-foreground">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 truncate font-semibold">Cadeau offert</div>
                  </div>
                  <div className="truncate text-sm text-primary-foreground/85">Dès 10k</div>
                </div>
              </div>
            </div>

            {/* Desktop/tablet: cards */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-3">
              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 p-6 text-center text-primary-foreground">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Percent className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold">Jusqu'à -50%</div>
                <div className="mt-1 text-sm text-primary-foreground/85">Sur une sélection d'articles</div>
              </div>

              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 p-6 text-center text-primary-foreground">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Tag className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold">2 pour 1</div>
                <div className="mt-1 text-sm text-primary-foreground/85">Sur les accessoires</div>
              </div>

              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 p-6 text-center text-primary-foreground">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Gift className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold">Cadeau Offert</div>
                <div className="mt-1 text-sm text-primary-foreground/85">Dès 10 000 FCFA d'achat</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
