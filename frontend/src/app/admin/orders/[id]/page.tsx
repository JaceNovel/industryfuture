"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminOrderDetail = {
  id: number;
  status: string;
  tag_delivery: string;
  total: number | string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
  user?: { name?: string; email?: string };
  shipping_address?: {
    line1?: string;
    city?: string;
    country?: string;
    phone?: string;
  } | null;
  shippingAddress?: {
    line1?: string;
    city?: string;
    country?: string;
    phone?: string;
  } | null;
  payments?: Array<{ status?: string; amount?: number | string }>;
  items?: Array<{ name: string; sku?: string | null; qty: number }>;
};

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString();
}

function formatMoney(v: unknown) {
  const n = Number(v ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)} FCFA`;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [deliveryStatus, setDeliveryStatus] = useState("pending");

  const orderQuery = useQuery({
    queryKey: ["admin-order", params.id],
    queryFn: () => apiGet<AdminOrderDetail>(`/api/admin/orders/${params.id}`),
    enabled: Boolean(params.id),
  });

  const order = orderQuery.data;

  useEffect(() => {
    const value = order?.metadata?.delivery_status;
    if (typeof value === "string" && value.trim()) {
      setDeliveryStatus(value);
    }
  }, [order]);

  const currentPaymentStatus = useMemo(() => order?.payments?.[0]?.status ?? "pending", [order]);

  const saveDelivery = useMutation({
    mutationFn: () => apiPatch(`/api/admin/orders/${params.id}`, { delivery_status: deliveryStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-order", params.id] });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const markPayment = useMutation({
    mutationFn: (paymentStatus: "completed" | "failed") =>
      apiPatch(`/api/admin/orders/${params.id}`, { payment_status: paymentStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-order", params.id] });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const downloadDeliveryNote = async () => {
    const token = getToken();
    const res = await fetch(`/api/admin/orders/${params.id}/delivery-note`, {
      headers: {
        Accept: "application/pdf",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bon-livraison-${params.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shipping = order?.shippingAddress ?? order?.shipping_address ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold text-destructive sm:text-4xl">Détail commande</h1>
      <p className="text-muted-foreground">Commande #{params.id}</p>

      {orderQuery.isLoading ? <div className="mt-4 text-sm text-muted-foreground">Chargement...</div> : null}
      {orderQuery.isError ? <div className="mt-4 text-sm text-destructive">{(orderQuery.error as Error).message}</div> : null}

      {order ? (
        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
              <div className="space-y-2 text-base sm:text-lg">
                <div><span className="text-muted-foreground">Référence:</span> ORD-{order.id}</div>
                <div><span className="text-muted-foreground">Statut:</span> {order.status}</div>
                <div><span className="text-muted-foreground">Paiement:</span> {currentPaymentStatus}</div>
                <div><span className="text-muted-foreground">Montant:</span> {formatMoney(order.total)}</div>
                <div><span className="text-muted-foreground">Créée:</span> {fmtDate(order.created_at)}</div>
              </div>
              <div className="space-y-2 text-base sm:text-lg">
                <div><span className="text-muted-foreground">Client:</span> {order.user?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {order.user?.email ?? "—"}</div>
                <div><span className="text-muted-foreground">Téléphone:</span> {shipping?.phone ?? "—"}</div>
                <div><span className="text-muted-foreground">Pays:</span> {shipping?.country ?? "—"}</div>
                <div><span className="text-muted-foreground">Ville:</span> {shipping?.city ?? "—"}</div>
                <div><span className="text-muted-foreground">Adresse:</span> {shipping?.line1 ?? "—"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg">
                <span>Statut actuel: {currentPaymentStatus}</span>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markPayment.mutate("completed")}>Marquer payé</Button>
                <Button variant="destructive" onClick={() => markPayment.mutate("failed")}>Marquer échec</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm sm:h-12 sm:px-4 sm:text-base"
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                >
                  <option value="pending">pending</option>
                  <option value="ready_for_pickup">ready_for_pickup</option>
                  <option value="out_for_delivery">out_for_delivery</option>
                  <option value="delivered">delivered</option>
                  <option value="canceled">canceled</option>
                </select>
                <Button onClick={() => saveDelivery.mutate()}>Sauvegarder</Button>
                <Button variant="outline" onClick={downloadDeliveryNote}>Générer bon de livraison</Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/orders">Retour</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Articles physiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                  <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-muted-foreground">
                    <div>PRODUIT</div>
                    <div>SKU</div>
                    <div>QUANTITÉ</div>
                    <div>TYPE</div>
                    <div>ETA</div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(order.items ?? []).map((item, idx) => (
                      <div key={`${item.sku ?? item.name}-${idx}`} className="grid grid-cols-5 gap-4 text-sm sm:text-base">
                        <div>{item.name}</div>
                        <div>{item.sku ?? "—"}</div>
                        <div>{item.qty}</div>
                        <div>{order.tag_delivery === "SUR_COMMANDE" ? "preorder" : "ready"}</div>
                        <div>{order.tag_delivery === "SUR_COMMANDE" ? 10 : 3}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
