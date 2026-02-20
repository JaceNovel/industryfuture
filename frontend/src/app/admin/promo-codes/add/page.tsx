"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminPromoCodeAddPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "shipping">("percent");
  const [amount, setAmount] = useState("0");
  const [minAmount, setMinAmount] = useState("0");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("0");
  const [active, setActive] = useState(true);
  const [uniquePerUser, setUniquePerUser] = useState(false);

  const createCoupon = useMutation({
    mutationFn: () =>
      apiPost("/api/admin/coupons", {
        name: code.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        type,
        amount: Number(amount || 0),
        min_amount: Number(minAmount || 0),
        max_discount: null,
        applies_to: "all_products",
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        usage_limit: Number(usageLimit || 0) > 0 ? Number(usageLimit) : null,
        active,
        unique_per_user: uniquePerUser,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      router.push("/admin/promo-codes");
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-4xl">Créer un nouveau code promo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: SUMMER25" />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: 25% de réduction pour l'été" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type de réduction</Label>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed" | "shipping") }>
                <option value="percent">Pourcentage</option>
                <option value="fixed">Montant fixe</option>
                <option value="shipping">Livraison</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Valeur</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Montant d'achat minimum (€)</Label>
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} inputMode="decimal" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date de début</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date de fin</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Nombre maximum d'utilisations (0 = illimité)</Label>
            <Input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} inputMode="numeric" />
          </div>

          <label className="flex items-center justify-between rounded-md border px-3 py-2">
            <span>Actif</span>
            <input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between rounded-md border px-3 py-2">
            <span>Usage unique par client</span>
            <input type="checkbox" className="h-5 w-5" checked={uniquePerUser} onChange={(e) => setUniquePerUser(e.target.checked)} />
          </label>

          {createCoupon.isError ? <div className="text-sm text-destructive">{(createCoupon.error as Error).message}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild><Link href="/admin/promo-codes">Annuler</Link></Button>
            <Button onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending || !code.trim()}>Créer</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
