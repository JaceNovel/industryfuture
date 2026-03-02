"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Product, ProductReview, ProductReviewsResponse } from "@/lib/types";
import { flyToCart } from "@/lib/fly-to-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ShoppingCart, Star, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61578635757172";
const TIKTOK_URL = "https://www.tiktok.com/@a_d_a_n.gladiator?_r=1&_t=ZS-941CIvuHTwv";
const INSTAGRAM_URL = "https://www.instagram.com/meslmenehasn?utm_source=qr&igsh=YjJ5aTRid3Zkangy";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

function FacebookLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06C2 17.08 5.657 21.24 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.196 2.238.196v2.475h-1.261c-1.243 0-1.631.78-1.631 1.58v1.88h2.773l-.443 2.91h-2.33V22C18.343 21.24 22 17.08 22 12.06z" />
    </svg>
  );
}

function InstagramLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z" />
      <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M17.25 6.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
    </svg>
  );
}

function TikTokLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 3v10.06a3.94 3.94 0 1 1-3-3.82V7.06A6 6 0 1 0 16 12V7.2c1.08 1.02 2.52 1.65 4 1.72V6.5c-2.21-.19-3.78-1.43-4.62-3.5H14z" />
    </svg>
  );
}

function formatPriceCFA(v: unknown) {
  const n = Number(v ?? 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  return `${formatted} F CFA`;
}

function getBrand(product: Product) {
  const m = product.metadata ?? {};
  const maybe = (m as Record<string, unknown>).brand ?? (m as Record<string, unknown>).marque;
  if (typeof maybe === "string" && maybe.trim()) return maybe.trim();
  return "N/A";
}

function getTags(product: Product) {
  const m = product.metadata ?? {};
  const maybe = (m as Record<string, unknown>).tags ?? (m as Record<string, unknown>).keywords;
  if (Array.isArray(maybe)) {
    return maybe.map((t) => String(t)).filter(Boolean).join(", ");
  }
  if (typeof maybe === "string") return maybe;
  return "";
}

function getTransportPrices(product: Product): { air: number | null; sea: number | null } {
  const m = (product.metadata ?? {}) as Record<string, unknown>;
  const t = (m.transport_prices ?? {}) as Record<string, unknown>;

  const airRaw = t.air ?? t.avion;
  const seaRaw = t.sea ?? t.bateau;

  const air = airRaw == null ? null : Number(airRaw);
  const sea = seaRaw == null ? null : Number(seaRaw);

  return {
    air: Number.isFinite(air as number) ? (air as number) : null,
    sea: Number.isFinite(sea as number) ? (sea as number) : null,
  };
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: ["product", params.slug],
    queryFn: () => apiGet<Product>(`/api/products/${params.slug}`),
  });

  const product = productQuery.data;
  const [transportMode, setTransportMode] = useState<"air" | "sea">("air");

  const mainImage = useMemo(() => product?.images?.[0]?.url ?? PLACEHOLDER_IMG, [product]);
  const [imgSrc, setImgSrc] = useState<string>(PLACEHOLDER_IMG);

  useEffect(() => {
    setImgSrc(mainImage);
  }, [mainImage]);

  useEffect(() => {
    if (!product) return;
    const prices = getTransportPrices(product);
    if (prices.air != null) {
      setTransportMode("air");
      return;
    }
    if (prices.sea != null) {
      setTransportMode("sea");
    }
  }, [product]);

  const [tab, setTab] = useState<"reviews" | "write">("reviews");
  const [limit, setLimit] = useState(5);

  const reviewsQuery = useQuery({
    queryKey: ["product-reviews", params.slug, limit],
    queryFn: () => apiGet<ProductReviewsResponse>(`/api/products/${params.slug}/reviews?limit=${limit}`),
    enabled: Boolean(params.slug),
  });

  const reviews = reviewsQuery.data?.data ?? [];
  const reviewsMeta = reviewsQuery.data?.meta ?? { total: 0, average: 0, breakdown: {}, limit };

  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");

  const createReview = useMutation({
    mutationFn: () =>
      apiPost<ProductReview>(`/api/products/${params.slug}/reviews`, {
        rating,
        title: reviewTitle,
        body: reviewBody,
        name: reviewName,
        email: reviewEmail,
      }),
    onSuccess: async () => {
      setRating(0);
      setReviewTitle("");
      setReviewBody("");
      setReviewName("");
      setReviewEmail("");
      setTab("reviews");
      setLimit(5);
      await queryClient.invalidateQueries({ queryKey: ["product-reviews", params.slug] });
    },
  });

  const addSimilarToCart = useMutation({
    mutationFn: (productId: number) => apiPost("/api/cart", { product_id: productId, qty: 1 }),
  });

  const categorySlug = product?.categories?.[0]?.slug ?? "";
  const similarQuery = useQuery({
    queryKey: ["similar-products", categorySlug],
    queryFn: () => apiGet<ProductsResponse>(`/api/products?category=${encodeURIComponent(categorySlug)}&sort=newest`),
    enabled: Boolean(categorySlug),
  });

  const similarProducts = useMemo(() => {
    const all = similarQuery.data?.data ?? [];
    return all.filter((p) => p.slug !== product?.slug).slice(0, 4);
  }, [similarQuery.data, product?.slug]);

  const transportPrices = useMemo(
    () => (product ? getTransportPrices(product) : { air: null, sea: null }),
    [product]
  );
  const hasTransportPrices = transportPrices.air != null || transportPrices.sea != null;
  const selectedTransportPrice = transportMode === "air" ? transportPrices.air : transportPrices.sea;
  const displayPrice = selectedTransportPrice ?? Number(product?.price ?? 0);

  function Stars({ value, size = 20 }: { value: number; size?: number }) {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const active = i + 1 <= value;
          return (
            <Star
              key={i}
              className={
                "" +
                (active
                  ? " text-chart-4 fill-chart-4"
                  : " text-muted-foreground/40")
              }
              style={{ width: size, height: size }}
            />
          );
        })}
      </div>
    );
  }

  function formatReviewDate(d?: string) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(dt);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {productQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : productQuery.isError ? (
        <div className="text-sm text-destructive">{(productQuery.error as Error).message}</div>
      ) : null}

      {product ? (
        <div className="space-y-10 md:space-y-12">
          <div className="grid gap-6 md:gap-10 lg:grid-cols-[1.25fr_1fr]">
          <Card className="bg-muted/20">
            <CardContent className="p-0">
              <div className="relative min-h-[240px] overflow-hidden rounded-xl border bg-muted/20 sm:min-h-[420px] lg:min-h-[520px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={product.images?.[0]?.alt ?? product.name}
                  className="h-full w-full object-contain"
                  onError={() => setImgSrc(PLACEHOLDER_IMG)}
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                >
                  <FacebookLogo className="h-4 w-4" />
                </a>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                >
                  <TikTokLogo className="h-4 w-4" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                >
                  <InstagramLogo className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{product.name}</h1>
              <div className="mt-3 text-xl font-semibold text-destructive sm:text-3xl">{formatPriceCFA(displayPrice)}</div>
              {hasTransportPrices ? (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-foreground">Mode de livraison</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTransportMode("air")}
                      disabled={transportPrices.air == null}
                      className={
                        "rounded-md border px-3 py-1.5 text-sm " +
                        (transportMode === "air"
                          ? "border-chart-2 bg-chart-2/10 text-foreground"
                          : "border-border bg-background text-muted-foreground") +
                        (transportPrices.air == null ? " cursor-not-allowed opacity-50" : "")
                      }
                    >
                      Avion {transportPrices.air != null ? `(${formatPriceCFA(transportPrices.air)})` : "(indisponible)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransportMode("sea")}
                      disabled={transportPrices.sea == null}
                      className={
                        "rounded-md border px-3 py-1.5 text-sm " +
                        (transportMode === "sea"
                          ? "border-chart-2 bg-chart-2/10 text-foreground"
                          : "border-border bg-background text-muted-foreground") +
                        (transportPrices.sea == null ? " cursor-not-allowed opacity-50" : "")
                      }
                    >
                      Bateau {transportPrices.sea != null ? `(${formatPriceCFA(transportPrices.sea)})` : "(indisponible)"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {product.description ? (
              <p className="text-base leading-relaxed text-foreground/90">{product.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Description non disponible.</p>
            )}

            <div>
              <div className="text-2xl font-semibold tracking-tight">Informations</div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="text-foreground">Catégorie</div>
                <div className="text-foreground">
                  {product.categories?.[0]?.name ?? product.categories?.[0]?.slug ?? "N/A"}
                </div>

                <div className="text-foreground">Marque</div>
                <div className="text-foreground">{getBrand(product)}</div>

                <div className="text-foreground">Stock</div>
                <div className="text-foreground">{`${product.stock ?? 0} unités`}</div>

                <div className="text-foreground">Tags</div>
                <div className="truncate text-foreground" title={getTags(product)}>
                  {getTags(product) || "—"}
                </div>
              </div>

              {product.tag_delivery ? (
                <div className="mt-5">
                  <Badge variant="secondary">
                    {product.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRÊT À ÊTRE LIVRÉ" : "SUR COMMANDE"}
                  </Badge>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <Button
                variant="destructive"
                className="h-11"
                onClick={async (e) => {
                  flyToCart(e.currentTarget as HTMLElement);
                  await apiPost("/api/cart", { product_id: product.id, qty: 1 });
                  router.push("/cart");
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Ajouter au panier
              </Button>
              <Button
                className="h-11 bg-chart-2 text-white hover:bg-chart-2/90 focus-visible:ring-chart-2/30"
                onClick={async () => {
                  await apiPost("/api/cart", { product_id: product.id, qty: 1 });
                  router.push("/checkout");
                }}
              >
                <Zap className="h-4 w-4" />
                Acheter maintenant
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
              <div>
                <span className="text-foreground">Livraison estimée:</span>{" "}
                {product.tag_delivery === "SUR_COMMANDE" ? "7-10 jours" : "1-3 jours"}
              </div>
              <div className="mt-2">Vous serez notifié par email et SMS à l'arrivée de votre commande.</div>
            </div>
          </div>
          </div>

          <div className="pt-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "reviews" | "write")} className="w-full">
              <TabsList className="w-fit">
                <TabsTrigger value="reviews">Avis clients ({reviewsMeta.total})</TabsTrigger>
                <TabsTrigger value="write">Laisser un avis</TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="mt-6">
                <Card className="bg-muted/20">
                  <CardContent className="p-6">
                    <div className="grid gap-8 md:grid-cols-[260px_1fr]">
                      <div>
                        <div className="text-5xl font-semibold text-destructive">
                          {Number(reviewsMeta.average || 0).toFixed(1)}
                        </div>
                        <div className="mt-2">
                          <Stars value={Math.round(reviewsMeta.average || 0)} size={22} />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">Basé sur {reviewsMeta.total} avis</div>
                      </div>

                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((r) => {
                          const count = Number((reviewsMeta.breakdown as any)?.[r] ?? 0);
                          const pct = reviewsMeta.total ? Math.round((count / reviewsMeta.total) * 100) : 0;
                          return (
                            <div key={r} className="grid grid-cols-[60px_1fr_30px] items-center gap-4 text-sm">
                              <div className="text-muted-foreground">{r} étoiles</div>
                              <div className="h-2 rounded-full bg-muted">
                                <div className="h-2 rounded-full bg-chart-4" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-right text-muted-foreground">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-8 space-y-8">
                  {reviewsQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground">Chargement…</div>
                  ) : reviews.length ? (
                    reviews.map((rev) => (
                      <div key={rev.id} className="border-b pb-8 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                              {(rev.name || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{rev.name}</div>
                              <div className="text-sm text-muted-foreground">{formatReviewDate(rev.created_at)}</div>
                            </div>
                          </div>
                          <Stars value={rev.rating} size={18} />
                        </div>

                        <div className="mt-4 text-base font-semibold">{rev.title}</div>
                        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{rev.body}</div>

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div>Cet avis vous a-t-il été utile ?</div>
                          <Button variant="outline" size="sm" disabled>
                            <ThumbsUp className="h-4 w-4" /> Oui ({rev.helpful_yes ?? 0})
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            <ThumbsDown className="h-4 w-4" /> Non ({rev.helpful_no ?? 0})
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Aucun avis pour le moment.</div>
                  )}

                  {reviewsMeta.total > limit ? (
                    <div className="pt-2">
                      <Button variant="outline" onClick={() => setLimit((v) => v + 5)}>
                        Voir plus
                      </Button>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="write" className="mt-6">
                <Card className="bg-muted/20">
                  <CardContent className="p-6">
                    <div className="text-2xl font-semibold tracking-tight">
                      Donnez votre avis sur {product.name}
                    </div>

                    <div className="mt-6 space-y-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Votre note</div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const v = i + 1;
                            const active = v <= rating;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setRating(v)}
                                className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                aria-label={`${v} étoiles`}
                              >
                                <Star className={active ? "h-8 w-8 text-chart-4 fill-chart-4" : "h-8 w-8 text-muted-foreground/40"} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Titre de votre avis</Label>
                        <Input
                          placeholder="Résumez votre expérience en une phrase"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Votre avis</Label>
                        <Textarea
                          placeholder="Partagez votre expérience avec ce produit..."
                          value={reviewBody}
                          onChange={(e) => setReviewBody(e.target.value)}
                          className="min-h-[160px]"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Votre nom</Label>
                          <Input placeholder="Prénom et nom" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Votre email</Label>
                          <Input
                            placeholder="Votre email ne sera pas publié"
                            value={reviewEmail}
                            onChange={(e) => setReviewEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        En soumettant cet avis, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
                      </div>

                      {createReview.isError ? (
                        <div className="text-sm text-destructive">{(createReview.error as Error).message}</div>
                      ) : null}

                      <Button
                        variant="destructive"
                        className="h-11"
                        onClick={() => createReview.mutate()}
                        disabled={
                          createReview.isPending ||
                          rating < 1 ||
                          !reviewTitle.trim() ||
                          !reviewBody.trim() ||
                          !reviewName.trim() ||
                          !reviewEmail.trim()
                        }
                      >
                        Publier mon avis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <section className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Produits similaires</h2>
              {categorySlug ? (
                <Link
                  href={`/shop?category=${encodeURIComponent(categorySlug)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"
                >
                  Voir plus <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            <div className="products-grid mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-4">
              {similarQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : similarProducts.length ? (
                similarProducts.map((p) => {
                  const img = p.images?.[0]?.url;
                  return (
                    <Link
                      key={p.id ?? p.slug}
                      href={`/product/${p.slug}`}
                      className="product-card group overflow-hidden rounded-xl border bg-background hover:bg-muted/10"
                    >
                      <div className="product-media aspect-[4/5] overflow-hidden rounded-t-xl bg-muted/20">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={p.images?.[0]?.alt ?? p.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
                            }}
                          />
                        ) : (
                          <div className="relative h-full w-full p-3 sm:p-6">
                            <Image
                              src={PLACEHOLDER_IMG}
                              alt={p.name}
                              fill
                              sizes="(min-width: 1024px) 25vw, 50vw"
                              className="object-contain opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="product-content p-4 sm:p-5">
                        <div className="product-title text-base font-medium text-foreground">{p.name}</div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="product-price text-lg font-semibold text-destructive">{formatPriceCFA(p.price)}</div>
                          <button
                            type="button"
                            aria-label="Ajouter au panier"
                            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            disabled={addSimilarToCart.isPending || !p.id}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!p.id) return;
                              flyToCart(e.currentTarget);
                              await addSimilarToCart.mutateAsync(p.id as number);
                            }}
                          >
                            <ShoppingCart className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">Aucun produit similaire.</div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
