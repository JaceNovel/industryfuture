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
  const [delayAirMin, setDelayAirMin] = useState("5");
  const [delayAirMax, setDelayAirMax] = useState("10");
  const [delaySeaMin, setDelaySeaMin] = useState("30");
  const [delaySeaMax, setDelaySeaMax] = useState("50");
  const [localMinQty, setLocalMinQty] = useState("1");
  const [airMinQty, setAirMinQty] = useState("2");
  const [seaMinQty, setSeaMinQty] = useState("10");
  const [localPricingMode, setLocalPricingMode] = useState<"lot" | "unit">("lot");
  const [airPricingMode, setAirPricingMode] = useState<"lot" | "unit">("lot");
  const [seaPricingMode, setSeaPricingMode] = useState<"lot" | "unit">("unit");
  const [tagDelivery, setTagDelivery] = useState<"PRET_A_ETRE_LIVRE" | "SUR_COMMANDE">("SUR_COMMANDE");
  const [categorySlug, setCategorySlug] = useState("");
  const [brand, setBrand] = useState("");
  const [tags, setTags] = useState("");
  const [deliveryEstimateNote, setDeliveryEstimateNote] = useState("Vous serez notifié par email et SMS à l'arrivée de votre commande.");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

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
    const delays = (meta.transport_delivery_delays ?? {}) as Record<string, unknown>;
    const quantityPricing = (meta.quantity_pricing ?? {}) as Record<string, unknown>;
    setPriceAir(t.air != null ? String(t.air) : "");
    setPriceSea(t.sea != null ? String(t.sea) : "");
    setDelayAirMin(delays.air_min != null ? String(delays.air_min) : "5");
    setDelayAirMax(delays.air_max != null ? String(delays.air_max) : "10");
    setDelaySeaMin(delays.sea_min != null ? String(delays.sea_min) : "30");
    setDelaySeaMax(delays.sea_max != null ? String(delays.sea_max) : "50");
    setLocalMinQty(String(Number(quantityPricing.local_min_qty ?? meta.minimum_order_quantity ?? 1) || 1));
    setAirMinQty(String(Number(quantityPricing.air_min_qty ?? 2) || 2));
    setSeaMinQty(String(Number(quantityPricing.sea_min_qty ?? 10) || 10));
    setLocalPricingMode(quantityPricing.local_base_mode === "unit" ? "unit" : "lot");
    setAirPricingMode(quantityPricing.air_base_mode === "unit" ? "unit" : "lot");
    setSeaPricingMode(quantityPricing.sea_base_mode === "lot" ? "lot" : "unit");
    setTagDelivery((p.tag_delivery ?? "SUR_COMMANDE") as "PRET_A_ETRE_LIVRE" | "SUR_COMMANDE");

    setBrand(typeof meta.brand === "string" ? meta.brand : "");
    if (Array.isArray(meta.tags)) {
      setTags(meta.tags.map((x) => String(x)).join(", "));
    } else if (typeof meta.tags === "string") {
      setTags(meta.tags);
    } else {
      setTags("");
    }

    setDeliveryEstimateNote(
      typeof meta.delivery_estimate_note === "string" && meta.delivery_estimate_note.trim()
        ? meta.delivery_estimate_note
        : "Vous serez notifié par email et SMS à l'arrivée de votre commande.",
    );
  }, [productQuery.data]);

  const updateProduct = useMutation({
    mutationFn: async () => {
      const existing = ((productQuery.data?.metadata ?? {}) as Record<string, unknown>) || {};
      const metadata: Record<string, unknown> = { ...existing };

      if (brand.trim()) metadata.brand = brand.trim();
      else delete metadata.brand;

      if (tags.trim()) metadata.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      else delete metadata.tags;

      if (deliveryEstimateNote.trim()) metadata.delivery_estimate_note = deliveryEstimateNote.trim();
      else delete metadata.delivery_estimate_note;

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

      const parsedDelayAirMin = delayAirMin.trim() ? Number(delayAirMin) : 5;
      const parsedDelayAirMax = delayAirMax.trim() ? Number(delayAirMax) : 10;
      const parsedDelaySeaMin = delaySeaMin.trim() ? Number(delaySeaMin) : 30;
      const parsedDelaySeaMax = delaySeaMax.trim() ? Number(delaySeaMax) : 50;
      const parsedLocalMinQty = localMinQty.trim() ? Number(localMinQty) : 1;
      const parsedAirMinQty = airMinQty.trim() ? Number(airMinQty) : 2;
      const parsedSeaMinQty = seaMinQty.trim() ? Number(seaMinQty) : 10;
      metadata.minimum_order_quantity = Number.isFinite(parsedLocalMinQty) && parsedLocalMinQty > 0 ? parsedLocalMinQty : 1;
      metadata.quantity_pricing = {
        local_min_qty: Number.isFinite(parsedLocalMinQty) && parsedLocalMinQty > 0 ? parsedLocalMinQty : 1,
        air_min_qty: Number.isFinite(parsedAirMinQty) && parsedAirMinQty > 0 ? parsedAirMinQty : 2,
        sea_min_qty: Number.isFinite(parsedSeaMinQty) && parsedSeaMinQty > 0 ? parsedSeaMinQty : 10,
        local_base_mode: localPricingMode,
        air_base_mode: airPricingMode,
        sea_base_mode: seaPricingMode,
      };
      metadata.transport_delivery_delays = {
        air_min: Number.isFinite(parsedDelayAirMin) ? parsedDelayAirMin : 5,
        air_max: Number.isFinite(parsedDelayAirMax) ? parsedDelayAirMax : 10,
        sea_min: Number.isFinite(parsedDelaySeaMin) ? parsedDelaySeaMin : 30,
        sea_max: Number.isFinite(parsedDelaySeaMax) ? parsedDelaySeaMax : 50,
      };

      await apiPatch(`/api/admin/products/${productId}`, {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price || 0),
        tag_delivery: tagDelivery,
        delivery_delay_days: tagDelivery === "PRET_A_ETRE_LIVRE" ? 3 : 10,
        categories: categorySlug ? [categoryNameBySlug.get(categorySlug) ?? categorySlug] : [],
        metadata,
      });

      if (imageFiles.length) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const formData = new FormData();
          formData.append("image", file);
          formData.append("alt", `${name.trim()} ${i + 1}`);
          formData.append("sort_order", String(i));
          await apiPost(`/api/admin/products/${productId}/images`, formData);
        }
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
            <Label>Ajouter 3-4 images (max 4)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
            />
            {imageFiles.length ? <p className="text-xs text-foreground/80">{imageFiles.length} fichier(s) sélectionné(s).</p> : null}
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Délai avion (min jours)</Label>
                <Input value={delayAirMin} onChange={(e) => setDelayAirMin(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-2">
                <Label>Délai avion (max jours)</Label>
                <Input value={delayAirMax} onChange={(e) => setDelayAirMax(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-2">
                <Label>Délai bateau (min jours)</Label>
                <Input value={delaySeaMin} onChange={(e) => setDelaySeaMin(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-2">
                <Label>Délai bateau (max jours)</Label>
                <Input value={delaySeaMax} onChange={(e) => setDelaySeaMax(e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-sm font-semibold text-foreground">Quantités minimum & mode de calcul</div>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="text-sm font-medium">Disponible sur place</div>
                  <div className="grid gap-2">
                    <Label>Quantité minimum</Label>
                    <Input value={localMinQty} onChange={(e) => setLocalMinQty(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prix de base</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={localPricingMode}
                      onChange={(e) => setLocalPricingMode(e.target.value as "lot" | "unit")}
                    >
                      <option value="lot">Pour le lot minimum</option>
                      <option value="unit">Par pièce</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="text-sm font-medium">Livraison avion</div>
                  <div className="grid gap-2">
                    <Label>Quantité minimum</Label>
                    <Input value={airMinQty} onChange={(e) => setAirMinQty(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prix de base</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={airPricingMode}
                      onChange={(e) => setAirPricingMode(e.target.value as "lot" | "unit")}
                    >
                      <option value="lot">Pour le lot minimum</option>
                      <option value="unit">Par pièce</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="text-sm font-medium">Livraison bateau</div>
                  <div className="grid gap-2">
                    <Label>Quantité minimum</Label>
                    <Input value={seaMinQty} onChange={(e) => setSeaMinQty(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prix de base</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={seaPricingMode}
                      onChange={(e) => setSeaPricingMode(e.target.value as "lot" | "unit")}
                    >
                      <option value="lot">Pour le lot minimum</option>
                      <option value="unit">Par pièce</option>
                    </select>
                  </div>
                </div>
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
              <Label>Tag livraison</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={tagDelivery}
                onChange={(e) => setTagDelivery(e.target.value as "PRET_A_ETRE_LIVRE" | "SUR_COMMANDE")}
              >
                <option value="PRET_A_ETRE_LIVRE">PRÊT À ÊTRE LIVRÉ</option>
                <option value="SUR_COMMANDE">SUR COMMANDE</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Note estimation livraison</Label>
              <textarea
                value={deliveryEstimateNote}
                onChange={(e) => setDeliveryEstimateNote(e.target.value)}
                placeholder="Texte affiché sous l'estimation de livraison"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
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
