"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Cart } from "@/lib/types";
import { clearAuthCookies, getEmail, getName, getRole, getToken } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  BaggageClaim,
  Cpu,
  Dumbbell,
  Footprints,
  Gamepad2,
  Gem,
  Grid2X2,
  HeartPulse,
  Home,
  Megaphone,
  Menu,
  Search,
  Shirt,
  ShoppingCart,
  ShoppingBag,
  Shapes,
  Smartphone,
  Tag,
  Truck,
  Package,
  User,
  WashingMachine,
  Watch,
} from "lucide-react";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [accountOpenMobile, setAccountOpenMobile] = useState(false);
  const accountMobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setToken(getToken());
    setRole(getRole());
    setName(getName());
    setEmail(getEmail());
  }, []);

  const active = (href: string) =>
    pathname === href ? "text-foreground" : "text-foreground hover:text-foreground";

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiGet<Cart>("/api/cart"),
    enabled: Boolean(token),
    staleTime: 10_000,
  });

  const cartCount = (cartQuery.data?.items ?? []).reduce((sum, item) => sum + (item.qty ?? 0), 0);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Array<{ name: string; slug: string; icon?: string | null }>>("/api/categories"),
    staleTime: 60_000,
  });

  useEffect(() => {
    setCategoriesOpen(false);
    setAccountOpen(false);
    setAccountOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    if (!categoriesOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCategoriesOpen(false);
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = categoriesRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setCategoriesOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [categoriesOpen]);

  useEffect(() => {
    if (!accountOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = accountRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setAccountOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!accountOpenMobile) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpenMobile(false);
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const root = accountMobileRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setAccountOpenMobile(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [accountOpenMobile]);

  const categoryIcon = useMemo(() => {
    const byKey: Record<string, typeof Tag> = {
      "grid-2x2": Grid2X2,
      tag: Tag,
      shirt: Shirt,
      "shopping-bag": ShoppingBag,
      "book-open": BookOpen,
      "baggage-claim": BaggageClaim,
      watch: Watch,
      gem: Gem,
      "gamepad-2": Gamepad2,
      "washing-machine": WashingMachine,
      "heart-pulse": HeartPulse,
      smartphone: Smartphone,
      home: Home,
      shapes: Shapes,
      footprints: Footprints,
      dumbbell: Dumbbell,
      cpu: Cpu,
    };

    return (c: { name: string; icon?: string | null }) => {
      const key = (c.icon ?? "").trim().toLowerCase();
      if (key && byKey[key]) return byKey[key];

      const n = c.name.toLowerCase();
      if (n.includes("livre") || n.includes("film") || n.includes("musique")) return BookOpen;
      if (n.includes("bag") || n.includes("sac") || n.includes("bagage")) return BaggageClaim;
      if (n.includes("bijou") || n.includes("montre")) return Watch;
      if (n.includes("electrom") || n.includes("électrom")) return WashingMachine;
      if (n.includes("sant") || n.includes("beauté") || n.includes("beaute")) return HeartPulse;
      if (n.includes("maison") || n.includes("cuisine")) return Home;
      if (n.includes("télé") || n.includes("tele") || n.includes("phone") || n.includes("smart")) return Smartphone;
      if (n.includes("chauss") || n.includes("shoe")) return Footprints;
      if (n.includes("sport")) return Dumbbell;
      if (n.includes("electron") || n.includes("électron")) return Cpu;
      if (n.includes("divert") || n.includes("jeu")) return Gamepad2;
      return Tag;
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        {/* Left: brand + burger + primary links */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="relative -my-1 h-14 w-14 sm:h-16 sm:w-16 md:-my-2 md:h-20 md:w-20">
              <Image
                src="/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png"
                alt="IndustryFuture"
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </span>
          </Link>

          <div className="relative" ref={categoriesRef}>
            <button
              type="button"
              onClick={() => setCategoriesOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={categoriesOpen}
              className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/30"
            >
              <Menu className="h-5 w-5" />
              <span>Catégories</span>
            </button>

            {categoriesOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border bg-background"
              >
                <div className="max-h-[70vh] overflow-auto p-2">
                  {(categoriesQuery.data ?? []).map((c) => {
                    const Icon = categoryIcon(c);
                    return (
                      <Link
                        key={c.slug}
                        href={`/shop?category=${encodeURIComponent(c.slug)}`}
                        role="menuitem"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/30"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{c.name}</span>
                      </Link>
                    );
                  })}
                  {!categoriesQuery.data?.length ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aucune catégorie.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/promotions" className={active("/promotions")}>
              Promotions
            </Link>
            <Link href="/shop" className="inline-flex items-center gap-2 text-destructive hover:text-destructive/90">
              <ShoppingCart className="h-4 w-4" />
              Produits
            </Link>
            {role === "admin" ? (
              <Link href="/admin" className={active("/admin")}>
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        {/* Middle: search */}
        <div className="mx-auto hidden w-full max-w-xl md:block">
          <div className="relative">
            <Input
              placeholder="Rechercher un produit…"
              className="h-10 pr-10"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const q = (e.target as HTMLInputElement).value?.trim();
                const url = q ? `/shop?search=${encodeURIComponent(q)}` : "/shop";
                window.location.href = url;
              }}
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/tracking"
            className="hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/30 md:inline-flex"
          >
            <Truck className="h-4 w-4" />
            <span>Suivi</span>
          </Link>
          <Link
            href={token ? "/account/orders" : "/auth/login"}
            className="hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/30 md:inline-flex"
          >
            <Package className="h-4 w-4" />
            <span>Commandes</span>
          </Link>

          <div className="relative hidden md:block" ref={accountRef}>
            {token ? (
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
              >
                <User className="h-4 w-4" />
                <span>Compte</span>
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/30"
              >
                <User className="h-4 w-4" />
                <span>Compte</span>
              </Link>
            )}

            {token && accountOpen ? (
              <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border bg-background">
                <div className="px-4 py-3">
                  <div className="text-sm font-semibold leading-tight">{name ?? "Mon compte"}</div>
                  <div className="text-sm text-muted-foreground leading-tight">{email ?? ""}</div>
                </div>
                <div className="h-px bg-border" />
                <div className="py-1">
                  <Link
                    href="/account"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpen(false)}
                  >
                    Mon Profil
                  </Link>
                  <Link
                    href="/account/orders"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpen(false)}
                  >
                    Mes Commandes
                  </Link>
                  <Link
                    href="/account/addresses"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpen(false)}
                  >
                    Mes Adresses
                  </Link>
                </div>
                <div className="h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted/30"
                  onClick={() => {
                    clearAuthCookies();
                    setToken(null);
                    setRole(null);
                    setName(null);
                    setEmail(null);
                    setAccountOpen(false);
                    router.push("/");
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            ) : null}
          </div>

          <Link
            href="/cart"
            data-cart-target
            className="relative inline-flex items-center rounded-md p-2 hover:bg-muted/30"
            aria-label="Panier"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {/* Mobile icons */}
          <div className="relative md:hidden" ref={accountMobileRef}>
            {token ? (
              <button
                type="button"
                onClick={() => setAccountOpenMobile((v) => !v)}
                className="inline-flex items-center rounded-md p-2 hover:bg-muted/30"
                aria-label="Compte"
                aria-haspopup="menu"
                aria-expanded={accountOpenMobile}
              >
                <User className="h-5 w-5" />
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-md p-2 hover:bg-muted/30"
                aria-label="Compte"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            {token && accountOpenMobile ? (
              <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border bg-background">
                <div className="px-4 py-3">
                  <div className="text-sm font-semibold leading-tight">{name ?? "Mon compte"}</div>
                  <div className="text-sm text-muted-foreground leading-tight">{email ?? ""}</div>
                </div>
                <div className="h-px bg-border" />
                <div className="py-1">
                  <Link
                    href="/account"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpenMobile(false)}
                  >
                    Mon Profil
                  </Link>
                  <Link
                    href="/account/orders"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpenMobile(false)}
                  >
                    Mes Commandes
                  </Link>
                  <Link
                    href="/account/addresses"
                    role="menuitem"
                    className="block px-4 py-2 text-sm hover:bg-muted/30"
                    onClick={() => setAccountOpenMobile(false)}
                  >
                    Mes Adresses
                  </Link>
                </div>
                <div className="h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted/30"
                  onClick={() => {
                    clearAuthCookies();
                    setToken(null);
                    setRole(null);
                    setName(null);
                    setEmail(null);
                    setAccountOpenMobile(false);
                    router.push("/");
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            ) : null}
          </div>
          <Link
            href="/promotions"
            className="inline-flex items-center rounded-md p-2 hover:bg-muted/30 md:hidden"
            aria-label="Promotions"
          >
            <Megaphone className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
