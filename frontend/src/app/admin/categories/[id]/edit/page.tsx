"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ICON_OPTIONS = [
  { value: "shopping-bag", label: "Prêt à porter femme" },
  { value: "shirt", label: "Prêt à porter homme" },
  { value: "book-open", label: "Livres, Film et Musique" },
  { value: "baggage-claim", label: "Bagages et sacs" },
  { value: "watch", label: "Bijou et montre" },
  { value: "gamepad-2", label: "Divertissement" },
  { value: "washing-machine", label: "Electromenager" },
  { value: "heart-pulse", label: "Santé et beauté" },
  { value: "smartphone", label: "Accessoires téléphone" },
  { value: "home", label: "Maison et cuisine" },
  { value: "shapes", label: "Divers" },
  { value: "footprints", label: "Chaussure" },
  { value: "tag", label: "Ceinture" },
  { value: "dumbbell", label: "Sport" },
  { value: "cpu", label: "Electronique" },
  { value: "gem", label: "Bijoux (générique)" },
];

export default function AdminCategoryEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const categoryId = params.id;

  const categoryQuery = useQuery({
    queryKey: ["admin-category", categoryId],
    queryFn: () => apiGet<Category>(`/api/admin/categories/${categoryId}`),
    enabled: Boolean(categoryId),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("tag");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const category = categoryQuery.data;
    if (!category) return;
    setName(category.name ?? "");
    setDescription(category.description ?? "");
    setIcon(category.icon ?? "tag");
  }, [categoryQuery.data]);

  const updateCategory = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("icon", icon);
      formData.append("description", description.trim());
      if (imageFile) formData.append("image", imageFile);
      return apiPatch<Category>(`/api/admin/categories/${categoryId}`, formData);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      router.push("/admin/categories");
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Modifier une catégorie</h1>

      {categoryQuery.isLoading ? <div className="mt-4 text-sm text-muted-foreground">Chargement...</div> : null}
      {categoryQuery.isError ? <div className="mt-4 text-sm text-destructive">{(categoryQuery.error as Error).message}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid gap-2">
              <Label>Icône</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">JPG, JPEG, PNG, WEBP (max 4MB)</p>
            {imageFile ? <p className="text-xs text-foreground/80">Fichier: {imageFile.name}</p> : null}
          </CardContent>
        </Card>
      </div>

      {updateCategory.isError ? (
        <div className="mt-4 text-sm text-destructive">{(updateCategory.error as Error).message}</div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/categories">Annuler</Link>
        </Button>
        <Button onClick={() => updateCategory.mutate()} disabled={!name.trim() || updateCategory.isPending}>
          Enregistrer
        </Button>
      </div>
    </main>
  );
}
