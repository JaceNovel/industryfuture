"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const productQuery = useQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => apiGet<Product>(`/api/admin/products/${productId}`),
    enabled: Boolean(productId),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/api/categories"),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [priceAir, setPriceAir] = useState("");
  const [priceSea, setPriceSea] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [brand, setBrand] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesQuery.data ?? []).forEach((c) => map.set(c.slug, c.name));
    return map;
  }, [categoriesQuery.data]);

  useEffect(() => {
    const p = productQuery.data;
    if (!p) return;
    setName(p.name ?? "");
    setDescription(p.description ?? "");
    setPrice(String(Number(p.price ?? 0)));
    setCategorySlug(p.categories?.[0]?.slug ?? "");

    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    const t = (meta.transport_prices ?? {}) as Record<string, unknown>;
    setPriceAir(t.air != null ? String(t.air) : "");
    setPriceSea(t.sea != null ? String(t.sea) : "");

    setBrand(typeof meta.brand === "string" ? meta.brand : "");
    if (Array.isArray(meta.tags)) {
      setTags(meta.tags.map((x) => String(x)).join(", "));
    } else if (typeof meta.tags === "string") {
      setTags(meta.tags);
    } else {
      setTags("");
    }
  }, [productQuery.data]);

  const updateProduct = useMutation({
    mutationFn: async () => {
      const existing = ((productQuery.data?.metadata ?? {}) as Record<string, unknown>) || {};
      const metadata: Record<string, unknown> = { ...existing };

      if (brand.trim()) metadata.brand = brand.trim();
      else delete metadata.brand;

      if (tags.trim()) metadata.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      else delete metadata.tags;

      const air = priceAir.trim() ? Number(priceAir) : null;
      const sea = priceSea.trim() ? Number(priceSea) : null;
      if (air != null || sea != null) {
        metadata.transport_prices = {
          air: air,
          sea: sea,
        };
      } else {
        delete metadata.transport_prices;
      }

      await apiPatch(`/api/admin/products/${productId}`, {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price || 0),
        categories: categorySlug ? [categoryNameBySlug.get(categorySlug) ?? categorySlug] : [],
        metadata,
      });

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("alt", name.trim());
        formData.append("sort_order", "0");
        await apiPost(`/api/admin/products/${productId}/images`, formData);
      }
    },
    onSuccess: () => {
      router.push("/admin/products");
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Modifier le produit</h1>

      {productQuery.isLoading ? <div className="mt-4 text-sm text-muted-foreground">Chargement...</div> : null}
      {productQuery.isError ? <div className="mt-4 text-sm text-destructive">{(productQuery.error as Error).message}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom du produit *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-44 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image du produit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Remplacer par une image locale</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            {imageFile ? <p className="text-xs text-foreground/80">Fichier: {imageFile.name}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Prix de base *</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Prix avion</Label>
                <Input value={priceAir} onChange={(e) => setPriceAir(e.target.value)} inputMode="decimal" />
              </div>
              <div className="grid gap-2">
                <Label>Prix bateau</Label>
                <Input value={priceSea} onChange={(e) => setPriceSea(e.target.value)} inputMode="decimal" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attribut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                <option value="">Sélectionner une catégorie</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>

            <div className="grid gap-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {updateProduct.isError ? (
        <div className="mt-4 text-sm text-destructive">{(updateProduct.error as Error).message}</div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/products">Annuler</Link>
        </Button>
        <Button onClick={() => updateProduct.mutate()} disabled={!name.trim() || updateProduct.isPending}>
          Enregistrer
        </Button>
      </div>
    </main>
  );
}
