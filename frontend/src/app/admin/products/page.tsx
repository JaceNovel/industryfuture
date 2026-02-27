"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

type ProductsResponse = { data: Product[] };

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiGet<ProductsResponse>("/api/admin/products"),
  });

  function formatMoneyFCFA(v: unknown) {
    const n = Number(v ?? 0);
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)} F CFA`;
  }

  const updatePromo = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      apiPatch<Product>(`/api/admin/products/${id}`, { is_promo: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => apiDelete<{ message?: string }>(`/api/admin/products/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const products = productsQuery.data?.data ?? [];
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const categoryName = p.categories?.[0]?.name?.toLowerCase() ?? "";
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        categoryName.includes(q)
      );
    });
  }, [products, search]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground">Liste complète des produits.</p>
        </div>

        <Button asChild>
          <Link href="/admin/products/add" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Link>
        </Button>
      </div>

      <Card className="mt-4 bg-card/40 backdrop-blur">
        <CardContent className="pt-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Rechercher des produits..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent>
          {productsQuery.isError ? (
            <div className="text-sm text-destructive">{(productsQuery.error as Error).message}</div>
          ) : null}
          {deleteProduct.isError ? (
            <div className="mb-3 text-sm text-destructive">{(deleteProduct.error as Error).message}</div>
          ) : null}
          <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id ?? p.slug}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.categories?.[0]?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>{formatMoneyFCFA(p.price ?? 0)}</TableCell>
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
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {typeof p.id === "number" ? (
                        <>
                          <Button variant="outline" size="sm" asChild className="gap-2">
                            <Link href={`/admin/products/${p.id}/edit`} aria-label="Modifier">
                              <Pencil className="h-4 w-4" /> Modifier
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            aria-label="Supprimer"
                            disabled={deleteProduct.isPending}
                            onClick={() => {
                              if (!p.id) return;
                              const ok = window.confirm(`Supprimer le produit "${p.name}" ?`);
                              if (!ok) return;
                              deleteProduct.mutate(p.id as number);
                            }}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" /> Supprimer
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
