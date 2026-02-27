"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Order, Product } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";

type OrdersResponse = { data: Array<Order & { user?: { email: string } }> };
type ProductsResponse = { data: Product[] };

function formatMoneyFCFA(v: unknown) {
  const n = Number(v ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const rounded = Math.round(safe);
  return `${rounded.toLocaleString("fr-FR")} F CFA`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
}

function monthLabelFR(m: number) {
  return ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][m] ?? "";
}

function RevenueLineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 640;
  const height = 220;
  const padding = 28;

  const max = Math.max(1, ...values);
  const min = 0;
  const scaleX = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, values.length - 1);
  const scaleY = (v: number) => {
    const t = (v - min) / (max - min);
    return height - padding - t * (height - padding * 2);
  };

  const d = values
    .map((v, i) => {
      const x = scaleX(i);
      const y = scaleY(v);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        <path d={d} fill="none" stroke="rgb(37 99 235)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
        {labels.map((l) => (
          <div key={l} className="w-full text-center">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminHome() {
  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiGet<OrdersResponse>("/api/admin/orders"),
  });

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiGet<ProductsResponse>("/api/admin/products"),
  });

  const orders = ordersQuery.data?.data ?? [];
  const products = productsQuery.data?.data ?? [];

  const revenueTotal = 0;
  const ordersTotal = orders.length;
  const productsTotal = products.length;
  const clientsTotal = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      if (o.user?.email) s.add(o.user.email);
    }
    return s.size;
  }, [orders]);

  const recentOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    return sorted.slice(0, 5);
  }, [orders]);

  const revenueSeries = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthLabelFR(d.getMonth()));
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const totals = new Map<string, number>(keys.map((k) => [k, 0]));
    for (const o of orders) {
      if (!o.created_at) continue;
      const dt = new Date(o.created_at);
      if (Number.isNaN(dt.getTime())) continue;
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!totals.has(k)) continue;
      totals.set(k, (totals.get(k) ?? 0) + Number(o.total ?? 0));
    }
    return { labels, values: keys.map((k) => Math.round(totals.get(k) ?? 0)) };
  }, [orders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-destructive sm:text-4xl">Tableau de bord administratif</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bienvenue ! Voici votre aperçu.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Revenu Total</div>
              <div className="text-2xl font-semibold sm:text-3xl">{formatMoneyFCFA(revenueTotal)}</div>
              <div className="text-sm text-green-600">↑ 0.0%</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-3/15">
              <DollarSign className="h-6 w-6 text-chart-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total des Commandes</div>
              <div className="text-2xl font-semibold sm:text-3xl">{ordersTotal}</div>
              <div className="text-sm text-green-600">↑ 0.0%</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/15">
              <ShoppingCart className="h-6 w-6 text-chart-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total des Produits</div>
              <div className="text-2xl font-semibold sm:text-3xl">{productsTotal}</div>
              <div className="text-sm text-green-600">↑ 0.0%</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/15">
              <Package className="h-6 w-6 text-chart-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total des Clients</div>
              <div className="text-2xl font-semibold sm:text-3xl">{clientsTotal}</div>
              <div className="text-sm text-green-600">↑ 0.0%</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-5/15">
              <Users className="h-6 w-6 text-chart-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-base">Aperçu des Revenus</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersQuery.isError ? (
              <div className="text-sm text-destructive">{(ordersQuery.error as Error).message}</div>
            ) : null}
            <RevenueLineChart values={revenueSeries.values} labels={revenueSeries.labels} />
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-base">Commandes Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ID de commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => {
                  const first = o.items?.[0]?.name ?? "—";
                  const extra = (o.items?.length ?? 0) > 1 ? ` +${(o.items?.length ?? 0) - 1}` : "";
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{String(o.id)}</TableCell>
                      <TableCell className="text-muted-foreground">{o.user?.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{first}{extra}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoneyFCFA(o.total)}</TableCell>
                    </TableRow>
                  );
                })}
                {!ordersQuery.isLoading && !recentOrders.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Aucune commande.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
