"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { ImportRequest } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";

type ImportRequestsResponse = {
  data: ImportRequest[];
};

export default function AdminImportServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [priceById, setPriceById] = useState<Record<number, string>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["admin-import-requests"],
    queryFn: () => apiGet<ImportRequestsResponse>("/api/admin/import-requests"),
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiPatch(`/api/admin/import-requests/${id}`, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-import-requests"] });
    },
  });

  const notifyRequest = useMutation({
    mutationFn: (id: number) => apiPost(`/api/admin/import-requests/${id}/notify`, {}),
    onSuccess: async () => {
      setActionMessage("Email envoyé.");
      await qc.invalidateQueries({ queryKey: ["admin-import-requests"] });
    },
    onError: (error) => {
      setActionMessage(error instanceof Error ? error.message : "Envoi impossible");
    },
  });

  const rows = useMemo(() => {
    const all = requestsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => {
      const text = `${r.name} ${r.user?.name ?? ""} ${r.user?.email ?? ""} ${r.tracking_number ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [requestsQuery.data, search]);

  const downloadProof = async (id: number) => {
    setActionMessage(null);
    setDownloadError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/import-requests/${id}/proof-pdf`, {
        headers: {
          Accept: "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `service-premium-partenaire-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Téléchargement impossible";
      setDownloadError(msg);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Service d&apos;importation</h1>

      <Card className="mt-4 bg-card/40 backdrop-blur">
        <CardContent className="pt-6">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une demande..." />
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Demandes</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement...</div> : null}
          {requestsQuery.isError ? <div className="text-sm text-destructive">{(requestsQuery.error as Error).message}</div> : null}
          {downloadError ? <div className="mb-3 text-sm text-destructive">{downloadError}</div> : null}
          {actionMessage ? <div className="mb-3 text-sm text-muted-foreground">{actionMessage}</div> : null}

          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Produit</div>
                    <div className="font-medium">{r.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Client</div>
                    <div className="font-medium">{r.user?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.user?.email ?? ""}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Statut</div>
                    <select
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={r.status}
                      onChange={(e) => updateRequest.mutate({ id: r.id, payload: { status: e.target.value } })}
                    >
                      <option value="pending">pending</option>
                      <option value="accepted">accepted</option>
                      <option value="priced">priced</option>
                      <option value="awaiting_payment">awaiting_payment</option>
                      <option value="paid">paid</option>
                      <option value="processing">processing</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="rejected">rejected</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Suivi</div>
                    <div className="font-medium">{r.tracking_number ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="text-xs text-muted-foreground">Tarification (F CFA)</div>
                    <Input
                      value={priceById[r.id] ?? (r.admin_price != null ? String(r.admin_price) : "")}
                      onChange={(e) => setPriceById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      inputMode="decimal"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const val = Number(priceById[r.id] ?? r.admin_price ?? 0);
                      updateRequest.mutate({ id: r.id, payload: { admin_price: Number.isFinite(val) ? val : 0, status: "priced" } });
                    }}
                    disabled={updateRequest.isPending}
                  >
                    Enregistrer prix
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => downloadProof(r.id)}>
                    Télécharger PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActionMessage(null);
                      notifyRequest.mutate(r.id);
                    }}
                    disabled={notifyRequest.isPending}
                  >
                    Renvoyer mail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
