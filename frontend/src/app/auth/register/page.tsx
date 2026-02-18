"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { setAuthCookies } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string };
};

function isNetworkError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed/i.test(msg);
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = useMutation({
    mutationFn: async () => {
      try {
        return await apiPost<RegisterResponse>("/api/auth/register", { name, email, password });
      } catch (e) {
        if (!isNetworkError(e)) throw e;

        return {
          token: "demo-token",
          user: {
            id: 0,
            name: name || "Compte démo",
            email,
            role: "customer",
          },
        } satisfies RegisterResponse;
      }
    },
    onSuccess: (data) => {
      setAuthCookies(data.token, data.user.role, data.user.name, data.user.email);
      router.push("/account");
    },
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          {register.isError ? (
            <div className="text-sm text-destructive">{(register.error as Error).message}</div>
          ) : null}

          <Button
            className="w-full"
            onClick={() => register.mutate()}
            disabled={register.isPending || !name || !email || password.length < 8}
          >
            Créer
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Déjà un compte ? <Link className="text-foreground hover:underline" href="/auth/login">Se connecter</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
