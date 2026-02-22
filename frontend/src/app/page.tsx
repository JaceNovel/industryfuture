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
import { useEffect, useRef } from "react";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  return `${formatted} F CFA`;
}

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";
const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

type PopularItem = Product;

export default function Home() {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

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
    const button = document.querySelector(".explore-button");
    if (!button) return;
    const timeoutId = window.setTimeout(() => {
      button.classList.add("active");
    }, 300);
    return () => window.clearTimeout(timeoutId);
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
  }, []);

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
  const sourceProducts = featured.length ? featured : fallbackProducts;
  const popularItems: PopularItem[] = sourceProducts.slice(0, 8);

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
      <div className="mobile-banner">
        <section className="w-full bg-white px-0 pb-0 pt-0 sm:px-0 md:px-12 md:pb-10 md:pt-10">
          <motion.section
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="hero-video"
          >
            <video id="heroVideo" ref={heroVideoRef} autoPlay muted playsInline preload="auto">
              <source src="/WhatsApp%20Video%202026-02-21%20at%2002.50.34.mp4" type="video/mp4" />
            </video>
          </motion.section>
        </section>

        <section className="explore-button-mobile-shell hidden w-full">
          <Button
            asChild
            variant="outline"
            className="explore-button explore-button-mobile premium-button rounded-full border-[#d4af37]/40 bg-[#faf8f4] text-[#694d08] shadow-[0_10px_22px_-18px_rgba(212,175,55,0.75)] transition-all duration-400 hover:bg-[#fffaf0] hover:shadow-[0_14px_28px_-16px_rgba(212,175,55,0.75)]"
          >
            <Link href="/shop" className="inline-flex items-center">
              Explorer la boutique
            </Link>
          </Button>
        </section>
      </div>

      <section className="w-full px-4 pt-6 sm:px-8 md:px-12 md:pt-8">
        <div className="section-divider section-divider-hero mx-auto h-px w-full max-w-6xl" style={{ backgroundImage: GOLD_GRADIENT }} />
      </section>

      <section className="popular-section w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 flex flex-wrap items-center justify-between gap-4 md:mb-7"
          >
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-950 md:text-3xl">Produits populaires</h2>
              <p className="mt-1 text-sm text-slate-600">Sélection dynamique des meilleures références.</p>
            </div>
            <Button
              asChild
              variant="outline"
              className="explore-button-desktop rounded-full border-[#d4af37]/40 bg-[#faf8f4] text-[#694d08] shadow-[0_10px_22px_-18px_rgba(212,175,55,0.75)] transition-all duration-400 hover:bg-[#fffaf0] hover:shadow-[0_14px_28px_-16px_rgba(212,175,55,0.75)]"
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                Explorer la boutique <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {featuredQuery.isLoading && productsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Chargement des produits...</p>
          ) : null}
          {featuredQuery.isError && productsQuery.isError ? (
            <p className="text-sm text-slate-500">API indisponible.</p>
          ) : null}
          {!featuredQuery.isLoading && !productsQuery.isLoading && popularItems.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun produit disponible.</p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="popular-products-container grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
          >
            {popularItems.map((item, idx) => {
              const href = `/product/${item.slug}`;
              const img = item.images?.[0]?.url ?? PLACEHOLDER_IMG;

              return (
                <article
                  key={item.id ?? item.slug ?? `popular-${idx}`}
                  className="product-card group rounded-[20px] border border-[#d4af37]/28 bg-white p-4 shadow-[0_14px_35px_-30px_rgba(212,175,55,0.45)] transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(212,175,55,0.55)]"
                >
                  <div className="pointer-events-none absolute" />
                  <Link href={href} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50">
                      {img.startsWith("/") ? (
                        <Image
                          src={img}
                          alt={item.name}
                          fill
                          sizes="(min-width: 1024px) 25vw, 100vw"
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={item.images?.[0]?.alt ?? item.name}
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <h3 className="mt-4 line-clamp-1 text-base font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{formatPrice(item.price)}</p>
                  </Link>
                  <Button
                    asChild
                    variant="outline"
                    className="premium-button mt-4 w-full rounded-full border-[#d4af37]/35 text-[#694d08] transition-all duration-400 hover:bg-[#faf8f4] hover:shadow-[0_12px_24px_-16px_rgba(212,175,55,0.6)]"
                  >
                    <Link href={href}>Voir le produit</Link>
                  </Button>
                </article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="why-choose-section w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16">
        <div className="section-divider mx-auto mb-8 h-px w-full max-w-6xl md:mb-12" style={{ backgroundImage: GOLD_GRADIENT }} />
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

      <section className="w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16">
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
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

      <section className="cta-section w-full px-4 pt-10 sm:px-8 md:px-12 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl rounded-[28px] bg-[#111014] px-5 py-8 text-white shadow-[0_24px_50px_-40px_rgba(0,0,0,0.6)] md:px-10 md:py-14"
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
    </main>
  );
}
