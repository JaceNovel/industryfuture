"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Headset,
  Layers,
  PackageCheck,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  return `${formatted} F CFA`;
}

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

type PopularItem = Product;

const POPULAR_ROTATION_DAYS = 2;
const POPULAR_ROTATION_MS = POPULAR_ROTATION_DAYS * 24 * 60 * 60 * 1000;


function fiveDayWindowKey(ts: number) {
  return Math.floor(ts / POPULAR_ROTATION_MS);
}

function stableHash32(input: string) {
  // FNV-1a 32-bit
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function productStableKey(p: Product, fallbackIndex: number) {
  const id = p.id != null ? String(p.id) : "";
  const slug = (p.slug ?? "").trim();
  const sku = (p.sku ?? "").trim();
  return id || slug || sku || `idx:${fallbackIndex}`;
}

function ReadyToLevelUp({ className }: { className?: string }) {
  return (
    <section className={className}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-6xl rounded-[28px] bg-[var(--bg-dark-soft)] px-5 py-8 text-white shadow-[0_24px_50px_-40px_rgba(0,0,0,0.6)] md:px-10 md:py-14"
      >
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 className="text-balance text-[22px] font-semibold tracking-tight leading-tight md:text-3xl lg:text-4xl">
              Prêt à passer au niveau supérieur ?
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
              Une expérience e-commerce premium, minimaliste et conçue pour performer.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button
              asChild
              className="rounded-full border-none text-[#3f2e05] transition-all duration-400 hover:scale-[1.02] hover:shadow-[0_14px_30px_-18px_rgba(212,175,55,0.8)]"
              style={{ backgroundImage: GOLD_GRADIENT }}
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                Voir les produits <PackageCheck className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/30 bg-transparent text-white transition-all duration-400 hover:bg-white/10"
            >
              <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function Home() {

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const popularSectionRef = useRef<HTMLDivElement | null>(null);
  const [popularRotationKey, setPopularRotationKey] = useState(() =>
    typeof window === "undefined" ? 0 : fiveDayWindowKey(Date.now())
  );
const [activeCategory, setActiveCategory] = useState<string | null>(null);


  // Keep the selection stable for 5 days, then rotate automatically.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const currentKey = fiveDayWindowKey(now);
    if (currentKey !== popularRotationKey) {
      setPopularRotationKey(currentKey);
      return;
    }

    const nextBoundary = (currentKey + 1) * POPULAR_ROTATION_MS;
    const delay = Math.max(1_000, nextBoundary - now + 1_000);
    const id = window.setTimeout(() => {
      setPopularRotationKey(fiveDayWindowKey(Date.now()));
    }, delay);
    return () => window.clearTimeout(id);
  }, [popularRotationKey]);

  useEffect(() => {
    const video = heroVideoRef.current ?? document.getElementById("heroVideo");
    if (!video || !(video instanceof HTMLVideoElement)) return;

    const stopAtFourSeconds = () => {
      if (video.currentTime >= 4) {
        video.pause();
        video.removeEventListener("timeupdate", stopAtFourSeconds);
      }
    };

    video.addEventListener("timeupdate", stopAtFourSeconds);

    return () => {
      video.removeEventListener("timeupdate", stopAtFourSeconds);
    };
  }, []);

  
  // Mobile-only scroll reveal activation on sections
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const sections = Array.from(document.querySelectorAll("main section"));
    const headings = Array.from(document.querySelectorAll("main h2"));
    sections.forEach((el) => el.classList.add("reveal"));
    headings.forEach((el) => el.classList.add("reveal-title"));

    if (isMobile) {
      requestAnimationFrame(() => {
        sections.forEach((el) => el.classList.add("active"));
        headings.forEach((el) => el.classList.add("active"));
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: isMobile ? 0.05 : 0.3, rootMargin: "0px 0px -10% 0px" }
    );

    sections.forEach((el) => observer.observe(el));
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > 768) return;
    return;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > 768) return;

    const cards = document.querySelectorAll(".popular-section .product-card") as NodeListOf<HTMLElement>;
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            target.style.transform = "scale(1)";
            target.style.opacity = "1";
          } else {
            target.style.transform = "scale(0.92)";
            target.style.opacity = "0.6";
          }
        });
      },
      { threshold: 0.6 }
    
    );
    cards.forEach((card) => {
      card.style.transition = "transform 0.4s ease, opacity 0.4s ease";
      card.style.transform = "scale(0.92)";
      card.style.opacity = "0.6";
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, [popularRotationKey]);

  const featuredQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => apiGet<{ data: Product[] }>("/api/products?sort=featured"),
  });
  const productsQuery = useQuery({
    queryKey: ["products", "newest-home"],
    queryFn: () => apiGet<{ data: Product[] }>("/api/products?sort=newest"),
  });
  const featured = featuredQuery.data?.data ?? [];
  const fallbackProducts = productsQuery.data?.data ?? [];
  const sourceProducts = useMemo(() => {
    const raw = featured.length ? featured : fallbackProducts;
    const seen = new Set<string>();

    return raw.filter((product, index) => {
      const key = productStableKey(product, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [fallbackProducts, featured]);
  const categories = useMemo(() => {
  const map = new Map<string, string>();

  sourceProducts.forEach((p) => {
    const cat = p.categories?.[0];
    if (cat?.slug && cat?.name) {
      map.set(cat.slug, cat.name);
    }
  });

  return Array.from(map.entries()).map(([slug, name]) => ({
    slug,
    name,
  }));
}, [sourceProducts]);

  const mixedTousItems = useMemo(() => {
  if (!sourceProducts.length) return [];

  const base = sourceProducts.slice(0, 60);

  const byCategory = new Map<string, Product[]>();
  for (const p of base) {
    const key = p.categories?.[0]?.slug ?? "uncategorized";
    const arr = byCategory.get(key) ?? [];
    arr.push(p);
    byCategory.set(key, arr);
  }

  const diversified: Product[] = [];
  const buckets = Array.from(byCategory.values());

  let round = 0;
  while (diversified.length < base.length) {
    let added = false;

    for (const bucket of buckets) {
      if (round < bucket.length) {
        diversified.push(bucket[round]);
        added = true;
      }
    }

    if (!added) break;
    round++;
  }

  const scored = diversified.map((p, i) => {
    const key = productStableKey(p, i);
    const score = stableHash32(`${popularRotationKey}:${key}`);
    return { p, score };
  });

  scored.sort((a, b) => a.score - b.score);

  const seen = new Set<string>();
  return scored
    .map((x, index) => ({ product: x.p, key: productStableKey(x.p, index) }))
    .filter((entry) => {
      if (seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    })
    .slice(0, 12)
    .map((entry) => entry.product);
}, [sourceProducts, popularRotationKey]);
const displayedItems = useMemo(() => {
  if (activeCategory === null) {
    return mixedTousItems;
  }

  return sourceProducts
    .filter((item) => item.categories?.[0]?.slug === activeCategory)
    .slice(0, 12);
}, [activeCategory, mixedTousItems, sourceProducts]);


  const renderPopularCard = (item: PopularItem, idx: number, keyPrefix: string) => {
    const href = `/product/${item.slug}`;
    const img = item.images?.[0]?.url ?? PLACEHOLDER_IMG;
    const deliveryLabel = item.tag_delivery === "PRET_A_ETRE_LIVRE" ? "PRET" : "COMMANDE";

    return (
      <article
        key={item.id ?? item.slug ?? `${keyPrefix}-${idx}`}
        className="product-card homepage-product-card group relative w-full min-w-0 rounded-[28px] border border-[#eacb78] bg-[#fffdf8] p-3 shadow-[0_16px_34px_-30px_rgba(177,134,11,0.42)] transition-all duration-300 md:w-[168px] md:min-w-[168px] md:max-w-[168px]"
      >
        <span className="homepage-product-badge">{deliveryLabel}</span>
        <Link href={href} className="block">
          <div className="homepage-product-media relative aspect-[4/4.2] overflow-hidden rounded-[22px] border border-[#f1ddaa] bg-white">
            {img.startsWith("/") ? (
              <Image
                src={img}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 180px, 50vw"
                className="object-contain object-center p-2 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={item.images?.[0]?.alt ?? item.name}
                className="h-full w-full object-contain object-center p-2 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            )}
          </div>
          <h3 className="product-title mt-4 line-clamp-2 min-h-[2.8rem] text-center text-[15px] font-semibold leading-[1.35] text-[#27324a]">{item.name}</h3>
          <p className="product-price mt-4 text-center text-[16px] font-semibold tracking-tight text-[#87630f]">{formatPrice(item.price)}</p>
        </Link>
        <Button
          asChild
          variant="outline"
          className="homepage-product-cta mt-4 h-11 w-full rounded-full border-[#ead295] bg-white text-[15px] font-semibold text-[#8a6917] transition-all duration-300 hover:bg-[#fff8ea]"
        >
          <Link href={href}>Voir le produit</Link>
        </Button>
      </article>
    );
  };

  const steps = [
    {
      title: "Selection du produit",
      description: "Choisissez vos articles premium en quelques secondes.",
      icon: ShoppingBag,
    },
    {
      title: "Commande rapide",
      description: "Validez le panier avec un parcours ultra fluide.",
      icon: Zap,
    },
    {
      title: "Expedition groupee",
      description: "Nous consolidons vos achats pour optimiser les delais.",
      icon: Layers,
    },
    {
      title: "Livraison chez vous",
      description: "Suivi precis et reception securisee partout.",
      icon: Truck,
    },
  ];

  const reasons = [
    {
      title: "Livraison rapide",
      description: "Expédition prioritaire et suivi en temps réel.",
      icon: Truck,
    },
    {
      title: "Paiement securise",
      description: "Transactions chiffrées et protection continue.",
      icon: ShieldCheck,
    },
    {
      title: "Produits certifies",
      description: "Qualité vérifiée sur chaque référence premium.",
      icon: BadgeCheck,
    },
    {
      title: "Support 24/7",
      description: "Équipe dédiée avant, pendant et après l’achat.",
      icon: Headset,
    },
  ];


 return (
 
   <main className="home-main w-full bg-white pb-14 md:pb-20">
      <div className="banner-pc">
        <section className="w-full overflow-hidden">
          <motion.section
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="hero-video w-full flex justify-center items-center"
          >
            <video id="heroVideo" ref={heroVideoRef} autoPlay muted playsInline preload="auto">
              <source src="/WhatsApp%20Video%202026-02-21%20at%2002.50.34.mp4" type="video/mp4" />
            </video>
          </motion.section>

{/* Mobile Category Bar */}
  </section>
</div>
<div id="categories-bar" className="sticky-categories w-full bg-[#f8f8f8] md:hidden">
  <div className="flex overflow-x-auto whitespace-nowrap">

    {/* Bouton Tous */}
    <button
      onClick={() => {
        setActiveCategory(null);
        popularSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
      className="relative px-5 py-3 text-sm font-medium"
    >
      Tous

      <span
        className={`absolute left-0 bottom-0 h-[3px] w-full transition-transform duration-500 ease-out ${
          activeCategory === null ? "scale-x-100" : "scale-x-0"
        }`}
        style={{
          background:
            "linear-gradient(90deg, #b8860b, #d4af37, #f1c40f, #d4af37, #b8860b)",
          transformOrigin: "left",
        }}
      />
    </button>

    {/* Catégories dynamiques */}
    {categories.map((cat) => {
      const isActive = activeCategory === cat.slug;

      return (
        <button
          key={cat.slug}
          onClick={() => {
            setActiveCategory(cat.slug);
            popularSectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
          className="relative px-5 py-3 text-sm font-medium"
        >
          {cat.name}

          <span
            className={`absolute left-0 bottom-0 h-[3px] w-full transition-transform duration-500 ease-out ${
              isActive ? "scale-x-100" : "scale-x-0"
            }`}
            style={{
              background:
                "linear-gradient(90deg, #b8860b, #d4af37, #f1c40f, #d4af37, #b8860b)",
              transformOrigin: "left",
            }}
          />
        </button>
      );
    })}

  </div>
</div>
         
        
      
      <section className="popular-section w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16">
        <div className="homepage-feature-strip mx-auto max-w-[1420px]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 flex flex-wrap items-center justify-between gap-4 px-0 md:mb-9"
          >
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-950 md:text-[32px]">
  Toutes nos pépites
</h2>
              <p className="mt-1 text-sm text-[#53657f] md:text-[15px]">Selection melangee, renouvelee automatiquement tous les 2 jours.</p>
            </div>
            <Button
              asChild
              variant="outline"
              className="explore-button-desktop rounded-full border-[#e3c16b] bg-white px-6 text-[#8a6917] shadow-none transition-all duration-300 hover:bg-[#fff8ea]"
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                Explorer la boutique <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Mobile only: “Voir toutes nos variétés” before the first band */}
          <div className="mb-3 flex justify-end md:hidden">
            <Link href="/shop" className="text-sm font-medium text-[#694d08] underline underline-offset-4">
              Voir toutes nos variétés
            </Link>
          </div>

          {featuredQuery.isLoading && productsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Chargement des produits...</p>
          ) : null}
          {featuredQuery.isError && productsQuery.isError ? (
            <p className="text-sm text-slate-500">API indisponible.</p>
          ) : null}
          {!featuredQuery.isLoading && !productsQuery.isLoading && displayedItems.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun produit disponible.</p>
          ) : null}


          {/* Horizontal track */}

          {/* Mobile: grille 2 colonnes comme le catalogue */}
<div
  ref={popularSectionRef}
  className="homepage-products-mobile grid grid-cols-2 gap-x-3 gap-y-5 px-1 md:hidden lg:hidden h-[80vh] overflow-y-hidden"
>
 {displayedItems.map((item, idx) =>
    renderPopularCard(item, idx, "mobile")
  )}
</div>

          {/* Desktop track */}

          <motion.div
            ref={popularSectionRef}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}

            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="homepage-feature-track flex"
          >

            {displayedItems.map((item, idx) =>
  renderPopularCard(item, idx, "popular")
)}
          </motion.div>
        </div>
      </section>

      {/* Mobile only: move the “Ready” section just after popular products */}
      {/* Bloc "Prêt à passer au niveau supérieur" déplacé tout en bas */}

      <section className="why-choose-section w-full px-4 pt-6 sm:px-8 md:px-12 md:pt-12">
        <div className="section-divider mx-auto mb-5 h-px w-full max-w-6xl md:mb-8" style={{ backgroundImage: GOLD_GRADIENT }} />
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 text-center md:mb-7"
          >
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-950 md:text-3xl">Pourquoi nous choisir</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <motion.article
                  key={reason.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[20px] border border-[#d4af37]/25 bg-[#faf8f4] p-5 shadow-[0_14px_32px_-28px_rgba(212,175,55,0.45)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(212,175,55,0.55)] md:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_8px_20px_-16px_rgba(212,175,55,0.65)]">
                    <Icon className="h-5 w-5 text-[#8b6b16]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{reason.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{reason.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16 py-8 md:py-12">
        <div className="mx-auto mb-8 h-px w-full max-w-6xl md:mb-12" style={{ backgroundImage: GOLD_GRADIENT }} />
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 text-center md:mb-8"
          >
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-950 md:text-3xl">Comment ça marche</h2>
            <p className="mt-2 text-sm text-slate-600">Un parcours fluide en 4 étapes.</p>
          </motion.div>
          <div className="grid grid-cols-1 gap-y-7 gap-x-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-x-7 lg:gap-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group rounded-[20px] border border-[#d4af37]/25 bg-white p-5 shadow-[0_14px_32px_-28px_rgba(212,175,55,0.42)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(212,175,55,0.58)] md:p-6"
                >
                  <div className="mb-3 text-xs font-semibold tracking-[0.18em] text-slate-400">ETAPE {index + 1}</div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#faf8f4] transition-all duration-400 group-hover:scale-105 group-hover:shadow-[0_12px_24px_-14px_rgba(212,175,55,0.7)]">
                    <Icon className="h-5 w-5 text-[#8b6b16]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Desktop only: keep the “Ready” section in its original position */}
      {/* Bloc "Prêt à passer au niveau supérieur" déplacé tout en bas */}
      <ReadyToLevelUp className="w-full mb-20" />
        </main>
);
}