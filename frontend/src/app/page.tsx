"use client";

import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Headset,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

function formatPrice(v: unknown) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2)} €`;
}

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

const GOLD_GRADIENT =
  "linear-gradient(135deg, #C6A75E, #E6C97A, #F8E6B0, #D4AF37, #B8962E)";

type PopularItem = Product;

function useInViewOnce<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || inView) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView };
}

function MagneticWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 240, damping: 18 });
  const springY = useSpring(y, { stiffness: 240, damping: 18 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={(event) => {
        if (reduceMotion || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        x.set(dx * 0.12);
        y.set(dy * 0.12);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
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

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const { ref: productsRef, inView: productsInView } = useInViewOnce<HTMLDivElement>({
    threshold: 0.18,
  });
  const { ref: stepsRef, inView: stepsInView } = useInViewOnce<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: valuesRef, inView: valuesInView } = useInViewOnce<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: ctaRef, inView: ctaInView } = useInViewOnce<HTMLDivElement>({
    threshold: 0.2,
  });
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

  const values = [
    {
      title: "Livraison rapide",
      description: "Des delais courts et un suivi clair.",
      icon: Truck,
    },
    {
      title: "Qualite premium",
      description: "Selection rigoureuse des produits.",
      icon: BadgeCheck,
    },
    {
      title: "Paiement securise",
      description: "Transactions protegees en continu.",
      icon: ShieldCheck,
    },
    {
      title: "Support client",
      description: "Equipe disponible avant et apres achat.",
      icon: Headset,
    },
  ];

  return (
    <motion.main
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <section className="relative w-full">
        <div className="relative h-[48vh] min-h-[260px] max-h-[520px] w-full sm:min-h-[320px] md:h-[62vh] md:min-h-[420px] md:max-h-[720px]">
          <Image
            src="/image.png"
            alt="Banniere principale"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-14">
        <section ref={productsRef} className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#0E1A2B]">Produits populaires</h2>
              <p className="mt-1 text-sm text-[#14263C]/70">Les incontournables selectionnes pour vous.</p>
            </div>
            <Button asChild variant="ghost" className="text-[#0E1A2B]">
              <Link href="/shop" className="inline-flex items-center gap-2">
                Voir tout le catalogue <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6">
            {featuredQuery.isLoading && productsQuery.isLoading ? (
              <div className="text-sm text-[#14263C]/70">Chargement...</div>
            ) : null}
            {featuredQuery.isError && productsQuery.isError ? (
              <div className="text-sm text-[#14263C]/70">API indisponible.</div>
            ) : null}
            {!featuredQuery.isLoading && !productsQuery.isLoading && popularItems.length === 0 ? (
              <div className="text-sm text-[#14263C]/70">Aucun article disponible.</div>
            ) : null}

            {popularItems.length > 0 ? (
              <motion.div
                initial="hidden"
                animate={productsInView ? "show" : "hidden"}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
                }}
                className="product-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {popularItems.map((item, idx) => {
                  const href = `/product/${item.slug}`;
                  const img = item.images?.[0]?.url ?? PLACEHOLDER_IMG;
                  return (
                    <motion.div
                      key={item.id ?? item.slug ?? `popular-${idx}`}
                      variants={fadeUp}
                      className="glass-card product-card group relative rounded-3xl p-4 transition-all duration-300"
                    >
                      <div
                        className="gold-tag absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0E1A2B]"
                        style={{ backgroundImage: GOLD_GRADIENT }}
                      >
                        Populaire
                      </div>
                      {item.is_promo ? (
                        <div className="promo-tag absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                          Promo
                        </div>
                      ) : null}
                      <Link href={href} className="block">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/70">
                          {img.startsWith("/") ? (
                            <Image
                              src={img}
                              alt={item.name}
                              fill
                              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                              className="object-contain transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={item.images?.[0]?.alt ?? item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="truncate text-base font-semibold text-[#0E1A2B]">{item.name}</div>
                          <div className="text-sm text-[#14263C]/70">{formatPrice(item.price)}</div>
                        </div>
                      </Link>
                      <MagneticWrap className="mt-4">
                        <Button asChild className="gold-button w-full border border-white/40 text-[#0E1A2B] shadow-xl">
                          <Link href={href}>Voir le produit</Link>
                        </Button>
                      </MagneticWrap>
                      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[#0E1A2B]/10 transition-all duration-300 group-hover:ring-[#D4AF37]/40" />
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : null}
          </div>
        </section>

        <section ref={stepsRef} className="mt-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#0E1A2B]">Comment ca marche</h2>
            <p className="mt-2 text-sm text-[#14263C]/70">4 etapes fluides pour une experience premium.</p>
          </div>

          <div className="relative mt-10">
            <motion.div
              className="steps-line absolute left-6 right-6 top-8 hidden h-px md:block"
              initial={{ scaleX: 0 }}
              animate={stepsInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
            />
            <motion.div
              initial="hidden"
              animate={stepsInView ? "show" : "hidden"}
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
              className="steps-grid grid gap-6 md:grid-cols-4"
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    className="glass-card step-card group relative overflow-hidden rounded-3xl p-6 transition-all duration-300"
                  >
                    <div className="pointer-events-none absolute -right-4 -top-6 text-6xl font-semibold text-[#D4AF37]/18">
                      {index + 1}
                    </div>
                    <div className="step-icon flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-xl">
                      <Icon className="h-6 w-6 text-[#14263C]" />
                    </div>
                    <div className="mt-4 text-lg font-semibold text-[#0E1A2B]">{step.title}</div>
                    <p className="mt-2 text-sm text-[#14263C]/70">{step.description}</p>
                    <div
                      className="steps-line mt-4 h-1 w-10 rounded-full"
                      style={{ backgroundImage: GOLD_GRADIENT }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section ref={valuesRef} className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#0E1A2B]">Nos valeurs</h2>
              <p className="mt-2 text-sm text-[#14263C]/70">Des garanties claires pour une confiance totale.</p>
            </div>
            <div className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0E1A2B]/60 md:flex">
              <Sparkles className="h-4 w-4" />
              Premium service
            </div>
          </div>
          <motion.div
            initial="hidden"
            animate={valuesInView ? "show" : "hidden"}
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  variants={fadeUp}
                  className="glass-card value-card group relative rounded-3xl p-6 transition-all duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-xl">
                    <Icon className="h-6 w-6 text-[#0E1A2B]" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[#0E1A2B]">{value.title}</div>
                  <p className="mt-2 text-sm text-[#14263C]/70">{value.description}</p>
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[#0E1A2B]/10 transition-all duration-300 group-hover:ring-[#D4AF37]/40" />
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        <section ref={ctaRef} className="mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[32px] bg-[#0E1A2B] px-6 py-10 text-white shadow-xl md:px-12 md:py-14"
          >
            <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Sparkles className="h-4 w-4" />
                  Ready to launch
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Passez a la vitesse premium.</h2>
                <p className="mt-3 text-sm text-white/80">
                  Une homepage lumineuse, des parcours ultra rapides, une experience high-tech qui inspire confiance.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <MagneticWrap className="inline-block">
                  <Button asChild className="gold-button relative overflow-hidden border border-white/10 text-[#0E1A2B] shadow-xl">
                    <Link href="/shop" className="inline-flex items-center gap-2">
                      Lancer votre commande
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </MagneticWrap>
                <Button asChild variant="ghost" className="border border-white/30 text-white hover:bg-white/10">
                  <Link href="/auth/login">Acces client</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </motion.main>
  );
}
