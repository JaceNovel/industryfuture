"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ImportRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ImportRequestsResponse = {
  data: ImportRequest[];
  current_page: number;
  last_page: number;
};

function statusLabel(s: ImportRequest["status"]) {
  const map: Record<ImportRequest["status"], string> = {
    pending: "Demande en attente",
    accepted: "Demande acceptée",
    priced: "Tarif proposé",
    awaiting_payment: "En attente de paiement",
    paid: "Payée",
    processing: "En traitement",
    shipped: "Expédiée",
    delivered: "Livrée",
    rejected: "Refusée",
    canceled: "Annulée",
  };
  return map[s] ?? s;
}

export default function ImportServicePage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shippingMode, setShippingMode] = useState<"air" | "sea">("air");
  const [desiredDelayDays, setDesiredDelayDays] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    setCheckedAuth(true);
  }, [router]);

  const requestsQuery = useQuery({
    queryKey: ["import-requests"],
    queryFn: () => apiGet<ImportRequestsResponse>("/api/import-requests"),
    enabled: checkedAuth,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("shipping_mode", shippingMode);
      if (desiredDelayDays.trim()) formData.append("desired_delay_days", desiredDelayDays.trim());
      if (photo) formData.append("photo", photo);
      return apiPost<ImportRequest>("/api/import-requests", formData);
    },
    onSuccess: async () => {
      setName("");
      setDescription("");
      setDesiredDelayDays("");
      setPhoto(null);
      await requestsQuery.refetch();
    },
  });

  const payRequest = useMutation({
    mutationFn: (id: number) => apiPost<{ payment_url: string }>(`/api/import-requests/${id}/pay`),
    onSuccess: (data) => {
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
  });

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  if (!checkedAuth) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">Chargement...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Service d&apos;importation</h1>
          <p className="text-sm text-muted-foreground">Envoyez votre demande si l&apos;article n&apos;est pas encore dans la boutique.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/account/import-services">Mes services d&apos;importation</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle demande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom du produit *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: iPhone 16 Pro Max" />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
                placeholder="Couleur, capacité, référence, etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Expédition</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={shippingMode}
                  onChange={(e) => setShippingMode(e.target.value as "air" | "sea")}
                >
                  <option value="air">Avion</option>
                  <option value="sea">Bateau</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Délai souhaité (jours)</Label>
                <Input
                  value={desiredDelayDays}
                  onChange={(e) => setDesiredDelayDays(e.target.value)}
                  inputMode="numeric"
                  placeholder={shippingMode === "air" ? "Ex: 8" : "Ex: 40"}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Photo du produit</Label>
              <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>

            {createRequest.isError ? <div className="text-sm text-destructive">{(createRequest.error as Error).message}</div> : null}

            <div className="flex justify-end">
              <Button onClick={() => createRequest.mutate()} disabled={!canSubmit || createRequest.isPending}>
                Envoyer la demande
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(requestsQuery.data?.data ?? []).slice(0, 5).map((req) => (
              <div key={req.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="line-clamp-1 text-sm font-medium">{req.name}</div>
                  <Badge variant="secondary">{statusLabel(req.status)}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Suivi: {req.tracking_number ?? "—"}</div>
                {req.admin_price != null ? (
                  <div className="mt-1 text-xs text-muted-foreground">Prix proposé: {Number(req.admin_price).toLocaleString("fr-FR")} F CFA</div>
                ) : null}
                {(req.status === "priced" || req.status === "awaiting_payment") && req.admin_price != null ? (
                  <Button size="sm" className="mt-2" onClick={() => payRequest.mutate(req.id)} disabled={payRequest.isPending}>
                    Payer
                  </Button>
                ) : null}
              </div>
            ))}

            {requestsQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : null}
            {requestsQuery.isError ? <div className="text-sm text-destructive">{(requestsQuery.error as Error).message}</div> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
