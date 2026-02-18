"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiGet<AdminCategoriesResponse>("/api/admin/categories"),
  });

  const createCategory = useMutation({
    mutationFn: () => apiPost<Category>("/api/admin/categories", { name, icon }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setName("");
      setIcon("tag");
    },
  });

  const iconLabel = useMemo(() => {
    const m = new Map(ICON_OPTIONS.map((o) => [o.value, o.label] as const));
    return (v?: string | null) => (v ? m.get(v) ?? v : "—");
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
          <p className="text-sm text-muted-foreground">Configuration icône + nom (utilisé dans le menu Catégories).</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Créer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle catégorie</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              {createCategory.isError ? (
                <div className="text-sm text-destructive">{(createCategory.error as Error).message}</div>
              ) : null}
              <Button onClick={() => createCategory.mutate()} disabled={createCategory.isPending || !name.trim()}>
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
          {categoriesQuery.isError ? (
            <div className="text-sm text-destructive">{(categoriesQuery.error as Error).message}</div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Icône</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categoriesQuery.data?.data ?? []).map((c) => (
                <TableRow key={c.id ?? c.slug}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{iconLabel(c.icon ?? null)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
