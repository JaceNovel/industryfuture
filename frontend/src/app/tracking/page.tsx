"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock, Package, Truck } from "lucide-react";
import { motion } from "framer-motion";

const GOLD_GRADIENT = "linear-gradient(135deg, #f6e27a, #d4af37, #b8860b)";

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#d4af37]/18 bg-white p-6 text-center shadow-[0_26px_55px_-46px_rgba(212,175,55,0.55)] md:p-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(900px 300px at 20% 0%, rgba(212,175,55,0.16), transparent 60%), radial-gradient(700px 240px at 90% 20%, rgba(184,134,11,0.12), transparent 55%)",
          }}
        />
        <div className="relative">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950 md:text-4xl">Suivi de commande</h1>
          <p className="mt-2 text-sm text-slate-600">Entrez votre numéro pour suivre chaque étape en temps réel.</p>
          <div className="mx-auto mt-6 h-px w-full max-w-md" style={{ backgroundImage: GOLD_GRADIENT }} />
        </div>
      </motion.div>

      <div className="mx-auto mt-6 w-full max-w-3xl sm:mt-8">
        <div className="text-sm font-medium text-slate-900">Numéro de suivi</div>

        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="h-11 rounded-full border-[#d4af37]/22 bg-white/70 px-4 shadow-[0_12px_24px_-20px_rgba(212,175,55,0.55)] focus-visible:ring-[#d4af37]/20"
          />
          <Button
            className="h-11 w-full rounded-full border-none px-8 text-[#3f2e05] shadow-[0_16px_32px_-24px_rgba(212,175,55,0.85)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(212,175,55,0.9)] sm:w-auto"
            style={{ backgroundImage: GOLD_GRADIENT }}
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
            <Card className="mt-10 rounded-[20px] border border-[#d4af37]/18 bg-white/70 shadow-[0_18px_42px_-34px_rgba(212,175,55,0.55)] backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-950">Informations de commande</CardTitle>
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
                <div className="absolute left-[26px] top-0 h-full w-px bg-[#d4af37]/22" />
                <div className="space-y-8">
                  {steps.map((s) => {
                    const Icon = stepIcon(s.key);
                    const done = isDone(s, steps);

                    return (
                      <div key={s.key} className="relative flex items-start gap-5">
                        <div
                          className={
                            done
                              ? "flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#faf8f4] text-[#694d08] shadow-[0_14px_28px_-22px_rgba(212,175,55,0.7)]"
                              : "flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/18 bg-white/60 text-slate-500"
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
