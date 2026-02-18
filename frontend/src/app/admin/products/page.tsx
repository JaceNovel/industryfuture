"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProductsResponse = { data: Product[] };

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [isPromo, setIsPromo] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiGet<ProductsResponse>("/api/admin/products"),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      apiPost<Product>("/api/admin/products", {
        name,
        price: Number(price),
        status: "active",
        is_promo: isPromo,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      setOpen(false);
      setName("");
      setPrice("0");
      setIsPromo(false);
    },
  });

  const updatePromo = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      apiPatch<Product>(`/api/admin/products/${id}`, { is_promo: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground">CRUD minimal (création + listing).</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Créer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau produit</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Prix</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                <span>Mettre en promotion</span>
                <input
                  type="checkbox"
                  checked={isPromo}
                  onChange={(e) => setIsPromo(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              {createProduct.isError ? (
                <div className="text-sm text-destructive">{(createProduct.error as Error).message}</div>
              ) : null}
              <Button onClick={() => createProduct.mutate()} disabled={createProduct.isPending || !name}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent>
          {productsQuery.isError ? (
            <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(productsQuery.data?.data ?? []).map((p) => (
                <TableRow key={p.id ?? p.slug}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>{Number(p.price ?? 0).toFixed(2)} €</TableCell>
                  <TableCell>
                    {typeof p.id === "number" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(p.is_promo)}
                        onChange={(e) => updatePromo.mutate({ id: p.id as number, value: e.target.checked })}
                        disabled={updatePromo.isPending}
                        className="h-4 w-4"
                        aria-label="En promotion"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
