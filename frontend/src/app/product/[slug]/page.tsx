"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { flyToCart } from "@/lib/fly-to-cart";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

function formatPriceCFA(value: unknown) {
  const amount = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)} F CFA`;
}

function getBrand(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const brand = metadata.brand ?? metadata.marque;
  return typeof brand === "string" && brand.trim() ? brand.trim() : null;
}

function getTags(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const tags = metadata.tags ?? metadata.keywords;
  if (Array.isArray(tags)) {
    return tags.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function getTransportPrices(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const transport = (metadata.transport_prices ?? {}) as Record<string, unknown>;
  const air = Number(transport.air ?? transport.avion ?? NaN);
  const sea = Number(transport.sea ?? transport.bateau ?? NaN);

  return {
    air: Number.isFinite(air) ? air : null,
    sea: Number.isFinite(sea) ? sea : null,
  };
}

function getTransportDelays(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const delays = (metadata.transport_delivery_delays ?? {}) as Record<string, unknown>;

  const airMin = Number(delays.air_min ?? 5);
  const airMax = Number(delays.air_max ?? 10);
  const seaMin = Number(delays.sea_min ?? 30);
  const seaMax = Number(delays.sea_max ?? 50);

  return {
    air: [Number.isFinite(airMin) ? airMin : 5, Number.isFinite(airMax) ? airMax : 10] as [number, number],
    sea: [Number.isFinite(seaMin) ? seaMin : 30, Number.isFinite(seaMax) ? seaMax : 50] as [number, number],
  };
}

function normalizeDescription(description: string | null | undefined) {
  return String(description ?? "")
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [transportMode, setTransportMode] = useState<"air" | "sea">("air");

  const productQuery = useQuery({
    queryKey: ["product", params.slug],
    queryFn: () => apiGet<Product>(`/api/products/${params.slug}`),
  });

  const relatedQuery = useQuery({
    queryKey: ["related-products", params.slug],
    queryFn: () => apiGet<ProductsResponse>("/api/products?perPage=12"),
  });

  const product = productQuery.data;
  const gallery = useMemo(() => {
    const images = product?.images?.length ? product.images : [{ url: PLACEHOLDER_IMG, alt: product?.name ?? "Produit" }];
    return images;
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
  }, [params.slug]);

  useEffect(() => {
    if (!product) return;
    const prices = getTransportPrices(product);
    if (prices.air != null) {
      setTransportMode("air");
    } else if (prices.sea != null) {
      setTransportMode("sea");
    }
  }, [product]);

  const addToCart = useMutation({
    mutationFn: async (qty: number) => {
      if (!product?.id) throw new Error("Produit introuvable.");
      return apiPatch("/api/cart", { product_id: product.id, qty });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const paragraphs = useMemo(() => normalizeDescription(product?.description), [product?.description]);
  const brand = product ? getBrand(product) : null;
  const tags = product ? getTags(product) : [];
  const transportPrices = product ? getTransportPrices(product) : { air: null, sea: null };
  const transportDelays = product ? getTransportDelays(product) : { air: [5, 10] as [number, number], sea: [30, 50] as [number, number] };
  const selectedTransportPrice = transportMode === "air" ? transportPrices.air : transportPrices.sea;
  const selectedTransportDelay = transportMode === "air" ? transportDelays.air : transportDelays.sea;
  const categoryName = product?.categories?.[0]?.name ?? "Catalogue premium";
  const deliveryLabel = product?.tag_delivery === "PRET_A_ETRE_LIVRE" ? "Pret a etre livre" : "Sur commande";
  const relatedProducts = useMemo(() => {
    const all = relatedQuery.data?.data ?? [];
    return all
      .filter((item) => item.slug !== product?.slug)
      .filter((item) => {
        const currentCategory = product?.categories?.[0]?.slug;
        if (!currentCategory) return true;
        return item.categories?.[0]?.slug === currentCategory;
      })
      .slice(0, 4);
  }, [product?.categories, product?.slug, relatedQuery.data?.data]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {productQuery.isLoading ? <div className="text-sm text-slate-500">Chargement du produit...</div> : null}
      {productQuery.isError ? <div className="text-sm text-destructive">{(productQuery.error as Error).message}</div> : null}

      {product ? (
        <div className="space-y-8 md:space-y-12">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link href="/shop" className="inline-flex items-center gap-2 font-medium text-slate-700 hover:text-[#8a6917]">
              <ArrowLeft className="h-4 w-4" /> Retour a la boutique
            </Link>
            <span>/</span>
            <span>{categoryName}</span>
          </div>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr] lg:gap-10">
            <div className="space-y-4">
              <Card className="overflow-hidden rounded-[28px] border border-[#ecd38f] bg-[#fffdf8] shadow-[0_24px_60px_-46px_rgba(177,134,11,0.45)]">
                <CardContent className="p-4 md:p-5">
                  <div className="relative aspect-[4/4.3] overflow-hidden rounded-[24px] border border-[#f1e3bc] bg-white">
                    {gallery[selectedImageIndex]?.url?.startsWith("/") ? (
                      <Image
                        src={gallery[selectedImageIndex].url}
                        alt={gallery[selectedImageIndex].alt ?? product.name}
                        fill
                        sizes="(min-width: 1024px) 52vw, 100vw"
                        className="object-cover object-center"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={gallery[selectedImageIndex]?.url ?? PLACEHOLDER_IMG}
                        alt={gallery[selectedImageIndex]?.alt ?? product.name}
                        className="h-full w-full object-cover object-center"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {gallery.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-[18px] border bg-white transition-all ${selectedImageIndex === index ? "border-[#d6ae48] shadow-[0_16px_28px_-22px_rgba(177,134,11,0.45)]" : "border-[#eadfbf]"}`}
                  >
                    {image.url.startsWith("/") ? (
                      <Image src={image.url} alt={image.alt ?? product.name} fill sizes="120px" className="object-cover object-center" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.url} alt={image.alt ?? product.name} className="h-full w-full object-cover object-center" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[30px] border border-[#ead39a] bg-[linear-gradient(180deg,#fffdf8_0%,#fffaf0_100%)] p-6 shadow-[0_24px_60px_-48px_rgba(177,134,11,0.45)] md:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-[#fff2cf] px-3 py-1 text-[#8a6917] hover:bg-[#fff2cf]">{deliveryLabel}</Badge>
                  <Badge variant="outline" className="rounded-full border-[#e4d2a0] px-3 py-1 text-[#6a768b]">{categoryName}</Badge>
                </div>

                <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-[#152238] md:text-4xl">{product.name}</h1>

                {paragraphs[0] ? <p className="mt-4 text-[15px] leading-7 text-[#5a6b82]">{paragraphs[0]}</p> : null}

                <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <div className="text-3xl font-semibold tracking-tight text-[#8a6917] md:text-4xl">{formatPriceCFA(product.price)}</div>
                  {product.compare_at_price ? <div className="text-lg text-slate-400 line-through">{formatPriceCFA(product.compare_at_price)}</div> : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#ede2c2] bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#8a6917]"><Truck className="h-4 w-4" /> Livraison</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{selectedTransportDelay[0]} a {selectedTransportDelay[1]} jours</div>
                  </div>
                  <div className="rounded-2xl border border-[#ede2c2] bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#8a6917]"><ShieldCheck className="h-4 w-4" /> Disponibilite</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{product.stock && product.stock > 0 ? `${product.stock} en stock` : "Stock variable"}</div>
                  </div>
                  <div className="rounded-2xl border border-[#ede2c2] bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#8a6917]"><Package className="h-4 w-4" /> SKU</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{product.sku || "Non renseigne"}</div>
                  </div>
                </div>

                {(transportPrices.air != null || transportPrices.sea != null) ? (
                  <div className="mt-6 rounded-[24px] border border-[#ecdcb2] bg-white/70 p-4">
                    <div className="text-sm font-semibold text-slate-900">Choisissez le mode de transport</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setTransportMode("air")}
                        disabled={transportPrices.air == null}
                        className={`rounded-2xl border p-4 text-left transition-all ${transportMode === "air" ? "border-[#d5a737] bg-[#fff8e6]" : "border-[#eadfbf] bg-white"} ${transportPrices.air == null ? "opacity-50" : ""}`}
                      >
                        <div className="text-sm font-semibold text-slate-900">Avion</div>
                        <div className="mt-1 text-sm text-[#8a6917]">{transportPrices.air != null ? formatPriceCFA(transportPrices.air) : "Indisponible"}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportMode("sea")}
                        disabled={transportPrices.sea == null}
                        className={`rounded-2xl border p-4 text-left transition-all ${transportMode === "sea" ? "border-[#d5a737] bg-[#fff8e6]" : "border-[#eadfbf] bg-white"} ${transportPrices.sea == null ? "opacity-50" : ""}`}
                      >
                        <div className="text-sm font-semibold text-slate-900">Bateau</div>
                        <div className="mt-1 text-sm text-[#8a6917]">{transportPrices.sea != null ? formatPriceCFA(transportPrices.sea) : "Indisponible"}</div>
                      </button>
                    </div>
                    {selectedTransportPrice != null ? <p className="mt-3 text-sm text-slate-600">Frais de transport selectionnes : <span className="font-semibold text-slate-900">{formatPriceCFA(selectedTransportPrice)}</span></p> : null}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-[#ead39a] bg-white px-2 py-2 shadow-[0_12px_28px_-22px_rgba(177,134,11,0.45)]">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-[#faf4e4]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-10 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => value + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-[#faf4e4]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    className="h-12 rounded-full bg-[linear-gradient(135deg,#f6e27a,#d4af37,#b8860b)] px-6 text-[#392806] shadow-[0_18px_32px_-24px_rgba(177,134,11,0.65)] hover:opacity-95"
                    disabled={addToCart.isPending}
                    onClick={async (event) => {
                      try {
                        await addToCart.mutateAsync(quantity);
                        const button = event.currentTarget as HTMLElement;
                        flyToCart(button);
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Impossible d'ajouter ce produit au panier.";
                        window.alert(message);
                        if (message.toLowerCase().includes("unauthorized")) {
                          router.push("/auth/login");
                        }
                      }
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
                  </Button>

                  <Button asChild variant="outline" className="h-12 rounded-full border-[#e3c16b] bg-white px-6 text-[#8a6917] hover:bg-[#fff8ea]">
                    <Link href="/shop">Explorer la boutique <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>

                {addToCart.isError ? <p className="mt-3 text-sm text-destructive">{(addToCart.error as Error).message}</p> : null}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.8fr]">
            <Card className="rounded-[28px] border border-[#ead39a] bg-white shadow-[0_22px_60px_-50px_rgba(177,134,11,0.45)]">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4d6] text-[#8a6917]">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[#152238]">Description du produit</h2>
                    <p className="mt-1 text-sm text-slate-500">Contenu detaille recupere depuis la base catalogue.</p>
                  </div>
                </div>
                <Separator className="my-6 bg-[#f0e4bf]" />

                {paragraphs.length ? (
                  <div className="space-y-4 text-[15px] leading-8 text-[#42526a]">
                    {paragraphs.map((paragraph, index) => (
                      <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] leading-8 text-[#42526a]">La description de cet article sera bientot enrichie.</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[28px] border border-[#ead39a] bg-[#fffdf8] shadow-[0_22px_60px_-50px_rgba(177,134,11,0.45)]">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold tracking-tight text-[#152238]">Fiche rapide</h2>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Categorie</span><span className="text-right font-medium text-slate-900">{categoryName}</span></div>
                    <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Disponibilite</span><span className="text-right font-medium text-slate-900">{deliveryLabel}</span></div>
                    <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Marque</span><span className="text-right font-medium text-slate-900">{brand ?? "Non renseignee"}</span></div>
                    <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Reference</span><span className="text-right font-medium text-slate-900">{product.sku ?? "Non renseignee"}</span></div>
                    <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Stock</span><span className="text-right font-medium text-slate-900">{product.stock ?? 0}</span></div>
                  </div>
                </CardContent>
              </Card>

              {tags.length ? (
                <Card className="rounded-[28px] border border-[#ead39a] bg-white shadow-[0_22px_60px_-50px_rgba(177,134,11,0.45)]">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold tracking-tight text-[#152238]">Mots cles</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="rounded-full border-[#ead39a] bg-[#fffaf0] px-3 py-1 text-[#8a6917]">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </section>

          {relatedProducts.length ? (
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#152238]">Produits similaires</h2>
                  <p className="mt-1 text-sm text-slate-500">Dans le meme univers que cet article.</p>
                </div>
                <Button asChild variant="outline" className="rounded-full border-[#e3c16b] bg-white text-[#8a6917] hover:bg-[#fff8ea]">
                  <Link href="/shop">Voir plus</Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((item) => {
                  const image = item.images?.[0]?.url ?? PLACEHOLDER_IMG;
                  return (
                    <Link
                      key={item.slug}
                      href={`/product/${item.slug}`}
                      className="group overflow-hidden rounded-[24px] border border-[#ead39a] bg-[#fffdf8] p-3 shadow-[0_18px_44px_-38px_rgba(177,134,11,0.45)] transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_-36px_rgba(177,134,11,0.55)]"
                    >
                      <div className="relative aspect-[4/4.3] overflow-hidden rounded-[18px] border border-[#f1e3bc] bg-white">
                        {image.startsWith("/") ? (
                          <Image src={image} alt={item.name} fill sizes="320px" className="object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={item.name} className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                        )}
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-base font-semibold text-[#26324a]">{item.name}</h3>
                      <p className="mt-2 text-lg font-semibold text-[#8a6917]">{formatPriceCFA(item.price)}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}