"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminUserAddPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const createUser = useMutation({
    mutationFn: () => apiPost("/api/admin/users", { name, email, password, role }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      router.push("/admin/users");
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Ajouter un utilisateur</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="grid gap-2">
            <Label>Mot de passe</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
          <div className="grid gap-2">
            <Label>Rôle</Label>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="customer">Client</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </CardContent>
      </Card>
      {createUser.isError ? <div className="mt-4 text-sm text-destructive">{(createUser.error as Error).message}</div> : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" asChild><Link href="/admin/users">Annuler</Link></Button>
        <Button onClick={() => createUser.mutate()} disabled={!name.trim() || !email.trim() || !password.trim() || createUser.isPending}>Créer</Button>
      </div>
    </main>
  );
}
