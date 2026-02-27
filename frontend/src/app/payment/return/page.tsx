"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    order_id?: string;
    payment_id?: string;
    status?: string;
  };
};

export default function PaymentReturnPage({ searchParams }: Props) {
  const orderId = searchParams?.order_id ?? null;
  const paymentId = searchParams?.payment_id ?? null;
  const queryStatus = (searchParams?.status ?? "").toLowerCase();

  type ReturnStatus = {
    order_id: number;
    payment_id: number;
    order_status: string;
    payment_status: string;
  };

  const [remote, setRemote] = useState<ReturnStatus | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setRemoteError(null);

      // If the payment provider didn't send a status param, fetch it from the backend.
      if (!orderId || !paymentId) return;

      try {
        const data = await apiGet<ReturnStatus>(
          `/api/payment/return-status?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}`
        );
        if (!cancelled) setRemote(data);
      } catch (e) {
        if (!cancelled) setRemoteError((e as Error).message);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [orderId, paymentId]);

  const { title, message } = useMemo(() => {
    const isApprovedQuery = queryStatus === "approved" || queryStatus === "paid" || queryStatus === "completed";
    const isCanceledQuery = ["canceled", "cancelled", "declined", "failed", "expired"].includes(queryStatus);

    const remotePaymentStatus = (remote?.payment_status ?? "").toLowerCase();
    const remoteOrderStatus = (remote?.order_status ?? "").toLowerCase();

    const isApprovedRemote = remotePaymentStatus === "completed" || ["preparing", "processing", "shipped", "delivered", "paid"].includes(remoteOrderStatus);
    const isCanceledRemote = remotePaymentStatus === "failed" || remoteOrderStatus === "canceled";

    const approved = isApprovedQuery || isApprovedRemote;
    const canceled = isCanceledQuery || isCanceledRemote;

    if (approved) {
      return {
        title: "Paiement confirmé",
        message: "Votre paiement a été reçu. Vous pouvez suivre votre commande dans votre compte.",
      };
    }

    if (canceled) {
      return {
        title: "Commande annulée",
        message: "Votre commande vient d’être annulée.",
      };
    }

    return {
      title: "Merci",
      message: "Votre paiement est en cours de validation. Vous pouvez suivre votre commande dans votre compte.",
    };
  }, [queryStatus, remote?.order_status, remote?.payment_status]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>

          {remoteError ? <p className="text-xs text-muted-foreground">Statut de paiement indisponible: {remoteError}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {orderId ? (
              <Button asChild className="sm:w-auto">
                <Link href={`/account/orders/${orderId}`}>Voir ma commande</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="sm:w-auto">
              <Link href="/account/orders">Mes commandes</Link>
            </Button>
            <Button asChild variant="secondary" className="sm:w-auto">
              <Link href="/shop">Continuer mes achats</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
