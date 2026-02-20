"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateProductPayload = {
  name: string;
  description?: string;
  price: number;
  status: "active" | "draft";
  is_promo: boolean;
  categories?: string[];
  metadata?: Record<string, unknown>;
};

export default function AdminProductsAddPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [priceAir, setPriceAir] = useState("");
  const [priceSea, setPriceSea] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [brand, setBrand] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/api/categories"),
  });

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesQuery.data ?? []).forEach((c) => {
      map.set(c.slug, c.name);
    });
    return map;
  }, [categoriesQuery.data]);

  const createProduct = useMutation({
    mutationFn: async () => {
      const parsedPrice = Number(price || 0);
      const parsedAir = priceAir.trim() ? Number(priceAir) : null;
      const parsedSea = priceSea.trim() ? Number(priceSea) : null;

      const metadata: Record<string, unknown> = {};
      if (brand.trim()) metadata.brand = brand.trim();
      if (tags.trim()) metadata.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (parsedAir !== null || parsedSea !== null) {
        metadata.transport_prices = {
          air: parsedAir,
          sea: parsedSea,
        };
      }

      const payload: CreateProductPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        status: "active",
        is_promo: false,
        categories: categorySlug ? [categoryNameBySlug.get(categorySlug) ?? categorySlug] : undefined,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      };

      const created = await apiPost<Product>("/api/admin/products", payload);

      if (imageFile && typeof created.id === "number") {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("alt", name.trim());
        formData.append("sort_order", "0");
        await apiPost(`/api/admin/products/${created.id}/images`, formData);
      }

      return created;
    },
    onSuccess: () => {
      router.push("/admin/products");
    },
  });

  const canCreate = name.trim().length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Créer un produit</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom du produit *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Entrez le nom du produit" />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre produit..."
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
            <Label>Choisir une image locale</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Formats acceptés: JPG, JPEG, PNG, WEBP (max 4MB).</p>
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
                <Input
                  value={priceAir}
                  onChange={(e) => setPriceAir(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex: 480000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Prix bateau</Label>
                <Input
                  value={priceSea}
                  onChange={(e) => setPriceSea(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex: 420000"
                />
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
              <Label>Catégorie *</Label>
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
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Entrez la marque" />
            </div>
          </CardContent>
        </Card>
      </div>

      {createProduct.isError ? (
        <div className="mt-4 text-sm text-destructive">{(createProduct.error as Error).message}</div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/products">Annuler</Link>
        </Button>
        <Button onClick={() => createProduct.mutate()} disabled={!canCreate || createProduct.isPending}>
          Créer
        </Button>
      </div>
    </main>
  );
}
