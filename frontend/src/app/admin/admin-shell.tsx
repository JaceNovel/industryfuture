"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Heart,
  Megaphone,
  Package,
  Percent,
  Plus,
  Settings,
  ShoppingBag,
  Tags,
  Ticket,
  Users,
  Menu,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { apiGet } from "@/lib/api";

const BRAND_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

const NOTIFICATION_LAST_SEEN_KEY = "admin_notifications_last_seen_at";
const NOTIFICATION_LAST_PUSHED_KEY = "admin_notifications_last_pushed_at";

type AdminNotification = {
  type: "order" | "user" | "withdrawal";
  id: number;
  created_at?: string;
  title: string;
  message: string;
  href: string;
};

type NotificationsResponse = {
  data: AdminNotification[];
  unread_count: number;
  server_time?: string;
};

function formatNotifDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type NavItem = {
  label: string;
  href?: string;
  icon: ReactNode;
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const inProductsSection = pathname.startsWith("/admin/products");
  const inCategoriesSection = pathname.startsWith("/admin/categories");
  const inPromotionsSection = pathname.startsWith("/admin/promotions");
  const inPromoCodesSection = pathname.startsWith("/admin/promo-codes");
  const inOffersSection = pathname.startsWith("/admin/offers");
  const inSettingsSection = pathname.startsWith("/admin/settings");
  const [productsOpen, setProductsOpen] = useState(inProductsSection);
  const [categoriesOpen, setCategoriesOpen] = useState(inCategoriesSection);
  const [promotionsOpen, setPromotionsOpen] = useState(inPromotionsSection);
  const [promoCodesOpen, setPromoCodesOpen] = useState(inPromoCodesSection);
  const [offersOpen, setOffersOpen] = useState(inOffersSection);

  useEffect(() => {
    if (inProductsSection) setProductsOpen(true);
  }, [inProductsSection]);

  useEffect(() => {
    if (inCategoriesSection) setCategoriesOpen(true);
  }, [inCategoriesSection]);

  useEffect(() => {
    if (inPromotionsSection) setPromotionsOpen(true);
  }, [inPromotionsSection]);

  useEffect(() => {
    if (inPromoCodesSection) setPromoCodesOpen(true);
  }, [inPromoCodesSection]);

  useEffect(() => {
    if (inOffersSection) setOffersOpen(true);
  }, [inOffersSection]);

  const isActive = (href?: string) => (href && pathname === href ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20");

  const items: NavItem[] = [
    { label: "Commandes", href: "/admin/orders", icon: <Package className="h-4 w-4" /> },
    { label: "Paramètres", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <nav className="space-y-1 p-3">
      <Link
        href="/admin"
        className={"flex items-center gap-3 rounded-lg px-3 py-2 text-sm " + isActive("/admin")}
        onClick={() => {
          onNavigate?.();
        }}
      >
        <span className="text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
        </span>
        <span className="truncate">Tableau de bord</span>
      </Link>

      <Link
        href="/admin/users"
        className={"flex items-center gap-3 rounded-lg px-3 py-2 text-sm " + isActive("/admin/users")}
        onClick={() => {
          onNavigate?.();
        }}
      >
        <span className="text-muted-foreground">
          <Users className="h-4 w-4" />
        </span>
        <span className="truncate">Utilisateurs</span>
      </Link>

      <button
        type="button"
        onClick={() => setProductsOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inProductsSection ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20")
        }
        aria-expanded={productsOpen}
      >
        <span className="text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
        </span>
        <span className="truncate">Produits</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
      </button>

      {productsOpen ? (
        <div className="ml-7 space-y-1 border-l border-border pl-3">
          <Link
            href="/admin/products"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/products"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Liste
          </Link>
          <Link
            href="/admin/products/add"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/products/add"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Ajouter
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setCategoriesOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inCategoriesSection ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20")
        }
        aria-expanded={categoriesOpen}
      >
        <span className="text-muted-foreground">
          <Tags className="h-4 w-4" />
        </span>
        <span className="truncate">Catégories</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
      </button>

      {categoriesOpen ? (
        <div className="ml-7 space-y-1 border-l border-border pl-3">
          <Link
            href="/admin/categories"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/categories"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Liste
          </Link>
          <Link
            href="/admin/categories/add"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/categories/add"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Ajouter
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPromotionsOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inPromotionsSection ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20")
        }
        aria-expanded={promotionsOpen}
      >
        <span className="text-muted-foreground">
          <Megaphone className="h-4 w-4" />
        </span>
        <span className="truncate">Promotions</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${promotionsOpen ? "rotate-180" : ""}`} />
      </button>

      {promotionsOpen ? (
        <div className="ml-7 space-y-1 border-l border-border pl-3">
          <Link
            href="/admin/promotions"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/promotions"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Liste
          </Link>
          <Link
            href="/admin/promotions/add"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/promotions/add"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Ajouter
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPromoCodesOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inPromoCodesSection ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20")
        }
        aria-expanded={promoCodesOpen}
      >
        <span className="text-muted-foreground">
          <Ticket className="h-4 w-4" />
        </span>
        <span className="truncate">Codes Promo</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${promoCodesOpen ? "rotate-180" : ""}`} />
      </button>

      {promoCodesOpen ? (
        <div className="ml-7 space-y-1 border-l border-border pl-3">
          <Link
            href="/admin/promo-codes"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/promo-codes"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Liste
          </Link>
          <Link
            href="/admin/promo-codes/add"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/promo-codes/add"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Ajouter
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOffersOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inOffersSection ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20")
        }
        aria-expanded={offersOpen}
      >
        <span className="text-muted-foreground">
          <Percent className="h-4 w-4" />
        </span>
        <span className="truncate">Offres</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${offersOpen ? "rotate-180" : ""}`} />
      </button>

      {offersOpen ? (
        <div className="ml-7 space-y-1 border-l border-border pl-3">
          <Link
            href="/admin/offers"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/offers"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Liste
          </Link>
          <Link
            href="/admin/offers/add"
            className={
              "block rounded-md px-2 py-1.5 text-sm " +
              (pathname === "/admin/offers/add"
                ? "bg-muted/30 text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            Ajouter
          </Link>
        </div>
      ) : null}

      {items.map((it) => {
        const href = it.href;
        const disabled = !href;
        const className =
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (inSettingsSection && href === "/admin/settings"
            ? "bg-muted/30 text-foreground"
            : disabled
            ? "cursor-not-allowed text-muted-foreground/50"
            : isActive(href));

        return disabled ? (
          <div key={it.label} className={className} aria-disabled="true">
            <span className="text-muted-foreground/50">{it.icon}</span>
            <span className="truncate">{it.label}</span>
          </div>
        ) : (
          <Link
            key={it.label}
            href={href}
            className={className}
            onClick={() => {
              onNavigate?.();
            }}
          >
            <span className="text-muted-foreground">{it.icon}</span>
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const markAllAsRead = () => {
    if (typeof window === "undefined") return;
    const nowIso = new Date().toISOString();
    localStorage.setItem(NOTIFICATION_LAST_SEEN_KEY, nowIso);
    setUnreadCount(0);
  };

  useEffect(() => {
    let mounted = true;

    const playNotificationSound = () => {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.04;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
        oscillator.onended = () => {
          context.close().catch(() => {});
        };
      } catch {
      }
    };

    const notifyBrowser = (items: AdminNotification[]) => {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const lastPushedRaw = localStorage.getItem(NOTIFICATION_LAST_PUSHED_KEY);
      if (!lastPushedRaw) {
        localStorage.setItem(NOTIFICATION_LAST_PUSHED_KEY, new Date().toISOString());
        return;
      }

      const lastPushedAt = new Date(lastPushedRaw).getTime();
      if (!Number.isFinite(lastPushedAt)) return;

      const newlyArrived = items
        .filter((item) => {
          if (!item.created_at) return false;
          const t = new Date(item.created_at).getTime();
          return Number.isFinite(t) && t > lastPushedAt;
        })
        .sort((a, b) => {
          const ta = new Date(a.created_at ?? 0).getTime();
          const tb = new Date(b.created_at ?? 0).getTime();
          return ta - tb;
        });

      for (const item of newlyArrived.slice(0, 5)) {
        new Notification(item.title, { body: item.message });
      }

      if (newlyArrived.length > 0) {
        playNotificationSound();
      }

      if (newlyArrived.length > 0) {
        const latest = newlyArrived[newlyArrived.length - 1]?.created_at;
        if (latest) localStorage.setItem(NOTIFICATION_LAST_PUSHED_KEY, latest);
      }
    };

    const fetchNotifications = async () => {
      try {
        const since = localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY);
        const query = since ? `?since=${encodeURIComponent(since)}` : "";
        const res = await apiGet<NotificationsResponse>(`/api/admin/notifications${query}`);

        if (!mounted) return;
        setNotifications(res.data ?? []);
        setUnreadCount(Number(res.unread_count ?? 0));
        notifyBrowser(res.data ?? []);
      } catch {
        if (!mounted) return;
      }
    };

    fetchNotifications();
    const id = window.setInterval(fetchNotifications, 15000);

    if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!notifOpen || typeof window === "undefined") return;
    markAllAsRead();
  }, [notifOpen]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden w-72 flex-col border-r bg-background lg:flex">
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="relative h-10 w-10">
              <Image src={BRAND_IMG} alt="Industrie de l'avenir" fill sizes="40px" className="object-contain" />
            </div>
            <div className="text-lg font-semibold text-destructive">Admin</div>
          </div>

          <div className="flex-1 overflow-auto">
            <NavLinks />
          </div>

          <div className="border-t px-4 py-4 text-xs text-muted-foreground">Powered by Gestionnaire</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle className="flex items-center gap-3 text-destructive">
                      <div className="relative h-9 w-9">
                        <Image src={BRAND_IMG} alt="Industrie de l'avenir" fill sizes="36px" className="object-contain" />
                      </div>
                      Admin
                    </SheetTitle>
                  </SheetHeader>
                  <NavLinks onNavigate={() => setNavOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher…" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="outline" size="icon" aria-label="Notifications" onClick={() => setNotifOpen((v) => !v)}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Button>

                {notifOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-[92vw] max-w-[360px] overflow-hidden rounded-xl border bg-background shadow-lg">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div className="text-sm font-semibold">Notifications</div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllAsRead}>
                          Tout marquer lu
                        </Button>
                        <Badge variant="secondary">{notifications.length}</Badge>
                      </div>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      {notifications.length ? (
                        notifications.map((item) => (
                          <Link
                            key={`${item.type}-${item.id}-${item.created_at ?? "na"}`}
                            href={item.href}
                            className="block border-b px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                            onClick={() => setNotifOpen(false)}
                          >
                            <div className="font-medium">{item.title}</div>
                            <div className="mt-0.5 text-muted-foreground">{item.message}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{formatNotifDate(item.created_at)}</div>
                          </Link>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <Button
                variant="destructive"
                size="icon"
                aria-label="Favoris"
                className="h-10 w-10"
              >
                <div className="relative">
                  <Heart className="h-5 w-5" />
                  <Plus className="absolute -right-2 -top-2 h-4 w-4" />
                </div>
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1200px] px-4 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
