"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Cart } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function lineTotal(price: unknown, qty: number) {
  return Number(price ?? 0) * qty;
}

export default function CartPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiGet<Cart>("/api/cart"),
  });

  const updateQty = useMutation({
    mutationFn: ({ product_id, qty }: { product_id: number; qty: number }) => apiPatch<Cart>("/api/cart", { product_id, qty }),
    onSuccess: (data) => qc.setQueryData(["cart"], data),
  });

  const removeItem = useMutation({
    mutationFn: (product_id: number) => apiDelete<Cart>("/api/cart", { product_id }),
    onSuccess: (data) => qc.setQueryData(["cart"], data),
  });

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const subtotal = items.reduce((acc, it) => acc + lineTotal(it.product?.price, it.qty), 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panier</h1>
          <p className="text-sm text-muted-foreground">Gérer quantités, puis checkout.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/shop">Shop</Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {cartQuery.isError ? (
        <div className="text-sm text-destructive">
          {(cartQuery.error as Error).message} (connectez-vous si nécessaire)
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.length === 0 ? (
            <Card className="bg-card/40 backdrop-blur">
              <CardContent className="p-6 text-sm text-muted-foreground">Panier vide.</CardContent>
            </Card>
          ) : null}

          {items.map((it) => (
            <Card key={it.id} className="bg-card/40 backdrop-blur">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.product?.name ?? `Produit #${it.product_id}`}</div>
                  <div className="text-sm text-muted-foreground">
                    {Number(it.product?.price ?? 0).toFixed(2)} € / unité
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    value={it.qty}
                    onChange={(e) => updateQty.mutate({ product_id: it.product_id, qty: Number(e.target.value) })}
                  />
                  <Button variant="secondary" onClick={() => removeItem.mutate(it.product_id)}>
                    Retirer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit bg-card/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Récap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <Button
              className="w-full"
              disabled={!items.length}
              onClick={() => {
                router.push("/checkout");
              }}
            >
              Aller au checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
