"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Check, ShoppingCart, Truck } from "lucide-react";

const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

type CheckoutResponse = {
  order: Order;
  payment_url?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("FR");
  const [phone, setPhone] = useState("");

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<CheckoutResponse>("/api/checkout", {
        shipping_address: {
          full_name: fullName,
          line1,
          line2: line2 || null,
          city,
          postal_code: postalCode,
          country,
          phone: phone || null,
        },
      }),
    onSuccess: (res) => {
      const paymentUrl = (res.payment_url ?? "").trim();
      if (paymentUrl) {
        window.location.assign(paymentUrl);
        return;
      }
      router.push(`/account/orders/${res.order.id}`);
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
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

        <div className="relative">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950 md:text-4xl">Checkout</h1>
          <p className="mt-1 text-sm text-slate-600">Adresse de livraison + validation de commande.</p>

          <div className="mt-6 grid gap-3 rounded-[20px] border border-[#d4af37]/18 bg-white/55 p-4 shadow-[0_18px_40px_-34px_rgba(212,175,55,0.45)] backdrop-blur sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#faf8f4] text-[#694d08]">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">ETAPE 1</div>
                <div className="text-sm font-medium text-slate-900">Panier</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/25 bg-white text-[#694d08] shadow-[0_10px_20px_-16px_rgba(212,175,55,0.6)]">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">ETAPE 2</div>
                <div className="text-sm font-medium text-slate-900">Livraison</div>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-80">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/18 bg-white/60 text-slate-500">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">ETAPE 3</div>
                <div className="text-sm font-medium text-slate-900">Confirmation</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 h-px w-full" style={{ backgroundImage: GOLD_GRADIENT }} />

      <Card className="mt-6 rounded-[20px] border border-[#d4af37]/18 bg-white/70 shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nom complet</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
            />
          </div>
          <div className="grid gap-2">
            <Label>Adresse</Label>
            <Input
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
            />
          </div>
          <div className="grid gap-2">
            <Label>Complément</Label>
            <Input
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Ville</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
              />
            </div>
            <div className="grid gap-2">
              <Label>Code postal</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Pays</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
              />
            </div>
            <div className="grid gap-2">
              <Label>Téléphone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
              />
            </div>
          </div>

          {checkout.isError ? (
            <div className="text-sm text-destructive">{(checkout.error as Error).message}</div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full rounded-full border-none text-[#3f2e05] shadow-[0_16px_32px_-24px_rgba(212,175,55,0.85)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(212,175,55,0.9)] sm:w-auto"
              style={{ backgroundImage: GOLD_GRADIENT }}
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending || !fullName || !line1 || !city || !postalCode}
            >
              Confirmer
            </Button>
            <Button
              className="w-full rounded-full border border-[#d4af37]/25 bg-[#faf8f4] text-[#694d08] shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-18px_rgba(212,175,55,0.75)] sm:w-auto"
              variant="secondary"
              onClick={() => router.push("/cart")}
            >
              Retour panier
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
