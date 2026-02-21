"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { apiPost } from "@/lib/api";
import { setAuthCookies } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: async () => apiPost<LoginResponse>("/api/auth/login", { email, password }),
    onSuccess: (data) => {
      setAuthCookies(data.token, data.user.role, data.user.name, data.user.email);
      router.push(data.user.role === "admin" ? "/admin" : "/account");
    },
  });

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="auth-visual premium-box"
        >
          <div className="auth-visual-glass">
            <div className="auth-visual-badge">
              <Sparkles className="h-4 w-4" />
              <span>Acces privilegie</span>
            </div>
            <h1 className="auth-visual-title">Bienvenue dans une experience exclusive</h1>
            <p className="auth-visual-text">
              Une interface minimaliste et haut de gamme pour gerer vos achats en toute simplicite.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="auth-form"
        >
          <div className="auth-card">
            <Link href="/" className="auth-back">
              <ArrowLeft className="h-4 w-4" /> Retour a l'accueil
            </Link>
            <div className="auth-header">
              <h2 className="auth-title">Connexion</h2>
              <p className="auth-subtitle">Accedez a votre espace personnel</p>
            </div>
            <div className="auth-divider" />

            <form
              className="auth-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                login.mutate();
              }}
            >
              <div className="auth-field">
                <Label htmlFor="email" className="auth-label">
                  Email
                </Label>
                <div className="input-group">
                  <Input
                    id="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="email@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <Label htmlFor="password" className="auth-label">
                  Mot de passe
                </Label>
                <div className="input-group">
                  <Input
                    id="password"
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                  />
                </div>
                <div className="auth-forgot">
                  <a className="auth-inline-link" href="#">
                    Mot de passe oublie ?
                  </a>
                </div>
              </div>

              <AnimatePresence>
                {login.isError ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="auth-error"
                  >
                    {(login.error as Error).message}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Button
                type="submit"
                className="auth-submit"
                disabled={login.isPending || !email || !password}
              >
                Se connecter
              </Button>

              <div className="auth-footer">
                <span>Vous n'avez pas de compte ?</span>
                <Link href="/auth/register" className="auth-inline-link">
                  S'inscrire
                </Link>
              </div>
            </form>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
