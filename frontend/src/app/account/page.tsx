"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearAuthCookies, getEmail, getName, getPhone } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Package, MapPin } from "lucide-react";

function initials(value?: string | null) {
  const v = (value ?? "").trim();
  if (!v) return "?";
  return v.slice(0, 1).toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    setName(getName());
    setEmail(getEmail());
    setPhone(getPhone());
  }, []);

  const avatar = useMemo(() => initials(name), [name]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <Card className="bg-background">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">
              {avatar}
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight">Mon compte</div>
              <div className="text-sm text-muted-foreground">{email ?? ""}</div>
            </div>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              clearAuthCookies();
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-lg">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nom complet</div>
              <div className="text-base">{name ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Email</div>
              <div className="text-base">{email ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Téléphone</div>
              <div className="text-base">{phone ?? "—"}</div>
            </div>

            <Button variant="destructive" className="mt-2">
              Modifier
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-lg">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start gap-3">
              <Link href="/account/orders">
                <Package className="h-4 w-4" />
                Mes commandes
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-3">
              <Link href="/account/addresses">
                <MapPin className="h-4 w-4" />
                Mes adresses
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
