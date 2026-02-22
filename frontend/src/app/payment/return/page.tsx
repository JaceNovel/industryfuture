import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    order_id?: string;
    status?: string;
  };
};

export default function PaymentReturnPage({ searchParams }: Props) {
  const orderId = searchParams?.order_id ?? null;
  const status = (searchParams?.status ?? "").toLowerCase();

  const title = status === "approved" ? "Paiement confirmé" : "Merci";
  const message =
    status === "approved"
      ? "Votre paiement a été reçu. Vous pouvez suivre votre commande dans votre compte."
      : "Votre paiement est en cours de validation. Vous pouvez suivre votre commande dans votre compte.";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
      <Card className="bg-background">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>

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
