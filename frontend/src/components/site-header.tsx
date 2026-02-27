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
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  LogOut,
  Search,
  Shirt,
  ShoppingCart,
  ShoppingBag,
  Shapes,
  Smartphone,
  Tag,
  Truck,
  Package,
  LogIn,
  User,
  UserPlus,
  WashingMachine,
  Watch,
  X,
} from "lucide-react";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61578635757172";
const TIKTOK_URL = "https://www.tiktok.com/@a_d_a_n.gladiator?_r=1&_t=ZS-941CIvuHTwv";
const INSTAGRAM_URL = "https://www.instagram.com/meslmenehasn?utm_source=qr&igsh=YjJ5aTRid3Zkangy";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const syncAuthState = () => {
    setToken(getToken());
    setRole(getRole());
    setName(getName());
    setEmail(getEmail());
  };

  useEffect(() => {
    syncAuthState();
  }, []);

  useEffect(() => {
    syncAuthState();
  }, [pathname]);

  useEffect(() => {
    const onFocus = () => syncAuthState();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
    setMobileMenuOpen(false);
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
    <header className="site-header sticky top-0 z-20 border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        {/* Left: brand + burger + primary links */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-md p-2 hover:bg-muted/30 md:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[82vw] max-w-[380px] p-0" showCloseButton={false}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-7 w-7 shrink-0">
                      <Image
                        src="/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png"
                        alt="Industrie de l'avenir"
                        fill
                        sizes="28px"
                        className="object-contain"
                      />
                    </div>
                    <SheetTitle className="text-xl font-semibold tracking-tight">Industrie de l&apos;avenir</SheetTitle>
                  </div>

                  <SheetClose asChild>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-primary/40 text-foreground hover:bg-muted/30"
                      aria-label="Fermer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </SheetClose>
                </div>

                <div className="flex flex-1 flex-col overflow-hidden px-4 py-4">
                  <div className="shrink-0">
                    <div className="text-lg font-medium">Navigation</div>
                    <div className="mt-3 space-y-1">
                      <SheetClose asChild>
                        <Link href="/shop" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          <span className="text-base">Tous les produits</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/shop?offers=grouped"
                          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                        >
                          <Tag className="h-5 w-5 text-muted-foreground" />
                          <span className="text-base">Offres groupées</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/promotions"
                          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                        >
                          <Megaphone className="h-5 w-5 text-muted-foreground" />
                          <span className="text-base">Promotions</span>
                        </Link>
                      </SheetClose>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 text-lg font-medium">Catégories</div>
                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                      <div className="space-y-1">
                        {(categoriesQuery.data ?? []).map((c) => {
                          const Icon = categoryIcon(c);
                          return (
                            <SheetClose key={c.slug} asChild>
                              <Link
                                href={`/shop?category=${encodeURIComponent(c.slug)}`}
                                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                              >
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </span>
                                <span className="truncate text-base text-foreground/90">{c.name}</span>
                              </Link>
                            </SheetClose>
                          );
                        })}
                        {!categoriesQuery.data?.length ? (
                          <div className="px-2 py-2 text-sm text-muted-foreground">Aucune catégorie.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 shrink-0 pt-2">
                    <div className="text-lg font-medium">{token ? "Mon compte" : "Compte"}</div>
                    {!token ? (
                      <div className="mt-3 space-y-1">
                        <SheetClose asChild>
                          <Link
                            href="/auth/login"
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                          >
                            <LogIn className="h-5 w-5 text-muted-foreground" />
                            <span className="text-base">Connexion</span>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            href="/auth/register"
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                          >
                            <UserPlus className="h-5 w-5 text-muted-foreground" />
                            <span className="text-base">Inscription</span>
                          </Link>
                        </SheetClose>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-1">
                        <SheetClose asChild>
                          <Link
                            href="/tracking"
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                          >
                            <Truck className="h-5 w-5 text-muted-foreground" />
                            <span className="text-base">Suivi de commande</span>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            href="/account/orders"
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                          >
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <span className="text-base">Mes commandes</span>
                          </Link>
                        </SheetClose>

                        <div className="my-2 h-px bg-border" />

                        <SheetClose asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-destructive hover:bg-muted/30"
                            onClick={() => {
                              clearAuthCookies();
                              setToken(null);
                              setRole(null);
                              setName(null);
                              setEmail(null);
                              setMobileMenuOpen(false);
                              router.push("/");
                            }}
                          >
                            <LogOut className="h-5 w-5" />
                            <span className="text-base">Déconnexion</span>
                          </button>
                        </SheetClose>
                      </div>
                    )}
                    {!token ? (
                      <div className="mt-4 flex items-center gap-3 px-2">
                        <a
                          href={FACEBOOK_URL}
                          aria-label="Facebook"
                          className="inline-flex items-center justify-center rounded-md border p-2 text-foreground hover:bg-muted/30"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FacebookLogo className="h-5 w-5" />
                        </a>
                        <a
                          href={TIKTOK_URL}
                          aria-label="TikTok"
                          className="inline-flex items-center justify-center rounded-md border p-2 text-foreground hover:bg-muted/30"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <TikTokLogo className="h-5 w-5" />
                        </a>
                        <a
                          href={INSTAGRAM_URL}
                          aria-label="Instagram"
                          className="inline-flex items-center justify-center rounded-md border p-2 text-foreground hover:bg-muted/30"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <InstagramLogo className="h-5 w-5" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="relative -my-2 h-16 w-16 sm:h-20 sm:w-20 md:-my-3 md:h-24 md:w-24">
              <Image
                src="/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png"
                alt="Industrie de l'avenir"
                fill
                sizes="(min-width: 768px) 96px, (min-width: 640px) 80px, 64px"
                className="object-contain"
                priority
              />
            </span>
          </Link>

          <div className="relative hidden md:block" ref={categoriesRef}>
            <button
              type="button"
              onClick={() => setCategoriesOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={categoriesOpen}
              className="nav-link inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors duration-200 hover:bg-transparent hover:text-accent"
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
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 hover:bg-transparent hover:text-accent"
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
            <Link href="/promotions" className={`${active("/promotions")} nav-link transition-colors duration-200 hover:text-accent`}>
              Promotions
            </Link>
            <Link
              href="/shop"
              className="nav-link nav-shop-cta inline-flex items-center gap-2 text-primary transition-colors duration-200 hover:text-accent"
            >
              <ShoppingCart className="h-4 w-4" />
              Produits
            </Link>
            {role === "admin" ? (
              <Link href="/admin" className={`${active("/admin")} nav-link transition-colors duration-200 hover:text-accent`}>
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
              className="h-10 pr-10 transition-colors duration-200 hover:border-accent focus-visible:border-accent"
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
            className="nav-link hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-transparent hover:text-accent md:inline-flex"
          >
            <Truck className="h-4 w-4" />
            <span>Suivi</span>
          </Link>
          <Link
            href={token ? "/account/orders" : "/auth/login"}
            className="nav-link hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-transparent hover:text-accent md:inline-flex"
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
                className="nav-link inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-transparent hover:text-accent"
              >
                <User className="h-4 w-4" />
                <span>Compte</span>
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="nav-link inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-transparent hover:text-accent"
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
            href="/shop"
            aria-label="Rechercher"
            className="mobile-search-icon inline-flex items-center rounded-md p-2 text-foreground hover:bg-muted/30 md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            data-cart-target
            className="nav-link relative inline-flex items-center rounded-md p-2 hover:bg-transparent"
            aria-label="Panier"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>

        </div>
      </div>
    </header>
  );
}
