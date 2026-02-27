"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

type WithdrawalRequest = {
  id: number;
  provider: "flooz" | "tmoney";
  phone_number: string;
  amount: number | string;
  status: "pending" | "approved" | "paid" | "rejected";
  note?: string | null;
  requested_at?: string;
  created_at?: string;
  user?: { name?: string; email?: string };
};

type PaginatedResponse<T> = { data: T[] };

type OrdersResponse = {
  data: Array<{ total?: number | string; status?: string | null }>;
};

function formatMoney(v: unknown) {
  const n = Number(v ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)} FCFA`;
}

function formatDate(v?: string) {
  if (!v) return "—";
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<"flooz" | "tmoney">("flooz");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const withdrawalsQuery = useQuery({
    queryKey: ["admin-withdrawal-requests"],
    queryFn: () => apiGet<PaginatedResponse<WithdrawalRequest>>("/api/admin/withdrawal-requests"),
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiGet<OrdersResponse>("/api/admin/orders"),
  });

  const requests = withdrawalsQuery.data?.data ?? [];

  const revenueTotal = useMemo(() => {
    const orders = ordersQuery.data?.data ?? [];
    return orders.reduce((sum, o) => {
      const s = String(o.status ?? "").toLowerCase();
      const isValidated = ["preparing", "preparation", "processing", "shipped", "delivered", "paid"].includes(s);
      if (!isValidated) return sum;
      return sum + Number(o.total ?? 0);
    }, 0);
  }, [ordersQuery.data]);

  const withdrawalsTotal = useMemo(() => {
    return requests.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  }, [requests]);

  const remaining = 0;

  const createRequest = useMutation({
    mutationFn: async () =>
      apiPost<WithdrawalRequest>("/api/admin/withdrawal-requests", {
        provider,
        phone_number: phoneNumber.trim(),
        amount: Number(amount || 0),
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      setPhoneNumber("");
      setAmount("");
      setNote("");
      await qc.invalidateQueries({ queryKey: ["admin-withdrawal-requests"] });
    },
  });

  const canSubmit = useMemo(() => {
    return phoneNumber.trim().length >= 8 && Number(amount) > 0;
  }, [amount, phoneNumber]);

  const downloadProof = async (id: number) => {
    setDownloadError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/withdrawal-requests/${id}/proof-pdf`, {
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
      a.download = `preuve-retrait-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Téléchargement impossible";
      setDownloadError(msg);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Paramètres</h1>
      <p className="mt-1 text-sm text-muted-foreground">Demande de retrait Mobile Money (Flooz / TMoney)</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Nouvelle demande de retrait</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Revenu total (commandes validées)</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(revenueTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Retraits demandés</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(withdrawalsTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Solde restant</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(remaining)}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Réseau</Label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "flooz" | "tmoney")}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="flooz">Flooz</option>
                <option value="tmoney">TMoney</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Numéro de retrait</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ex: +22890123456"
              />
            </div>

            <div className="grid gap-2">
              <Label>Montant (FCFA)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Ex: 50000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Note (optionnel)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajoutez un commentaire si nécessaire"
            />
          </div>

          {createRequest.isError ? (
            <div className="text-sm text-destructive">{(createRequest.error as Error).message}</div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={() => createRequest.mutate()} disabled={!canSubmit || createRequest.isPending}>
              Demander le retrait
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawalsQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement...</div> : null}
          {withdrawalsQuery.isError ? (
            <div className="text-sm text-destructive">{(withdrawalsQuery.error as Error).message}</div>
          ) : null}
          {downloadError ? <div className="mb-3 text-sm text-destructive">{downloadError}</div> : null}

          <div className="overflow-x-auto rounded-xl border">
            <div className="grid min-w-[860px] grid-cols-12 gap-3 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Réseau</div>
              <div className="col-span-3">Numéro</div>
              <div className="col-span-2">Montant</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-2 text-right">Preuve</div>
            </div>

            {requests.map((item) => (
              <div key={item.id} className="grid min-w-[860px] grid-cols-12 gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <div className="col-span-2">{formatDate(item.requested_at ?? item.created_at)}</div>
                <div className="col-span-2 uppercase">{item.provider}</div>
                <div className="col-span-3">{item.phone_number}</div>
                <div className="col-span-2 font-medium">{formatMoney(item.amount)}</div>
                <div className="col-span-1">
                  <Badge variant={item.status === "pending" ? "secondary" : "outline"}>{item.status}</Badge>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadProof(item.id)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            ))}

            {!withdrawalsQuery.isLoading && !requests.length ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">Aucune demande de retrait pour le moment.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
