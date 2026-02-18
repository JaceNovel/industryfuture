"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function CheckoutPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("FR");
  const [phone, setPhone] = useState("");

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<Order>("/api/checkout", {
        shipping_address: {
          full_name: fullName,
          line1,
          line2: line2 || null,
          city,
          postal_code: postalCode,
          country,
          phone: phone || null,
        },
      }),
    onSuccess: (order) => {
      router.push(`/account?order=${order.id}`);
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">Adresse de livraison + validation de commande.</p>

      <Separator className="my-6" />

      <Card className="bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Adresse</Label>
            <Input value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Complément</Label>
            <Input value={line2} onChange={(e) => setLine2(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Code postal</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Téléphone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          {checkout.isError ? (
            <div className="text-sm text-destructive">{(checkout.error as Error).message}</div>
          ) : null}

          <div className="flex gap-2">
            <Button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending || !fullName || !line1 || !city || !postalCode}
            >
              Confirmer
            </Button>
            <Button variant="secondary" onClick={() => router.push("/cart")}>
              Retour panier
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
