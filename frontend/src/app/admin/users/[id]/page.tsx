"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UserDetail = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  spent_total: number;
  orders_count: number;
  created_at: string;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["admin-user", params.id],
    queryFn: () => apiGet<UserDetail>(`/api/admin/users/${params.id}`),
    enabled: Boolean(params.id),
  });

  const user = query.data;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Détail utilisateur</h1>
      {query.isLoading ? <div className="mt-4 text-sm text-muted-foreground">Chargement...</div> : null}
      {query.isError ? <div className="mt-4 text-sm text-destructive">{(query.error as Error).message}</div> : null}
      {user ? (
        <Card className="mt-6">
          <CardHeader><CardTitle>{user.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Email: {user.email}</div>
            <div>Rôle: {user.role}</div>
            <div>Statut: {user.status}</div>
            <div>Commandes: {user.orders_count}</div>
            <div>Dépensé: {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(user.spent_total)} F CFA</div>
          </CardContent>
        </Card>
      ) : null}
      <div className="mt-6"><Button variant="outline" asChild><Link href="/admin/users">Retour</Link></Button></div>
    </main>
  );
}
