"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock, Package, Truck } from "lucide-react";

type TrackingStep = {
  key: "received" | "preparing" | "shipped" | "delivered";
  label: string;
  date: string | null;
};

type TrackingResponse = {
  tracking_number: string;
  order_number: string;
  status: string;
  order_date: string;
  estimated_delivery: string;
  steps: TrackingStep[];
};

function formatDateFR(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function statusLabel(status: string) {
  const s = (status ?? "").toLowerCase();
  if (s === "pending") return "En attente";
  if (s === "preparing" || s === "preparation" || s === "processing") return "En préparation";
  if (s === "shipped" || s.includes("exped")) return "Expédié";
  if (s === "delivered" || s.includes("livr")) return "Livré";
  return status;
}

function stepIcon(key: TrackingStep["key"]) {
  if (key === "received") return Clock;
  if (key === "preparing") return Package;
  if (key === "shipped") return Truck;
  return CheckCircle2;
}

function isDone(step: TrackingStep, steps: TrackingStep[]) {
  const idx = steps.findIndex((s) => s.key === step.key);
  const prev = steps.slice(0, idx + 1);
  return prev.every((s) => Boolean(s.date));
}

export default function TrackingPage() {
  const [tracking, setTracking] = useState("M84Q58Z1-DSF8TG");

  const lookup = useMutation({
    mutationFn: async () => {
      const n = tracking.trim();
      if (!n) throw new Error("Veuillez saisir un numéro de suivi.");
      return await apiGet<TrackingResponse>(`/api/tracking/${encodeURIComponent(n)}`);
    },
  });

  const data = lookup.data;

  const steps = useMemo<TrackingStep[]>(() => {
    if (data?.steps?.length) return data.steps;
    return [
      { key: "received", label: "Commande reçue", date: null },
      { key: "preparing", label: "En préparation", date: null },
      { key: "shipped", label: "Expédié", date: null },
      { key: "delivered", label: "Livré", date: null },
    ];
  }, [data]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-center text-4xl font-semibold tracking-tight">Suivi de commande</h1>

      <div className="mx-auto mt-10 w-full max-w-3xl">
        <div className="text-sm font-medium">Numéro de suivi</div>

        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="h-11"
          />
          <Button
            variant="destructive"
            className="h-11 px-8"
            onClick={() => lookup.mutate()}
            disabled={lookup.isPending}
          >
            Rechercher
          </Button>
        </div>

        {lookup.isError ? (
          <div className="mt-3 text-sm text-destructive">{(lookup.error as Error).message}</div>
        ) : null}

        {data ? (
          <>
            <Card className="mt-10 bg-muted/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Informations de commande</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-10 sm:grid-cols-2">
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Numéro de commande</div>
                      <div className="mt-1 font-semibold">{data.order_number}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Statut</div>
                      <div className="mt-1 font-semibold">{statusLabel(data.status)}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Date de commande</div>
                      <div className="mt-1 font-semibold">{formatDateFR(data.order_date)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Livraison estimée</div>
                      <div className="mt-1 font-semibold">{formatDateFR(data.estimated_delivery)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-12">
              <div className="relative pl-2">
                <div className="absolute left-[26px] top-0 h-full w-px bg-border" />
                <div className="space-y-8">
                  {steps.map((s) => {
                    const Icon = stepIcon(s.key);
                    const done = isDone(s, steps);

                    return (
                      <div key={s.key} className="relative flex items-start gap-5">
                        <div
                          className={
                            done
                              ? "flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                              : "flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground"
                          }
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="pt-1">
                          <div className="text-base font-semibold">{s.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {s.date ? formatDateFR(s.date) : "En attente"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
