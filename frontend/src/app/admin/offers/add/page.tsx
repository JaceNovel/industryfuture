"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type ProductsResponse = { data: Product[] };

export default function AdminOffersAddPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [productIdToAdd, setProductIdToAdd] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/api/categories"),
  });

  const productsQuery = useQuery({
    queryKey: ["admin-products-select"],
    queryFn: () => apiGet<ProductsResponse>("/api/admin/products"),
  });

  const products = productsQuery.data?.data ?? [];

  const selectedProducts = useMemo(
    () => products.filter((p) => typeof p.id === "number" && selectedProductIds.includes(p.id)),
    [products, selectedProductIds]
  );

  const createOffer = useMutation({
    mutationFn: () =>
      apiPost("/api/admin/grouped-offers", {
        title: title.trim(),
        discount_percent: Number(discount || 0),
        category_id: categoryId ? Number(categoryId) : null,
        product_ids: selectedProductIds,
        active: true,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-grouped-offers"] });
      router.push("/admin/offers");
    },
  });

  const addProduct = () => {
    const id = Number(productIdToAdd);
    if (!id || selectedProductIds.includes(id)) return;
    setSelectedProductIds((prev) => [...prev, id]);
    setProductIdToAdd("");
  };

  const removeProduct = (id: number) => {
    setSelectedProductIds((prev) => prev.filter((x) => x !== id));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Ajouter une offre groupée</h1>
      <p className="text-muted-foreground">Créez une nouvelle offre groupée en sélectionnant les produits et en définissant la réduction.</p>

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-2">
            <Label>Titre de l'offre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pack Beauté Premium" />
          </div>

          <div className="grid gap-2">
            <Label>Réduction</Label>
            <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="25" inputMode="numeric" />
          </div>

          <div className="grid gap-2">
            <Label>Catégorie</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sélectionner une catégorie</option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id ?? c.slug} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t" />

          <div className="grid gap-2">
            <Label>Ajouter des produits</Label>
            <div className="flex gap-2">
              <select
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                value={productIdToAdd}
                onChange={(e) => setProductIdToAdd(e.target.value)}
              >
                <option value="">Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id ?? p.slug} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={addProduct} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Produits sélectionnés</Label>
            {selectedProducts.length === 0 ? (
              <div className="text-muted-foreground">Aucun produit sélectionné</div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((p) => (
                  <div key={p.id ?? p.slug} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>{p.name}</span>
                    <Button variant="destructive" size="sm" onClick={() => removeProduct(p.id as number)}>
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {createOffer.isError ? <div className="text-sm text-destructive">{(createOffer.error as Error).message}</div> : null}

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/offers">Annuler</Link>
            </Button>
            <Button onClick={() => createOffer.mutate()} disabled={!title.trim() || createOffer.isPending} className="gap-2">
              <Plus className="h-4 w-4" /> Créer l'offre groupée
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
