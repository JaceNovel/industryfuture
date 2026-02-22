"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Address } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Pencil, Plus, Trash2 } from "lucide-react";

type ReverseGeocodeResponse = {
  line1: string;
  city: string;
  postal_code: string;
  country: string;
};

export default function AddressesPage() {
  const qc = useQueryClient();

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => apiGet<Address[]>("/api/addresses"),
  });

  const addresses = addressesQuery.data ?? [];
  const hasDefaultAddress = addresses.some((a) => a.is_default);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("France");
  const [geoError, setGeoError] = useState<string | null>(null);

  const createAddress = useMutation({
    mutationFn: () => apiPost<Address>("/api/addresses", { line1, city, postal_code: postalCode, country }),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const updateAddress = useMutation({
    mutationFn: () =>
      apiPatch<Address>(`/api/addresses/${editing?.id}`, { line1, city, postal_code: postalCode, country }),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const deleteAddress = useMutation({
    mutationFn: (id: number) => apiDelete<{ ok: true }>(`/api/addresses/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  function openCreate() {
    setGeoError(null);
    setEditing(null);
    setLine1("");
    setCity("");
    setPostalCode("");
    setCountry("France");
    setOpen(true);
  }

  function openEdit(a: Address) {
    setGeoError(null);
    setEditing(a);
    setLine1(a.line1 ?? "");
    setCity(a.city ?? "");
    setPostalCode(a.postal_code ?? "");
    setCountry(a.country ?? "");
    setOpen(true);
  }

  async function fillFromPosition() {
    setGeoError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const data = await apiGet<ReverseGeocodeResponse>(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
          if (data.line1) setLine1(data.line1);
          if (data.city) setCity(data.city);
          if (data.postal_code) setPostalCode(data.postal_code);
          if (data.country) setCountry(data.country);
        } catch (e) {
          setGeoError((e as Error).message);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Autorisation refusée. Activez la localisation puis réessayez.");
        } else {
          setGeoError("Impossible de récupérer votre position.");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }

  const canSubmit = line1.trim() && city.trim() && postalCode.trim() && country.trim();
  const saving = createAddress.isPending || updateAddress.isPending;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="relative">
        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-4xl">Mes adresses</h1>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="destructive" className="w-full gap-2 sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter une adresse
          </Button>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-xl space-y-4">
            {addressesQuery.isLoading ? (
              <div className="text-center text-sm text-muted-foreground">Chargement…</div>
            ) : addressesQuery.isError ? (
              <div className="text-center text-sm text-destructive">{(addressesQuery.error as Error).message}</div>
            ) : null}

            {addresses.length ? (
              addresses.map((a, idx) => (
                <Card key={a.id} className="bg-background">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-1 h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">Adresse {idx + 1}</div>
                            {a.is_default ? (
                              <Badge variant="secondary" className="bg-transparent p-0 text-green-600">
                                (Par défaut)
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div>{a.line1}</div>
                            <div>
                              {a.city}, {a.postal_code}
                            </div>
                            <div>{String(a.country ?? "").toUpperCase()}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" aria-label="Modifier" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Supprimer"
                          onClick={() => deleteAddress.mutate(a.id)}
                          disabled={deleteAddress.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : addressesQuery.isLoading ? null : (
              <Card className="bg-background">
                <CardContent className="p-6">
                  <div className="text-center text-sm text-muted-foreground">Aucune adresse enregistrée.</div>
                </CardContent>
              </Card>
            )}

            {!hasDefaultAddress && addresses.length ? (
              <div className="text-center text-sm text-muted-foreground">Choisissez une adresse par défaut.</div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'adresse" : "Nouvelle adresse"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex items-center justify-end">
              <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={fillFromPosition}>
                <Navigation className="h-4 w-4" />
                Utiliser ma position
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Rue</Label>
              <Input value={line1} onChange={(e) => setLine1(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Code postal</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>

            {geoError ? <div className="text-sm text-destructive">{geoError}</div> : null}

            {createAddress.isError ? (
              <div className="text-sm text-destructive">{(createAddress.error as Error).message}</div>
            ) : null}
            {updateAddress.isError ? (
              <div className="text-sm text-destructive">{(updateAddress.error as Error).message}</div>
            ) : null}

            <Button
              variant="destructive"
              className="h-11 w-full"
              onClick={() => (editing ? updateAddress.mutate() : createAddress.mutate())}
              disabled={saving || !canSubmit}
            >
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
