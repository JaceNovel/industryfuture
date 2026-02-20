"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Search, Trash2, Download } from "lucide-react";

type Promotion = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  type: "percent" | "fixed";
  amount: number | string;
  usage_limit?: number | null;
  used_count?: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

type PromotionsResponse = { data: Promotion[] };

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function formatAmount(type: Promotion["type"], amount: unknown) {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "0";
  return type === "percent" ? `${n}%` : `${n}€`;
}

export default function AdminPromotionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const promotionsQuery = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: () => apiGet<PromotionsResponse>("/api/admin/coupons"),
  });

  const deletePromotion = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/coupons/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
  });

  const promotions = promotionsQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) => {
      const text = `${p.name ?? ""} ${p.code ?? ""} ${p.description ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [promotions, search]);

  const exportCsv = () => {
    const headers = ["Nom", "Code", "Type", "Valeur", "Utilisation", "Statut", "Début", "Fin"];
    const lines = filtered.map((p) => [
      p.name ?? "",
      p.code,
      p.type,
      String(p.amount ?? "0"),
      `${p.used_count ?? 0}/${p.usage_limit ?? "illimité"}`,
      p.active ? "active" : "inactive",
      formatDate(p.starts_at),
      formatDate(p.ends_at),
    ]);

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "promotions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Exporter
          </Button>
          <Button asChild>
            <Link href="/admin/promotions/add" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Ajouter une promotion
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mt-4 bg-card/40 backdrop-blur">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Rechercher des promotions..."
            />
          </div>
        </CardContent>
      </Card>

      {promotionsQuery.isError ? (
        <div className="mt-4 text-sm text-destructive">{(promotionsQuery.error as Error).message}</div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card/40">
        <div className="grid min-w-[920px] grid-cols-8 gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          <div className="col-span-3">NOM</div>
          <div>CODE</div>
          <div>TYPE</div>
          <div>VALEUR</div>
          <div>UTILISATION</div>
          <div className="text-right">ACTIONS</div>
        </div>

        {filtered.map((p) => (
          <div key={p.id} className="grid min-w-[920px] grid-cols-8 gap-4 border-b px-4 py-4 text-sm last:border-b-0">
            <div className="col-span-3">
              <div className="font-semibold text-foreground">{p.name || p.code}</div>
              {p.description ? <div className="mt-1 text-muted-foreground line-clamp-4">{p.description}</div> : null}
              <div className="mt-2 text-muted-foreground">Période: {formatDate(p.starts_at)} → {formatDate(p.ends_at)}</div>
            </div>
            <div>
              <Badge variant="secondary">{p.code}</Badge>
            </div>
            <div>{p.type === "fixed" ? "Montant fixe" : "Pourcentage"}</div>
            <div>{formatAmount(p.type, p.amount)}</div>
            <div>{p.used_count ?? 0}/{p.usage_limit ?? "∞"}</div>
            <div className="flex items-start justify-end gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/promotions/${p.id}/edit`} aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supprimer"
                disabled={deletePromotion.isPending}
                onClick={() => deletePromotion.mutate(p.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="col-span-8 pt-1">
              <Badge className={p.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-muted text-muted-foreground"}>
                {p.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
