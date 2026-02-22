"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useState } from "react";

type OrdersResponse = {
  data: Order[];
};

const PLACEHOLDER_IMG = "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png";

function formatMoneyFCFA(v: unknown) {
  const n = Number(v ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} FCFA`;
}

function formatDateFR(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function statusLabel(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "pending") return "En attente";
  if (s === "preparing" || s === "preparation" || s === "processing") return "En préparation";
  if (s === "shipped" || s === "expedie" || s === "expédiée" || s === "expediee" || s === "expédiées") return "Expédiées";
  if (s === "delivered" || s === "livree" || s === "livrée" || s === "livrées") return "Livrées";
  return status;
}

function statusKey(status: string): "pending" | "preparing" | "shipped" | "delivered" | "other" {
  const s = (status ?? "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "preparing" || s === "preparation" || s === "processing") return "preparing";
  if (s === "shipped" || s.includes("exped")) return "shipped";
  if (s === "delivered" || s.includes("livr")) return "delivered";
  return "other";
}

function trackingNumber(order: Order) {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  return (meta.tracking_number ?? meta.trackingNumber ?? meta.tracking ?? null) as string | null;
}

export default function OrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<OrdersResponse>("/api/orders"),
  });

  const [tab, setTab] = useState<"all" | "pending" | "preparing" | "shipped" | "delivered">("all");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mes commandes</h1>

      <div className="mt-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-background">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="preparing">En préparation</TabsTrigger>
              <TabsTrigger value="shipped">Expédiées</TabsTrigger>
              <TabsTrigger value="delivered">Livrées</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <Separator className="my-6" />

      {ordersQuery.isError ? (
        <div className="text-sm text-destructive">{(ordersQuery.error as Error).message} (connectez-vous si nécessaire)</div>
      ) : null}

      <div className="space-y-4">
        {(ordersQuery.data?.data ?? [])
          .filter((o) => {
            if (tab === "all") return true;
            return statusKey(o.status) === tab;
          })
          .map((o) => {
            const item = o.items?.[0];
            const img = item?.product?.images?.[0]?.url;
            const tracking = trackingNumber(o);

            return (
              <Card key={o.id} className="overflow-hidden bg-background">
                <CardHeader className="flex flex-col gap-3 bg-muted/10 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Commande #{o.id}</CardTitle>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {o.created_at ? `Passée le ${formatDateFR(o.created_at)}` : null}
                    </div>
                  </div>

                  <Badge variant="secondary" className="gap-2 bg-muted/40 text-foreground">
                    <Clock className="h-4 w-4" />
                    {statusLabel(o.status)}
                  </Badge>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[80px_1fr]">
                    <div className="h-20 w-20 overflow-hidden rounded-md bg-muted/30">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={item?.name ?? "Produit"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="relative h-full w-full p-3">
                          <Image
                            src={PLACEHOLDER_IMG}
                            alt={item?.name ?? "Produit"}
                            fill
                            sizes="80px"
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-base font-semibold sm:text-lg">{item?.name ?? `Commande #${o.id}`}</div>
                      <div className="text-sm text-muted-foreground">Quantité: {item?.qty ?? 1}</div>
                      <div className="text-base font-semibold sm:text-lg">{formatMoneyFCFA(item?.price ?? o.total)}</div>
                      {o.items && o.items.length > 1 ? (
                        <div className="text-sm text-muted-foreground">+ {o.items.length - 1} autre(s) article(s)</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t bg-background px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-semibold">Total: {formatMoneyFCFA(o.total)}</div>
                        <div className="text-sm text-muted-foreground">Numéro de suivi: {tracking ?? "—"}</div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                        <Button variant="outline" disabled={!tracking} className="w-full sm:w-auto">
                          Suivre
                        </Button>
                        <Button asChild variant="destructive" className="w-full sm:w-auto">
                          <Link href={`/account/orders/${o.id}`}>Détails</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {ordersQuery.isSuccess && (ordersQuery.data?.data?.length ?? 0) === 0 ? (
          <Card className="bg-background">
            <CardContent className="p-6 text-sm text-muted-foreground">Aucune commande.</CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
