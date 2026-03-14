"use client";

import type { SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, Zap } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { flyToCart } from "@/lib/fly-to-cart";
import type { Product, ProductReview, ProductReviewsResponse } from "@/lib/types";
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

type PricingMode = "local" | "air" | "sea";

type BasePricingMode = "lot" | "unit";

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

function getTransportDelays(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const delays = (metadata.transport_delivery_delays ?? {}) as Record<string, unknown>;

  const airMin = Number(delays.air_min ?? NaN);
  const airMax = Number(delays.air_max ?? NaN);
  const seaMin = Number(delays.sea_min ?? NaN);
  const seaMax = Number(delays.sea_max ?? NaN);

  return {
    air: Number.isFinite(airMin) || Number.isFinite(airMax)
      ? [Number.isFinite(airMin) ? airMin : airMax, Number.isFinite(airMax) ? airMax : airMin] as [number, number]
      : null,
    sea: Number.isFinite(seaMin) || Number.isFinite(seaMax)
      ? [Number.isFinite(seaMin) ? seaMin : seaMax, Number.isFinite(seaMax) ? seaMax : seaMin] as [number, number]
      : null,
  };
}

function getDeliveryEstimateNote(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const note = metadata.delivery_estimate_note;
  if (typeof note === "string" && note.trim()) return note.trim();
  return "Vous serez notifie par email et SMS a l'arrivee de votre commande.";
}

function getMinimumQuantity(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const min = Number(
    metadata.minimum_order_quantity ?? metadata.min_order_quantity ?? metadata.min_qty ?? metadata.minimum_quantity ?? 1,
  );
  return Number.isFinite(min) && min > 0 ? min : 1;
}

function getQuantityPricing(product: Product) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const rules = (metadata.quantity_pricing ?? {}) as Record<string, unknown>;

  const normalizeMode = (value: unknown, fallback: BasePricingMode): BasePricingMode => (value === "unit" ? "unit" : value === "lot" ? "lot" : fallback);
  const normalizeQty = (value: unknown, fallback: number) => {
    const quantity = Number(value ?? fallback);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
  };

  return {
    local: {
      minQty: normalizeQty(rules.local_min_qty, getMinimumQuantity(product)),
      baseMode: normalizeMode(rules.local_base_mode, "lot"),
      shippingFee: 0,
    },
    air: {
      minQty: normalizeQty(rules.air_min_qty, 2),
      baseMode: normalizeMode(rules.air_base_mode, "lot"),
      shippingFee: getTransportPrices(product).air ?? 0,
    },
    sea: {
      minQty: normalizeQty(rules.sea_min_qty, 10),
      baseMode: normalizeMode(rules.sea_base_mode, "unit"),
      shippingFee: getTransportPrices(product).sea ?? 0,
    },
  };
}

function calculatePricing(basePrice: number, requestedQty: number, config: { minQty: number; baseMode: BasePricingMode; shippingFee: number }, mode: PricingMode) {
  const minQty = Math.max(1, config.minQty);
  const sanitizedQty = Math.max(minQty, requestedQty);
  const lotCount = Math.ceil(sanitizedQty / minQty);
  const baseTotal = config.baseMode === "unit" ? basePrice * sanitizedQty : basePrice * lotCount;
  const shippingTotal = mode === "local" ? 0 : config.shippingFee * lotCount;

  return {
    quantity: sanitizedQty,
    minQty,
    lotCount,
    baseMode: config.baseMode,
    baseTotal,
    shippingTotal,
    total: baseTotal + shippingTotal,
  };
}

