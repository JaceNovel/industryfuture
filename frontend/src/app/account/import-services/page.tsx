"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ImportRequest } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ImportRequestsResponse = {
  data: ImportRequest[];
  current_page: number;
  last_page: number;
};

function statusLabel(s: ImportRequest["status"]) {
  const map: Record<ImportRequest["status"], string> = {
    pending: "En attente",
    accepted: "Acceptée",
    priced: "Tarifiée",
    awaiting_payment: "Paiement requis",
    paid: "Payée",
    processing: "En traitement",
    shipped: "Expédiée",
    delivered: "Livrée",
    rejected: "Refusée",
    canceled: "Annulée",
  };
  return map[s] ?? s;
}

export default function AccountImportServicesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.push("/auth/login");
  }, [router]);

  const requestsQuery = useQuery({
    queryKey: ["account-import-requests"],
    queryFn: () => apiGet<ImportRequestsResponse>("/api/import-requests"),
  });

  const payRequest = useMutation({
    mutationFn: (id: number) => apiPost<{ payment_url: string }>(`/api/import-requests/${id}/pay`),
    onSuccess: (data) => {
      if (data.payment_url) window.location.href = data.payment_url;
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mes services d&apos;importation</h1>

      {requestsQuery.isLoading ? <div className="mt-4 text-sm text-muted-foreground">Chargement...</div> : null}
      {requestsQuery.isError ? <div className="mt-4 text-sm text-destructive">{(requestsQuery.error as Error).message}</div> : null}

      <div className="mt-6 grid gap-4">
        {(requestsQuery.data?.data ?? []).map((req) => (
          <Card key={req.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>{req.name}</span>
                <Badge variant="secondary">{statusLabel(req.status)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Expédition: {req.shipping_mode === "air" ? "Avion" : "Bateau"}</div>
              <div>Délai souhaité: {req.desired_delay_days ?? "—"} jours</div>
              <div>Prix proposé: {req.admin_price != null ? `${Number(req.admin_price).toLocaleString("fr-FR")} F CFA` : "En attente"}</div>
              <div>ID de suivi: {req.tracking_number ?? "—"}</div>

              {(req.status === "priced" || req.status === "awaiting_payment") && req.admin_price != null ? (
                <Button size="sm" onClick={() => payRequest.mutate(req.id)} disabled={payRequest.isPending}>
                  Payer maintenant
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
