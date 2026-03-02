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

function getTransportDelayRanges(product: Product): { air: [number, number]; sea: [number, number] } {
  const m = (product.metadata ?? {}) as Record<string, unknown>;
  const d = (m.transport_delivery_delays ?? {}) as Record<string, unknown>;

  const airMin = Number(d.air_min ?? 5);
  const airMax = Number(d.air_max ?? 10);
  const seaMin = Number(d.sea_min ?? 30);
  const seaMax = Number(d.sea_max ?? 50);

  return {
    air: [Number.isFinite(airMin) ? airMin : 5, Number.isFinite(airMax) ? airMax : 10],
    sea: [Number.isFinite(seaMin) ? seaMin : 30, Number.isFinite(seaMax) ? seaMax : 50],
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

  const transportPrices = useMemo(
    () => (product ? getTransportPrices(product) : { air: null, sea: null }),
    [product]
  );

  const selectedTransportPrice = transportMode === "air" ? transportPrices.air : transportPrices.sea;

  // --- MODIFICATION PRINCIPALE ---
  // On garde toujours le prix de base
  const basePrice = Number(product?.price ?? 0);

  const transportDelays = useMemo(
    () => (product ? getTransportDelayRanges(product) : { air: [5, 10] as [number, number], sea: [30, 50] as [number, number] }),
    [product]
  );
  const selectedDelay = transportMode === "air" ? transportDelays.air : transportDelays.sea;

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
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="h-full w-full object-contain"
                    onError={() => setImgSrc(PLACEHOLDER_IMG)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{product.name}</h1>
                {/* --- PRIX DE BASE FIXE --- */}
                <div className="mt-3 text-xl font-semibold text-foreground sm:text-3xl">
                  {formatPriceCFA(basePrice)}
                </div>
                {transportPrices.air != null || transportPrices.sea != null ? (
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
                            ? "border-chart-2 bg-chart-2/10 text-red-600"
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
                            ? "border-chart-2 bg-chart-2/10 text-red-600"
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
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}