"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

type Offer = {
  id: number;
  title: string;
  discount_percent: number;
  category?: { id: number; name: string } | null;
  products?: Array<{ id: number; name: string }>;
};

type OffersResponse = { data: Offer[] };

export default function AdminOffersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const offersQuery = useQuery({
    queryKey: ["admin-grouped-offers"],
    queryFn: () => apiGet<OffersResponse>("/api/admin/grouped-offers"),
  });

  const deleteOffer = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/admin/grouped-offers/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-grouped-offers"] });
    },
  });

  const offers = offersQuery.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) => `${o.title} ${o.category?.name ?? ""}`.toLowerCase().includes(q));
  }, [offers, search]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Offres Groupées</h1>
          <p className="text-muted-foreground">Gérez vos offres groupées et leurs réductions</p>
        </div>
        <Button asChild>
          <Link href="/admin/offers/add" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter une offre
          </Link>
        </Button>
      </div>

      <div className="mt-6 max-w-lg">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une offre..."
        />
      </div>

      {offersQuery.isError ? <div className="mt-4 text-sm text-destructive">{(offersQuery.error as Error).message}</div> : null}

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardContent className="py-6">
          {filtered.length === 0 ? (
            <div className="text-center text-2xl text-muted-foreground">Aucune offre groupée trouvée</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((offer) => (
                <div key={offer.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{offer.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Réduction: {offer.discount_percent}%
                        {offer.category?.name ? ` • Catégorie: ${offer.category.name}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Produits: {(offer.products ?? []).map((p) => p.name).join(", ") || "—"}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteOffer.mutate(offer.id)}
                      disabled={deleteOffer.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
