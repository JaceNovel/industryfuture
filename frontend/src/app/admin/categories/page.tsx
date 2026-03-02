"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

type AdminCategoriesResponse = { data: Category[] };

const ICON_OPTIONS = [
  { value: "grid-2x2", label: "Catégories (grille)" },
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

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiGet<AdminCategoriesResponse>("/api/admin/categories"),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/categories/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const iconLabel = useMemo(() => {
    const m = new Map(ICON_OPTIONS.map((o) => [o.value, o.label] as const));
    return (v?: string | null) => (v ? m.get(v) ?? v : "—");
  }, []);

  const categories = categoriesQuery.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const description = (c.description ?? "").toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        description.includes(q)
      );
    });
  }, [categories, search]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
          <p className="text-sm text-muted-foreground">Gestion des catégories produits.</p>
        </div>

        <Button asChild>
          <Link href="/admin/categories/add" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter une catégorie
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
              placeholder="Rechercher des catégories..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isError ? (
            <div className="text-sm text-destructive">{(categoriesQuery.error as Error).message}</div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id ?? c.slug}>
                  <TableCell>
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt={c.name} className="h-12 w-12 rounded-md border object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">
                        {iconLabel(c.icon ?? null).slice(0, 2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {typeof c.id === "number" ? (
                        <Button variant="ghost" size="icon" asChild aria-label="Modifier">
                          <Link href={`/admin/categories/${c.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" disabled aria-label="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        disabled={deleteCategory.isPending || typeof c.id !== "number"}
                        onClick={() => {
                          if (typeof c.id === "number") deleteCategory.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
