"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Bell,
  ClipboardList,
  Heart,
  Mail,
  Megaphone,
  Package,
  Percent,
  Plus,
  Settings,
  ShoppingBag,
  Tags,
  Ticket,
  Users,
  Wrench,
  Star,
  Headphones,
  Menu,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const BRAND_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

type NavItem = {
  label: string;
  href?: string;
  icon: ReactNode;
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href?: string) => (href && pathname === href ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/20");

  const items: NavItem[] = [
    { label: "Tableau de bord", href: "/admin", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Produits", href: "/admin/products", icon: <ShoppingBag className="h-4 w-4" /> },
    { label: "Categories", href: "/admin/categories", icon: <Tags className="h-4 w-4" /> },
    { label: "Commandes", href: "/admin/orders", icon: <Package className="h-4 w-4" /> },

    // Items shown in the screenshot but not implemented in this repo yet.
    { label: "Utilisateurs", icon: <Users className="h-4 w-4" /> },
    { label: "Promotions", icon: <Megaphone className="h-4 w-4" /> },
    { label: "Codes Promo", icon: <Ticket className="h-4 w-4" /> },
    { label: "Offres", icon: <Percent className="h-4 w-4" /> },
    { label: "Email", icon: <Mail className="h-4 w-4" /> },
    { label: "Support Client", icon: <Headphones className="h-4 w-4" /> },
    { label: "Demandes d'Importation", icon: <Wrench className="h-4 w-4" /> },
    { label: "Avis Clients", icon: <Star className="h-4 w-4" /> },
    { label: "Paramètres", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <nav className="space-y-1 p-3">
      {items.map((it) => {
        const href = it.href;
        const disabled = !href;
        const className =
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm " +
          (disabled
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden w-72 flex-col border-r bg-background lg:flex">
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="relative h-10 w-10">
              <Image src={BRAND_IMG} alt="IndustryFuture" fill sizes="40px" className="object-contain" />
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
                        <Image src={BRAND_IMG} alt="IndustryFuture" fill sizes="36px" className="object-contain" />
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
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
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