function normalizeDescription(description: string | null | undefined) {
  return String(description ?? "")
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatReviewDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function RatingStars({ value, className = "h-6 w-6", activeClassName = "fill-white text-white", inactiveClassName = "text-slate-300" }: {
  value: number;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < value;
        return (
          <Star
            key={index}
            className={`${className} ${active ? activeClassName : inactiveClassName}`}
          />
        );
      })}
    </div>
  );
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [transportMode, setTransportMode] = useState<"air" | "sea">("air");
  const [quantity, setQuantity] = useState(1);
  const [reviewTab, setReviewTab] = useState<"reviews" | "form">("reviews");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");

  const productQuery = useQuery({
    queryKey: ["product", params.slug],
    queryFn: () => apiGet<Product>(`/api/products/${params.slug}`),
  });

  const relatedQuery = useQuery({
    queryKey: ["related-products", params.slug],
    queryFn: () => apiGet<ProductsResponse>("/api/products?perPage=12"),
  });

  const reviewsQuery = useQuery({
    queryKey: ["product-reviews", params.slug],
    queryFn: () => apiGet<ProductReviewsResponse>(`/api/products/${params.slug}/reviews?limit=20`),
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
      return;
    }
    if (prices.sea != null) {
      setTransportMode("sea");
    }
  }, [product]);

  const addToCart = useMutation({
    mutationFn: async (qty: number) => {
      if (!product?.id) throw new Error("Produit introuvable.");
      return apiPost("/api/cart", { product_id: product.id, qty });
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
  const transportDelays = product ? getTransportDelays(product) : { air: null, sea: null };
  const quantityPricing = product
    ? getQuantityPricing(product)
    : {
        local: { minQty: 1, baseMode: "lot" as BasePricingMode, shippingFee: 0 },
        air: { minQty: 2, baseMode: "lot" as BasePricingMode, shippingFee: 0 },
        sea: { minQty: 10, baseMode: "unit" as BasePricingMode, shippingFee: 0 },
      };
  const categoryName = product?.categories?.[0]?.name ?? "SPORT ET LOISIR";
  const stockValue = typeof product?.stock === "number" ? product.stock : 0;
  const isLocalOnly = product?.tag_delivery === "PRET_A_ETRE_LIVRE";
  const activePricingMode: PricingMode = isLocalOnly ? "local" : transportMode;
  const activePricingConfig = quantityPricing[activePricingMode];
  const deliveryLabel = product?.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRET A ETRE LIVRE" : "SUR COMMANDE";
  const selectedTransportPrice = transportMode === "air" ? transportPrices.air : transportPrices.sea;
  const selectedTransportDelay = transportMode === "air" ? transportDelays.air : transportDelays.sea;
  const pricingSummary = calculatePricing(Number(product?.price ?? 0), quantity, activePricingConfig, activePricingMode);
  const displayPrice = pricingSummary.total;
  const deliveryEstimateNote = product ? getDeliveryEstimateNote(product) : "";
  const relatedProducts = useMemo(() => {
    const all = relatedQuery.data?.data ?? [];
    return all.filter((item) => item.slug !== product?.slug).slice(0, 4);
  }, [product?.slug, relatedQuery.data?.data]);
  const reviews = reviewsQuery.data?.data ?? [];
  const reviewsMeta = reviewsQuery.data?.meta;
  const reviewTotal = reviewsMeta?.total ?? 0;
  const reviewAverage = reviewsMeta?.average ?? 0;
  const reviewBreakdown = reviewsMeta?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  useEffect(() => {
    setQuantity((current) => Math.max(activePricingConfig.minQty, current || activePricingConfig.minQty));
  }, [activePricingConfig.minQty]);

  const createReview = useMutation({
    mutationFn: async () => {
      return apiPost<ProductReview>(`/api/products/${params.slug}/reviews`, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        body: reviewBody.trim(),
        name: reviewName.trim(),
        email: reviewEmail.trim(),
      });
    },
    onSuccess: async () => {
      setReviewRating(0);
      setReviewTitle("");
      setReviewBody("");
      setReviewName("");
      setReviewEmail("");
      setReviewTab("reviews");
      await queryClient.invalidateQueries({ queryKey: ["product-reviews", params.slug] });
    },
  });

  const deliveryEstimateText = useMemo(() => {
    if (isLocalOnly) {
      return "Livraison locale: calculée selon votre position au checkout";
    }
    if (selectedTransportDelay) {
      const [min, max] = selectedTransportDelay;
      const range = min === max ? `${min} jour${min > 1 ? "s" : ""}` : `${min}-${max} jours`;
      return `Livraison estimee: ${range} (${transportMode === "air" ? "avion" : "bateau"})`;
    }
    if (typeof product?.delivery_delay_days === "number" && product.delivery_delay_days > 0) {
      return `Livraison estimee: ${product.delivery_delay_days} jour${product.delivery_delay_days > 1 ? "s" : ""}`;
    }
    return null;
  }, [isLocalOnly, product?.delivery_delay_days, selectedTransportDelay, transportMode]);

  async function handleAddToCart(button: HTMLElement, redirectToCheckout: boolean) {
    if (!getToken()) {
      const nextPath = `/product/${params.slug}`;
      const message = redirectToCheckout
        ? "Connectez-vous pour acheter ce produit et continuer vers le paiement."
        : "Connectez-vous pour ajouter ce produit a votre panier.";
      router.push(`/auth/login?next=${encodeURIComponent(nextPath)}&message=${encodeURIComponent(message)}`);
      return;
    }

    try {
      await addToCart.mutateAsync(pricingSummary.quantity);
      flyToCart(button);
      if (redirectToCheckout) {
        router.push("/checkout");
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Impossible d'ajouter ce produit au panier.";
      if (rawMessage.toLowerCase().includes("unauthorized")) {
        const nextPath = `/product/${params.slug}`;
        const message = redirectToCheckout
          ? "Votre session a expire. Connectez-vous pour finaliser votre achat."
          : "Votre session a expire. Connectez-vous pour ajouter ce produit au panier.";
        router.push(`/auth/login?next=${encodeURIComponent(nextPath)}&message=${encodeURIComponent(message)}`);
        return;
      }

      window.alert(rawMessage);
    }
  }

  const informationRows = [
    { label: "Catégorie", value: categoryName },
    { label: "Marque", value: brand ?? "Non renseignée" },
    { label: "Stock", value: `${stockValue} unités` },
    { label: "Quantité Min:", value: `${activePricingConfig.minQty} pcs` },
    { label: "Tags", value: tags.length ? tags.join(", ") : "Aucun" },
  ];
  const canSubmitReview = reviewRating > 0 && reviewTitle.trim() && reviewBody.trim() && reviewName.trim() && reviewEmail.trim();

  function showPreviousImage() {
    if (gallery.length <= 1) return;
    setSelectedImageIndex((current) => (current === 0 ? gallery.length - 1 : current - 1));
  }

  function showNextImage() {
    if (gallery.length <= 1) return;
    setSelectedImageIndex((current) => (current === gallery.length - 1 ? 0 : current + 1));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    touchEndXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd() {
    if (touchStartXRef.current == null || touchEndXRef.current == null) return;

    const distance = touchStartXRef.current - touchEndXRef.current;
    const swipeThreshold = 44;

    if (Math.abs(distance) < swipeThreshold) return;

    if (distance > 0) {
      showNextImage();
      return;
    }

    showPreviousImage();
  }

  const pricingExplanation = useMemo(() => {
    if (activePricingMode === "local") {
      return pricingSummary.baseMode === "unit"
        ? `Prix de base appliqué par pièce. Minimum ${pricingSummary.minQty} pcs.`
        : `Prix de base appliqué pour chaque lot minimum de ${pricingSummary.minQty} pcs.`;
    }

    const modeLabel = activePricingMode === "air" ? "avion" : "bateau";
    const baseText = pricingSummary.baseMode === "unit"
      ? `${formatPriceCFA(product?.price)} x ${pricingSummary.quantity}`
      : `${formatPriceCFA(product?.price)} x ${pricingSummary.lotCount} lot${pricingSummary.lotCount > 1 ? "s" : ""}`;
    const shippingText = `${formatPriceCFA(activePricingConfig.shippingFee)} x ${pricingSummary.lotCount} ${modeLabel}`;
    return `${baseText} + ${shippingText}`;
  }, [activePricingConfig.shippingFee, activePricingMode, pricingSummary.baseMode, pricingSummary.lotCount, pricingSummary.minQty, pricingSummary.quantity, product?.price]);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-4 md:px-6 md:py-5">
      {productQuery.isLoading ? <div className="text-sm text-slate-500">Chargement du produit...</div> : null}
      {productQuery.isError ? <div className="text-sm text-destructive">{(productQuery.error as Error).message}</div> : null}

      {product ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link href="/shop" className="inline-flex items-center gap-2 font-medium text-slate-700 hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" /> Retour a la boutique
            </Link>
          </div>

          <section className="grid gap-7 xl:grid-cols-[minmax(0,0.92fr)_516px] xl:items-start">
            <div className="space-y-3">
              <div className="max-w-[760px] overflow-hidden rounded-[16px] border border-slate-200 bg-white p-2.5 xl:max-w-[720px]">
                <div
                  className="relative aspect-[1/1.02] overflow-hidden rounded-[14px] border border-slate-200 bg-[#fbfbfb] touch-pan-y"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {gallery[selectedImageIndex]?.url?.startsWith("/") ? (
                    <Image
                      src={gallery[selectedImageIndex].url}
                      alt={gallery[selectedImageIndex].alt ?? product.name}
                      fill
                      sizes="(min-width: 1280px) 54vw, 100vw"
                      className="object-contain object-center p-8 md:p-10"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gallery[selectedImageIndex]?.url ?? PLACEHOLDER_IMG}
                      alt={gallery[selectedImageIndex]?.alt ?? product.name}
                      className="h-full w-full object-contain object-center p-8 md:p-10"
                    />
                  )}

                  {gallery.length > 1 ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 md:hidden">
                      {gallery.map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 rounded-full transition-all ${index === selectedImageIndex ? "w-5 bg-[#59c5d7]" : "w-1.5 bg-slate-300/90"}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {gallery.slice(0, 4).map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-[72px] w-[72px] overflow-hidden rounded-[10px] border bg-[#f8fafc] transition ${selectedImageIndex === index ? "border-[#59c5d7] shadow-[0_0_0_1px_rgba(89,197,215,0.15)]" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    {image.url.startsWith("/") ? (
                      <Image src={image.url} alt={image.alt ?? product.name} fill sizes="72px" className="object-contain p-2" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.url} alt={image.alt ?? product.name} className="h-full w-full object-contain p-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <FacebookLogo className="h-4 w-4" />
                </a>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <TikTokLogo className="h-4 w-4" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <InstagramLogo className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-7 pt-1 xl:pt-0">
              <div>
                <h1 className="text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-950 md:text-[3.15rem]">{product.name}</h1>
                <div className="mt-4 text-[2rem] font-bold leading-none text-[#ff1e1e] md:text-[2.95rem]">{formatPriceCFA(displayPrice)}</div>
                <p className="mt-2 text-[15px] text-slate-500">Prix de base: {formatPriceCFA(product.price)}</p>
                <p className="mt-1 text-[14px] text-slate-500">{pricingExplanation}</p>
              </div>

              {!isLocalOnly && (transportPrices.air != null || transportPrices.sea != null) ? (
                <div>
                  <h2 className="text-[1.1rem] font-semibold text-slate-950">Mode de livraison</h2>
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTransportMode("air")}
                      disabled={transportPrices.air == null}
                      className={`rounded-[10px] border px-4 py-2 text-[15px] transition ${transportMode === "air" ? "border-[#4dc6d6] bg-[#ebfcff] text-[#174251]" : "border-slate-200 bg-white text-slate-500"} ${transportPrices.air == null ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      Avion ({transportPrices.air != null ? formatPriceCFA(transportPrices.air) : "Indisponible"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransportMode("sea")}
                      disabled={transportPrices.sea == null}
                      className={`rounded-[10px] border px-4 py-2 text-[15px] transition ${transportMode === "sea" ? "border-[#4dc6d6] bg-[#ebfcff] text-[#174251]" : "border-slate-200 bg-white text-slate-500"} ${transportPrices.sea == null ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      Bateau ({transportPrices.sea != null ? formatPriceCFA(transportPrices.sea) : "Indisponible"})
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <h2 className="text-[1.1rem] font-semibold text-slate-950">Quantité demandée</h2>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="inline-flex items-center rounded-[10px] border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(activePricingConfig.minQty, current - 1))}
                      className="inline-flex h-11 w-11 items-center justify-center text-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      value={quantity}
                      onChange={(event) => {
                        const next = Number(event.target.value || activePricingConfig.minQty);
                        setQuantity(Number.isFinite(next) ? Math.max(activePricingConfig.minQty, next) : activePricingConfig.minQty);
                      }}
                      inputMode="numeric"
                      className="h-11 w-16 border-x border-slate-200 text-center text-[15px] font-semibold text-slate-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => current + 1)}
                      className="inline-flex h-11 w-11 items-center justify-center text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[14px] text-slate-500">Minimum requis: {activePricingConfig.minQty} pcs</p>
                </div>
              </div>

              <div className="max-w-[39rem] text-[15px] leading-[1.95] text-slate-700">
                {descriptionText || "La description de cet article sera bientot enrichie."}
              </div>

              <div>
                <h2 className="text-[2.05rem] font-semibold tracking-[-0.03em] text-slate-950">Informations</h2>
                <div className="mt-4 space-y-3.5 text-[15px] text-slate-700">
                  {informationRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[136px_minmax(0,1fr)] gap-4">
                      <div className="text-slate-700">{row.label}</div>
                      <div className="font-normal text-slate-900">{row.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-[#f7f7f7] px-3 py-1 text-[13px] font-semibold text-slate-700">
                  {deliveryLabel}
                </div>
              </div>

              <div className="grid gap-4 pt-1 sm:grid-cols-2">
                <Button
                  className="h-[56px] rounded-[8px] bg-[#ff1f1f] px-6 text-[15px] font-semibold text-white hover:bg-[#e51717]"
                  disabled={addToCart.isPending}
                  onClick={(event) => handleAddToCart(event.currentTarget, false)}
                >
                  <ShoppingCart className="h-5 w-5" /> Ajouter au panier
                </Button>
                <Button
                  className="h-[56px] rounded-[8px] bg-[#0d9b97] px-6 text-[15px] font-semibold text-white hover:bg-[#0a8a87]"
                  disabled={addToCart.isPending}
                  onClick={(event) => handleAddToCart(event.currentTarget, true)}
                >
                  <Zap className="h-5 w-5" /> Acheter maintenant
                </Button>
              </div>

              {deliveryEstimateText ? (
                <div className="rounded-[16px] border border-slate-200 bg-[#f7fbff] px-5 py-4">
                  <p className="text-[15px] font-medium text-slate-900">{deliveryEstimateText}</p>
                  <p className="mt-2 text-[15px] text-slate-600">Total estimé pour {pricingSummary.quantity} pcs : <span className="font-semibold text-slate-950">{formatPriceCFA(pricingSummary.total)}</span></p>
                  <p className="mt-2 text-[15px] text-slate-500">{deliveryEstimateNote}</p>
                </div>
              ) : null}

              {addToCart.isError ? <p className="text-sm text-destructive">{(addToCart.error as Error).message}</p> : null}
            </div>
          </section>

          <section className="space-y-5 pt-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewTab("reviews")}
                className={`rounded-[10px] border px-4 py-2 text-[15px] font-medium transition ${reviewTab === "reviews" ? "border-slate-200 bg-white text-slate-950 shadow-sm" : "border-transparent bg-[#f3f7fb] text-slate-600"}`}
              >
                Avis clients ({reviewTotal})
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("form")}
                className={`rounded-[10px] border px-4 py-2 text-[15px] font-medium transition ${reviewTab === "form" ? "border-slate-200 bg-white text-slate-950 shadow-sm" : "border-transparent bg-[#f3f7fb] text-slate-600"}`}
              >
                Laisser un avis
              </button>
            </div>

            {reviewTab === "reviews" ? (
              <div className="space-y-5">
                <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.18)] md:px-7 md:py-8">
                  <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                    <div>
                      <div className="text-[3.3rem] font-semibold leading-none text-[#ff1f1f]">{reviewAverage.toFixed(1)}</div>
                      <div className="mt-2">
                        <RatingStars value={Math.round(reviewAverage)} className="h-7 w-7" activeClassName="fill-[#d1d5db] text-[#d1d5db]" inactiveClassName="text-[#d1d5db]" />
                      </div>
                      <p className="mt-3 text-[15px] text-slate-500">Basé sur {reviewTotal} avis</p>
                    </div>

                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewBreakdown[rating as keyof typeof reviewBreakdown] ?? 0;
                        const percent = reviewTotal > 0 ? (count / reviewTotal) * 100 : 0;
                        return (
                          <div key={rating} className="grid grid-cols-[56px_minmax(0,1fr)_24px] items-center gap-3 text-[15px] text-slate-500">
                            <span>{rating} étoiles</span>
                            <div className="h-2 rounded-full bg-[#edf2f7]">
                              <div className="h-2 rounded-full bg-[#ff8f8f]" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {reviewsQuery.isLoading ? <p className="text-sm text-slate-500">Chargement des avis...</p> : null}
                {reviewsQuery.isError ? <p className="text-sm text-destructive">{(reviewsQuery.error as Error).message}</p> : null}

                {reviews.length ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[18px] border border-slate-200 bg-white px-5 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">{review.title}</h3>
                            <div className="mt-2 flex items-center gap-3">
                              <RatingStars value={review.rating} className="h-4 w-4" activeClassName="fill-[#ff8f8f] text-[#ff8f8f]" inactiveClassName="text-slate-300" />
                              <span className="text-sm text-slate-500">{review.name}</span>
                            </div>
                          </div>
                          <span className="text-sm text-slate-400">{formatReviewDate(review.created_at)}</span>
                        </div>
                        <p className="mt-4 text-[15px] leading-8 text-slate-600">{review.body}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] text-slate-500">Aucun avis pour le moment.</p>
                )}
              </div>
            ) : (
              <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.18)] md:px-7 md:py-8">
                <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-950">Donnez votre avis sur {product.name}</h2>

                <div className="mt-8 space-y-6">
                  <div>
                    <label className="block text-[15px] font-semibold text-slate-950">Votre note</label>
                    <div className="mt-3 flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const ratingValue = index + 1;
                        const active = reviewRating >= ratingValue;
                        return (
                          <button
                            key={ratingValue}
                            type="button"
                            aria-label={`Noter ${ratingValue} sur 5`}
                            onClick={() => setReviewRating(ratingValue)}
                            className="text-slate-300 transition hover:scale-105"
                          >
                            <Star className={`h-9 w-9 ${active ? "fill-[#d1d5db] text-[#d1d5db]" : "text-[#d1d5db]"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[15px] font-semibold text-slate-950">Titre de votre avis</label>
                    <input
                      value={reviewTitle}
                      onChange={(event) => setReviewTitle(event.target.value)}
                      placeholder="Résumez votre expérience en une phrase"
                      className="mt-2 h-12 w-full rounded-[10px] border border-slate-200 px-4 text-[15px] outline-none transition focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-semibold text-slate-950">Votre avis</label>
                    <textarea
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                      placeholder="Partagez votre expérience avec ce produit..."
                      className="mt-2 min-h-[170px] w-full rounded-[10px] border border-slate-200 px-4 py-3 text-[15px] outline-none transition focus:border-slate-300"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[15px] font-semibold text-slate-950">Votre nom</label>
                      <input
                        value={reviewName}
                        onChange={(event) => setReviewName(event.target.value)}
                        placeholder="Prénom et nom"
                        className="mt-2 h-12 w-full rounded-[10px] border border-slate-200 px-4 text-[15px] outline-none transition focus:border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[15px] font-semibold text-slate-950">Votre email</label>
                      <input
                        type="email"
                        value={reviewEmail}
                        onChange={(event) => setReviewEmail(event.target.value)}
                        placeholder="Votre email ne sera pas publié"
                        className="mt-2 h-12 w-full rounded-[10px] border border-slate-200 px-4 text-[15px] outline-none transition focus:border-slate-300"
                      />
                    </div>
                  </div>

                  <p className="text-[15px] text-slate-500">En soumettant cet avis, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.</p>

                  {createReview.isError ? <p className="text-sm text-destructive">{(createReview.error as Error).message}</p> : null}

                  <Button
                    className="h-12 rounded-[10px] bg-[#ef7d86] px-5 text-[15px] font-semibold text-white hover:bg-[#e96c76]"
                    disabled={!canSubmitReview || createReview.isPending}
                    onClick={() => createReview.mutate()}
                  >
                    Publier mon avis
                  </Button>
                </div>
              </div>
            )}
          </section>

          {relatedProducts.length ? (
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-slate-950">Produits similaires</h2>
                <Link href="/shop" className="text-sm font-medium text-slate-600 hover:text-slate-950">
                  Voir plus
                </Link>
              </div>

              <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                <div className="flex gap-3 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                {relatedProducts.map((item) => {
                  const image = item.images?.[0]?.url ?? PLACEHOLDER_IMG;
                  return (
                    <Link
                      key={item.slug}
                      href={`/product/${item.slug}`}
                      className="min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-[14px] border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 sm:min-w-0 sm:max-w-none sm:p-3"
                    >
                      <div className="relative aspect-[4/3.2] overflow-hidden rounded-[10px] border border-slate-200 bg-[#fafafa] sm:aspect-square">
                        {image.startsWith("/") ? (
                          <Image src={image} alt={item.name} fill sizes="(max-width: 639px) 220px, 280px" className="object-contain p-2.5 sm:p-3" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={item.name} className="h-full w-full object-contain p-2.5 sm:p-3" />
                        )}
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold text-slate-950 sm:text-base">{item.name}</h3>
                      <p className="mt-1.5 text-[18px] font-bold text-[#ff1e1e] sm:mt-2 sm:text-lg">{formatPriceCFA(item.price)}</p>
                    </Link>
                  );
                })}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}