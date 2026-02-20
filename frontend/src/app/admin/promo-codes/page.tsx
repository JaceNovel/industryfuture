"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Coupon = {
  id: number;
  code: string;
  type: "percent" | "fixed" | "shipping";
  amount: number | string;
  min_amount?: number | string | null;
  usage_limit?: number | null;
  used_count?: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

type CouponsResponse = { data: Coupon[] };

function formatAmount(c: Coupon) {
  const n = Number(c.amount ?? 0);
  if (c.type === "shipping") return "Gratuite";
  return c.type === "percent" ? `${n}%` : `${n}€`;
}

function formatType(type: Coupon["type"]) {
  if (type === "percent") return "Pourcentage";
  if (type === "shipping") return "Livraison";
  return "Montant fixe";
}

function formatRange(start?: string | null, end?: string | null) {
  const f = (v?: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  };
  return `${f(start)} - ${f(end)}`;
}

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const couponsQuery = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: () => apiGet<CouponsResponse>("/api/admin/coupons"),
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/coupons/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
  });

  const coupons = useMemo(() => couponsQuery.data?.data ?? [], [couponsQuery.data]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-2xl font-semibold tracking-tight">Gestion des Codes Promo</h1>
        <Button asChild>
          <Link href="/admin/promo-codes/add" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Créer un code promo
          </Link>
        </Button>
      </div>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Codes promo actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {couponsQuery.isError ? <div className="text-sm text-destructive">{(couponsQuery.error as Error).message}</div> : null}

          <div className="overflow-x-auto">
          <div className="grid min-w-[920px] grid-cols-8 gap-4 border-b pb-3 text-sm font-medium text-muted-foreground">
            <div>Code</div>
            <div>Type</div>
            <div>Valeur</div>
            <div>Achat min.</div>
            <div>Utilisations</div>
            <div>Validité</div>
            <div>Statut</div>
            <div className="text-right">Actions</div>
          </div>

          {coupons.map((c) => (
            <div key={c.id} className="grid min-w-[920px] grid-cols-8 gap-4 border-b py-4 last:border-b-0">
              <div className="font-medium">{c.code}</div>
              <div>{formatType(c.type)}</div>
              <div>{formatAmount(c)}</div>
              <div>{c.min_amount != null ? `${Number(c.min_amount)}€` : "-"}</div>
              <div>{c.used_count ?? 0} / {c.usage_limit ?? "∞"}</div>
              <div>{formatRange(c.starts_at, c.ends_at)}</div>
              <div>
                <Badge className={c.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-muted text-muted-foreground"}>
                  {c.active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/admin/promo-codes/${c.id}/edit`} aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="destructive" size="icon" onClick={() => deleteCoupon.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
