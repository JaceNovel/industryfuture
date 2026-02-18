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

type LoginResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string };
};

function isNetworkError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed/i.test(msg);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: async () => {
      try {
        return await apiPost<LoginResponse>("/api/auth/login", { email, password });
      } catch (e) {
        if (!isNetworkError(e)) throw e;

        return {
          token: "demo-token",
          user: {
            id: 0,
            name: "Compte démo",
            email,
            role: "customer",
          },
        } satisfies LoginResponse;
      }
    },
    onSuccess: (data) => {
      setAuthCookies(data.token, data.user.role, data.user.name, data.user.email);
      router.push(data.user.role === "admin" ? "/admin" : "/account");
    },
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          {login.isError ? <div className="text-sm text-destructive">{(login.error as Error).message}</div> : null}

          <Button className="w-full" onClick={() => login.mutate()} disabled={login.isPending || !email || !password}>
            Se connecter
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Pas de compte ? <Link className="text-foreground hover:underline" href="/auth/register">Créer un compte</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
