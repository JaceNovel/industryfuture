"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Promotion = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  type: "percent" | "fixed";
  amount: number | string;
  min_amount?: number | string | null;
  max_discount?: number | string | null;
  applies_to?: "all_products" | "category" | "product";
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
};

function toDateInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AdminPromotionEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const promotionId = params.id;

  const promoQuery = useQuery({
    queryKey: ["admin-promotion", promotionId],
    queryFn: () => apiGet<Promotion>(`/api/admin/coupons/${promotionId}`),
    enabled: Boolean(promotionId),
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState("0");
  const [minAmount, setMinAmount] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [appliesTo, setAppliesTo] = useState<"all_products" | "category" | "product">("all_products");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  useEffect(() => {
    const p = promoQuery.data;
    if (!p) return;
    setName(p.name ?? "");
    setCode(p.code ?? "");
    setDescription(p.description ?? "");
    setType(p.type ?? "percent");
    setAmount(String(Number(p.amount ?? 0)));
    setMinAmount(String(Number(p.min_amount ?? 0)));
    setMaxDiscount(String(Number(p.max_discount ?? 0)));
    setAppliesTo((p.applies_to ?? "all_products") as "all_products" | "category" | "product");
    setStartsAt(toDateInput(p.starts_at));
    setEndsAt(toDateInput(p.ends_at));
    setUsageLimit(p.usage_limit != null ? String(p.usage_limit) : "");
  }, [promoQuery.data]);

  const updatePromotion = useMutation({
    mutationFn: () =>
      apiPatch(`/api/admin/coupons/${promotionId}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        type,
        amount: Number(amount || 0),
        min_amount: Number(minAmount || 0),
        max_discount: Number(maxDiscount || 0),
        applies_to: appliesTo,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        usage_limit: usageLimit.trim() ? Number(usageLimit) : null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      router.push("/admin/promotions");
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Modifier la promotion</h1>

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
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              <Input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} inputMode="numeric" />
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

      {updatePromotion.isError ? (
        <div className="mt-4 text-sm text-destructive">{(updatePromotion.error as Error).message}</div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/promotions">Annuler</Link>
        </Button>
        <Button onClick={() => updatePromotion.mutate()} disabled={updatePromotion.isPending || !name.trim() || !code.trim()}>
          Enregistrer
        </Button>
      </div>
    </main>
  );
}
