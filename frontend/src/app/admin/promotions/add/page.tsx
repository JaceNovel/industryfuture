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

type PromotionPayload = {
  name: string;
  code: string;
  description?: string;
  type: "percent" | "fixed";
  amount: number;
  min_amount?: number;
  max_discount?: number;
  applies_to: "all_products" | "category" | "product";
  starts_at?: string;
  ends_at?: string;
  usage_limit?: number;
  active: boolean;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminPromotionAddPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(todayInput());
  const [endsAt, setEndsAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState("0");
  const [minAmount, setMinAmount] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [appliesTo, setAppliesTo] = useState<"all_products" | "category" | "product">("all_products");

  const createPromotion = useMutation({
    mutationFn: async () => {
      const payload: PromotionPayload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        type,
        amount: Number(amount || 0),
        min_amount: Number(minAmount || 0),
        max_discount: Number(maxDiscount || 0),
        applies_to: appliesTo,
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        usage_limit: usageLimit.trim() ? Number(usageLimit) : undefined,
        active: true,
      };

      return apiPost("/api/admin/coupons", payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      router.push("/admin/promotions");
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Ajouter une promotion</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom de la promotion *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Code promo *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description *</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Écrivez votre contenu..."
                className="min-h-52 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Période et limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Date de début</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date de fin</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Limite d'utilisation</Label>
              <Input
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                inputMode="numeric"
                placeholder="Illimité"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type de promotion</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">Pourcentage</option>
                <option value="fixed">Montant fixe</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Valeur</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Montant minimum d'achat</Label>
              <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div className="grid gap-2">
              <Label>Réduction maximale</Label>
              <Input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Applicable à</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as "all_products" | "category" | "product")}
            >
              <option value="all_products">Tous les produits</option>
              <option value="category">Une catégorie</option>
              <option value="product">Un produit</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {createPromotion.isError ? (
        <div className="mt-4 text-sm text-destructive">{(createPromotion.error as Error).message}</div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/promotions">Annuler</Link>
        </Button>
        <Button onClick={() => createPromotion.mutate()} disabled={createPromotion.isPending || !name.trim() || !code.trim()}>
          Créer la promotion
        </Button>
      </div>
    </main>
  );
}
