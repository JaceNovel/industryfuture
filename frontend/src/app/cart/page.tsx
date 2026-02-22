"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Cart } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";

const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

function lineTotal(price: unknown, qty: number) {
  return Number(price ?? 0) * qty;
}

function formatMoneyFCFA(v: unknown) {
  const n = Number(v ?? 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  return `${formatted} F CFA`;
}

export default function CartPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiGet<Cart>("/api/cart"),
  });

  const updateQty = useMutation({
    mutationFn: ({ product_id, qty }: { product_id: number; qty: number }) => apiPatch<Cart>("/api/cart", { product_id, qty }),
    onSuccess: (data) => qc.setQueryData(["cart"], data),
  });

  const removeItem = useMutation({
    mutationFn: (product_id: number) => apiDelete<Cart>("/api/cart", { product_id }),
    onSuccess: (data) => qc.setQueryData(["cart"], data),
  });

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const subtotal = items.reduce((acc, it) => acc + lineTotal(it.product?.price, it.qty), 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-[#d4af37]/18 bg-white p-6 shadow-[0_26px_55px_-46px_rgba(212,175,55,0.55)] md:p-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(900px 300px at 20% 0%, rgba(212,175,55,0.16), transparent 60%), radial-gradient(700px 240px at 90% 20%, rgba(184,134,11,0.12), transparent 55%)",
          }}
        />

        <div className="relative flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-950 md:text-4xl">Panier</h1>
            <p className="mt-1 text-sm text-slate-600">Ajustez vos quantités, puis validez la commande.</p>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-full border-[#d4af37]/30 bg-white/60 text-[#694d08] shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] transition-all hover:bg-[#fffaf0] hover:shadow-[0_16px_28px_-18px_rgba(212,175,55,0.75)] sm:w-auto"
          >
            <Link href="/shop" className="inline-flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Continuer mes achats
            </Link>
          </Button>
        </div>

        <div className="relative mt-6 h-px w-full" style={{ backgroundImage: GOLD_GRADIENT }} />
      </motion.div>

      {cartQuery.isError ? (
        <div className="text-sm text-destructive">
          {(cartQuery.error as Error).message} (connectez-vous si nécessaire)
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.length === 0 ? (
            <Card className="rounded-[20px] border border-[#d4af37]/18 bg-white/70 shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] backdrop-blur">
              <CardContent className="p-6 text-sm text-slate-600">Panier vide.</CardContent>
            </Card>
          ) : null}

          {items.map((it) => (
            <Card
              key={it.id}
              className="rounded-[20px] border border-[#d4af37]/18 bg-white/70 shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] backdrop-blur"
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.product?.name ?? `Produit #${it.product_id}`}</div>
                  <div className="text-sm text-slate-600">
                    {formatMoneyFCFA(it.product?.price ?? 0)} / unité
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Input
                    className="w-full sm:w-24"
                    type="number"
                    min={0}
                    value={it.qty}
                    onChange={(e) => updateQty.mutate({ product_id: it.product_id, qty: Number(e.target.value) })}
                  />
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-[#d4af37]/25 bg-white/60 text-[#694d08] shadow-[0_10px_20px_-16px_rgba(212,175,55,0.55)] transition-all hover:bg-[#fffaf0] hover:shadow-[0_14px_26px_-16px_rgba(212,175,55,0.7)] sm:w-auto"
                    onClick={() => removeItem.mutate(it.product_id)}
                  >
                    Retirer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit rounded-[20px] border border-[#d4af37]/18 bg-white/70 shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Récap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Sous-total</span>
              <span>{formatMoneyFCFA(subtotal)}</span>
            </div>
            <Button
              className="w-full rounded-full border-none text-[#3f2e05] shadow-[0_16px_32px_-24px_rgba(212,175,55,0.85)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(212,175,55,0.9)]"
              style={{ backgroundImage: GOLD_GRADIENT }}
              disabled={!items.length}
              onClick={() => {
                router.push("/checkout");
              }}
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
