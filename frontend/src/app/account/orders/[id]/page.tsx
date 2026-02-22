"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatMoneyFCFA(v: unknown) {
  const n = Number(v ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} FCFA`;
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiGet<Order>(`/api/orders/${id}`),
    enabled: Boolean(id),
  });

  const order = orderQuery.data;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Commande #{id}</h1>
          {order ? <Badge variant="secondary" className="mt-2">{order.status}</Badge> : null}
        </div>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href="/account/orders">Retour</Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {orderQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : null}
      {orderQuery.isError ? (
        <div className="text-sm text-destructive">{(orderQuery.error as Error).message}</div>
      ) : null}

      {order ? (
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-base">Articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(order.items ?? []).map((it) => (
              <div key={it.id} className="flex flex-col gap-2 rounded-lg border bg-background px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-muted-foreground">Quantité: {it.qty}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium">{formatMoneyFCFA(it.price)}</div>
                  <div className="text-sm text-muted-foreground">Total: {formatMoneyFCFA(it.total)}</div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex items-baseline justify-between">
              <div className="text-sm text-muted-foreground">Sous-total</div>
              <div className="font-medium">{formatMoneyFCFA(order.subtotal)}</div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{formatMoneyFCFA(order.total)}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
