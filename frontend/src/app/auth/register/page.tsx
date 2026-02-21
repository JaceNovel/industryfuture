"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { apiPost } from "@/lib/api";
import { setAuthCookies } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordMismatch = Boolean(confirmPassword) && password !== confirmPassword;

  const register = useMutation({
    mutationFn: async () => apiPost<RegisterResponse>("/api/auth/register", { name, email, password }),
    onSuccess: (data) => {
      setAuthCookies(data.token, data.user.role, data.user.name, data.user.email);
      router.push("/account");
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
              <ShieldCheck className="h-4 w-4" />
              <span>Creation securisee</span>
            </div>
            <h1 className="auth-visual-title">Rejoignez un univers premium</h1>
            <p className="auth-visual-text">
              Des collections exclusives et un parcours d'achat minimaliste, pense pour vous.
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
              <h2 className="auth-title">Inscription</h2>
              <p className="auth-subtitle">Creez votre espace personnel</p>
            </div>
            <div className="auth-divider" />

            <form
              className="auth-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordMismatch) return;
                register.mutate();
              }}
            >
              <div className="auth-field">
                <Label htmlFor="name" className="auth-label">
                  Nom complet
                </Label>
                <div className="input-group">
                  <Input
                    id="name"
                    className="auth-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    placeholder="8+ caracteres"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="auth-field">
                <Label htmlFor="confirmPassword" className="auth-label">
                  Confirmer le mot de passe
                </Label>
                <div className="input-group">
                  <Input
                    id="confirmPassword"
                    className="auth-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="Confirmez votre mot de passe"
                    autoComplete="new-password"
                  />
                </div>
                {passwordMismatch ? <div className="auth-hint">Les mots de passe ne correspondent pas.</div> : null}
              </div>

              <AnimatePresence>
                {register.isError ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="auth-error"
                  >
                    {(register.error as Error).message}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Button
                type="submit"
                className="auth-submit"
                disabled={register.isPending || !name || !email || password.length < 8 || passwordMismatch}
              >
                Creer le compte
              </Button>

              <div className="auth-footer">
                <span>Deja un compte ?</span>
                <Link href="/auth/login" className="auth-inline-link">
                  Se connecter
                </Link>
              </div>
            </form>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
