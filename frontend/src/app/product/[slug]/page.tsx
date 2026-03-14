"use client";

import type { SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Zap } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { flyToCart } from "@/lib/fly-to-cart";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61578635757172";
const TIKTOK_URL = "https://www.tiktok.com/@a_d_a_n.gladiator?_r=1&_t=ZS-941CIvuHTwv";
const INSTAGRAM_URL = "https://www.instagram.com/meslmenehasn?utm_source=qr&igsh=YjJ5aTRid3Zkangy";

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

function FacebookLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06C2 17.08 5.657 21.24 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.196 2.238.196v2.475h-1.261c-1.243 0-1.631.78-1.631 1.58v1.88h2.773l-.443 2.91h-2.33V22C18.343 21.24 22 17.08 22 12.06z" />
    </svg>
  );
}

function InstagramLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z" />
      <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M17.25 6.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
    </svg>
  );
}

function TikTokLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 3v10.06a3.94 3.94 0 1 1-3-3.82V7.06A6 6 0 1 0 16 12V7.2c1.08 1.02 2.52 1.65 4 1.72V6.5c-2.21-.19-3.78-1.43-4.62-3.5H14z" />
    </svg>
  );
}

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

function getMinimumQuantity(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const min = Number(
    metadata.minimum_order_quantity ?? metadata.min_order_quantity ?? metadata.min_qty ?? metadata.minimum_quantity ?? 1,
  );
  return Number.isFinite(min) && min > 0 ? min : 1;
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
  }, [params.slug]);

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

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!product?.id) throw new Error("Produit introuvable.");
      return apiPatch("/api/cart", { product_id: product.id, qty: 1 });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const paragraphs = useMemo(() => normalizeDescription(product?.description), [product?.description]);
  const descriptionText = paragraphs.join(" ");
  const brand = product ? getBrand(product) : null;
  const tags = product ? getTags(product) : [];
  const transportPrices = product ? getTransportPrices(product) : { air: null, sea: null };
  const categoryName = product?.categories?.[0]?.name ?? "SPORT ET LOISIR";
  const stockValue = typeof product?.stock === "number" ? product.stock : 0;
  const minimumQuantity = product ? getMinimumQuantity(product) : 1;
  const deliveryLabel = product?.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRET A ETRE LIVRE" : "SUR COMMANDE";
  const selectedTransportPrice = transportMode === "air" ? transportPrices.air : transportPrices.sea;
  const displayPrice = selectedTransportPrice ?? product?.price ?? 0;
  const relatedProducts = useMemo(() => {
    const all = relatedQuery.data?.data ?? [];
    return all.filter((item) => item.slug !== product?.slug).slice(0, 4);
  }, [product?.slug, relatedQuery.data?.data]);

  async function handleAddToCart(button: HTMLElement, redirectToCheckout: boolean) {
    try {
      await addToCart.mutateAsync();
      flyToCart(button);
      if (redirectToCheckout) {
        router.push("/checkout");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'ajouter ce produit au panier.";
      window.alert(message);
      if (message.toLowerCase().includes("unauthorized")) {
        router.push("/auth/login");
      }
    }
  }

  const informationRows = [
    { label: "Catégorie", value: categoryName },
    { label: "Marque", value: brand ?? "Non renseignée" },
    { label: "Stock", value: `${stockValue} unités` },
    { label: "Quantité Min:", value: String(minimumQuantity) },
    { label: "Tags", value: tags.length ? tags.join(", ") : "Aucun" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1220px] px-4 py-5 md:px-6 md:py-7">
      {productQuery.isLoading ? <div className="text-sm text-slate-500">Chargement du produit...</div> : null}
      {productQuery.isError ? <div className="text-sm text-destructive">{(productQuery.error as Error).message}</div> : null}

      {product ? (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link href="/shop" className="inline-flex items-center gap-2 font-medium text-slate-700 hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" /> Retour a la boutique
            </Link>
          </div>

          <section className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_480px] xl:items-start">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white p-3 md:p-4">
                <div className="relative aspect-square overflow-hidden rounded-[16px] border border-slate-200 bg-[#fafafa]">
                  {gallery[selectedImageIndex]?.url?.startsWith("/") ? (
                    <Image
                      src={gallery[selectedImageIndex].url}
                      alt={gallery[selectedImageIndex].alt ?? product.name}
                      fill
                      sizes="(min-width: 1280px) 54vw, 100vw"
                      className="object-contain object-center p-5"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gallery[selectedImageIndex]?.url ?? PLACEHOLDER_IMG}
                      alt={gallery[selectedImageIndex]?.alt ?? product.name}
                      className="h-full w-full object-contain object-center p-5"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {gallery.slice(0, 4).map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-[78px] w-[78px] overflow-hidden rounded-[12px] border bg-[#f8fafc] transition ${selectedImageIndex === index ? "border-[#59c5d7]" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    {image.url.startsWith("/") ? (
                      <Image src={image.url} alt={image.alt ?? product.name} fill sizes="78px" className="object-contain p-2" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.url} alt={image.alt ?? product.name} className="h-full w-full object-contain p-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <FacebookLogo className="h-4 w-4" />
                </a>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <TikTokLogo className="h-4 w-4" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <InstagramLogo className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-semibold leading-none tracking-tight text-slate-950 md:text-[3.1rem]">{product.name}</h1>
                <div className="mt-5 text-[2.2rem] font-bold leading-none text-[#ff1e1e] md:text-[3rem]">{formatPriceCFA(displayPrice)}</div>
                <p className="mt-3 text-[15px] text-slate-500">Prix de base: {formatPriceCFA(product.price)}</p>
              </div>

              {(transportPrices.air != null || transportPrices.sea != null) ? (
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Mode de livraison</h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setTransportMode("air")}
                      disabled={transportPrices.air == null}
                      className={`rounded-[10px] border px-4 py-2.5 text-[15px] transition ${transportMode === "air" ? "border-[#4dc6d6] bg-[#ebfcff] text-[#174251]" : "border-slate-200 bg-white text-slate-500"} ${transportPrices.air == null ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      Avion ({transportPrices.air != null ? formatPriceCFA(transportPrices.air) : "Indisponible"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransportMode("sea")}
                      disabled={transportPrices.sea == null}
                      className={`rounded-[10px] border px-4 py-2.5 text-[15px] transition ${transportMode === "sea" ? "border-[#4dc6d6] bg-[#ebfcff] text-[#174251]" : "border-slate-200 bg-white text-slate-500"} ${transportPrices.sea == null ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      Bateau ({transportPrices.sea != null ? formatPriceCFA(transportPrices.sea) : "Indisponible"})
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="max-w-[42rem] text-[15px] leading-9 text-slate-700">
                {descriptionText || "La description de cet article sera bientot enrichie."}
              </div>

              <div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">Informations</h2>
                <div className="mt-5 space-y-4 text-[15px] text-slate-700">
                  {informationRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-4">
                      <div className="text-slate-700">{row.label}</div>
                      <div className="font-normal text-slate-900">{row.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-[#f7f7f7] px-3 py-1 text-sm font-semibold text-slate-700">
                  {deliveryLabel}
                </div>
              </div>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <Button
                  className="h-14 rounded-[10px] bg-[#ff1f1f] text-base font-semibold text-white hover:bg-[#e51717]"
                  disabled={addToCart.isPending}
                  onClick={(event) => handleAddToCart(event.currentTarget, false)}
                >
                  <ShoppingCart className="h-5 w-5" /> Ajouter au panier
                </Button>
                <Button
                  className="h-14 rounded-[10px] bg-[#0d9b97] text-base font-semibold text-white hover:bg-[#0a8a87]"
                  disabled={addToCart.isPending}
                  onClick={(event) => handleAddToCart(event.currentTarget, true)}
                >
                  <Zap className="h-5 w-5" /> Acheter maintenant
                </Button>
              </div>

              {addToCart.isError ? <p className="text-sm text-destructive">{(addToCart.error as Error).message}</p> : null}
            </div>
          </section>

          {relatedProducts.length ? (
            <section className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-slate-950">Produits similaires</h2>
                <Link href="/shop" className="text-sm font-medium text-slate-600 hover:text-slate-950">
                  Voir plus
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((item) => {
                  const image = item.images?.[0]?.url ?? PLACEHOLDER_IMG;
                  return (
                    <Link
                      key={item.slug}
                      href={`/product/${item.slug}`}
                      className="overflow-hidden rounded-[14px] border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-[10px] border border-slate-200 bg-[#fafafa]">
                        {image.startsWith("/") ? (
                          <Image src={image} alt={item.name} fill sizes="280px" className="object-contain p-3" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={item.name} className="h-full w-full object-contain p-3" />
                        )}
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950">{item.name}</h3>
                      <p className="mt-2 text-lg font-bold text-[#ff1e1e]">{formatPriceCFA(item.price)}</p>
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