"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Filter, Plus, Search } from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  location?: string | null;
  status: string;
  spent_total: number;
};

type UsersResponse = { data: AdminUser[] };

function formatMoney(v: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v)} F CFA`;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<UsersResponse>("/api/admin/users"),
  });

  const users = usersQuery.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email} ${u.location ?? ""}`.toLowerCase().includes(q));
  }, [users, search]);

  const exportCsv = () => {
    const headers = ["Nom", "Email", "Localisation", "Statut", "Depense"];
    const lines = filtered.map((u) => [u.name, u.email, u.location ?? "-", u.status, String(u.spent_total)]);
    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Télécharger
          </Button>
          <Button asChild>
            <Link href="/admin/users/add" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche rapide..."
          />
        </div>
        <Button variant="outline" className="gap-2 sm:w-auto">
          <Filter className="h-4 w-4" /> Filtrer
        </Button>
      </div>

      {usersQuery.isError ? <div className="mt-4 text-sm text-destructive">{(usersQuery.error as Error).message}</div> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card/40">
        <div className="grid min-w-[860px] grid-cols-7 gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          <div></div>
          <div>NOM</div>
          <div className="col-span-2">EMAIL</div>
          <div>LOCALISATION</div>
          <div>STATUT</div>
          <div className="text-right">ACTIONS</div>
        </div>

        {filtered.map((u) => (
          <div key={u.id} className="grid min-w-[860px] grid-cols-7 items-center gap-4 border-b px-4 py-4 last:border-b-0">
            <div>
              <input type="checkbox" className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
                {u.name?.[0] ?? "U"}
              </div>
              <div className="font-medium">{u.name}</div>
            </div>
            <div className="col-span-2">{u.email}</div>
            <div>{u.location ?? "Togo"}</div>
            <div>
              <Badge variant="secondary" className="capitalize">{u.status}</Badge>
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="text-xs text-muted-foreground mr-2">{formatMoney(u.spent_total)}</div>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/users/${u.id}`} aria-label="Voir">
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
