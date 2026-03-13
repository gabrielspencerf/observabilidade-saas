"use client";

/**
 * Página de acesso do usuário: login para acessar a conta (dashboard do tenant).
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { ArrowRight, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha no login. Tente novamente.");
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-brand-dark overflow-hidden">
      {/* Imagem de Fundo (Minimalista / Radial) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(0, 200, 130, 0.8) 0%, transparent 60%)"
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card Minimalista */}
        <div className="bg-brand-surface p-8 rounded-[24px] shadow-soft-lg animate-fade-in border border-brand-border/60 relative overflow-hidden">

          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center mb-4 shadow-inner relative group">
              <div className="absolute inset-0 bg-brand-neon/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img
                src="/logo.svg"
                alt="Creative Lane"
                className="h-8 w-8 text-brand-text logo-adaptive relative z-10"
              />
            </div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight font-display">
              Acesso do Cliente
            </h1>
            <p className="mt-2 text-sm text-brand-muted text-center">
              Autentique-se para acessar seus funis de dados.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500 border border-red-500/20 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                {error}
              </div>
            )}
            <div className="space-y-1.5 relative">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-muted ml-1"
              >
                Identificação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-brand-muted" />
                </div>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="pl-10 bg-brand-dark/50 border-brand-border/60 focus:bg-brand-surface transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5 relative">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-muted ml-1"
              >
                Credencial de Segurança
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-brand-muted" />
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-10 bg-brand-dark/50 border-brand-border/60 focus:bg-brand-surface transition-all"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-6 h-12 text-[15px] group">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Conectando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Iniciar Sessão
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Links de rodapé */}
        <div className="mt-8 flex flex-col items-center gap-4 text-sm animate-fade-in delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Link href="/" className="text-brand-muted hover:text-brand-text flex items-center gap-2 transition-colors">
            <span className="w-6 h-[1px] bg-brand-border"></span>
            Retornar ao terminal público
            <span className="w-6 h-[1px] bg-brand-border"></span>
          </Link>
          <p className="text-xs text-brand-muted/60 font-mono tracking-widest uppercase">
            SYS.AUTH.v2.1
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-lg">
            <div className="flex justify-center">
              <div className="h-14 w-14 animate-pulse rounded bg-brand-surface" />
            </div>
            <div className="mt-6 h-8 w-32 animate-pulse rounded bg-brand-surface" />
            <div className="mt-6 h-24 animate-pulse rounded bg-brand-surface" />
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
