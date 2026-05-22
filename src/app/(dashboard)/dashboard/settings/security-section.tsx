"use client";

import { useState } from "react";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { ShieldCheck, KeyRound } from "lucide-react";

/**
 * Seção de segurança da conta: alterar senha e encerrar sessões em todos os
 * dispositivos. Usa PATCH /api/context/profile com currentPassword/newPassword
 * (rotaciona a sessão atual e invalida outras) e POST /api/auth/logout-all
 * (redireciona para /login).
 */
export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [logoutAllConfirming, setLogoutAllConfirming] = useState(false);
  const [logoutAllSubmitting, setLogoutAllSubmitting] = useState(false);
  const [logoutAllError, setLogoutAllError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (newPassword.length < 8) {
      setPwError("Nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("A confirmação não confere com a nova senha.");
      return;
    }
    setPwSubmitting(true);
    try {
      const res = await fetch("/api/context/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data.error ?? "Não foi possível trocar a senha.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(
        "Senha alterada. Outras sessões foram encerradas e este dispositivo permanece logado."
      );
    } catch {
      setPwError("Falha de conexão.");
    } finally {
      setPwSubmitting(false);
    }
  }

  async function handleLogoutAll() {
    setLogoutAllError(null);
    setLogoutAllSubmitting(true);
    try {
      // O endpoint retorna 302 → /login; o fetch segue e os cookies são
      // limpos no redirect. Em sucesso, força redirect explícito.
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      if (res.ok || res.redirected) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setLogoutAllError(data.error ?? "Não foi possível encerrar sessões.");
    } catch {
      setLogoutAllError("Falha de conexão.");
    } finally {
      setLogoutAllSubmitting(false);
    }
  }

  return (
    <Card className="mt-6 border-brand-border bg-brand-surface">
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-brand-border/60 p-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-text" />
          </div>
          <h2 className="text-base font-semibold text-brand-text">Segurança</h2>
        </div>
        <p className="mt-1 text-sm text-brand-muted">
          Alterar senha de acesso e encerrar sessões em outros dispositivos.
        </p>

        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text">
            <KeyRound className="h-3.5 w-3.5" />
            Alterar senha
          </h3>
          {pwError && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {pwSuccess}
            </p>
          )}
          <div>
            <label
              htmlFor="security_current_password"
              className="block text-sm font-medium text-brand-muted"
            >
              Senha atual
            </label>
            <Input
              id="security_current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label
              htmlFor="security_new_password"
              className="block text-sm font-medium text-brand-muted"
            >
              Nova senha
            </label>
            <Input
              id="security_new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-brand-muted">
              Mínimo 8 caracteres.
            </p>
          </div>
          <div>
            <label
              htmlFor="security_confirm_password"
              className="block text-sm font-medium text-brand-muted"
            >
              Confirmar nova senha
            </label>
            <Input
              id="security_confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" disabled={pwSubmitting}>
            {pwSubmitting ? "Atualizando…" : "Alterar senha"}
          </Button>
        </form>

        <div className="mt-8 border-t border-brand-border pt-5">
          <h3 className="text-sm font-semibold text-brand-text">
            Encerrar todas as sessões
          </h3>
          <p className="mt-1 text-sm text-brand-muted">
            Desconecta este e todos os outros dispositivos. Você precisará fazer
            login novamente. Use se suspeitar de acesso indevido.
          </p>
          {logoutAllError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {logoutAllError}
            </p>
          )}
          <div className="mt-4">
            {!logoutAllConfirming ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLogoutAllConfirming(true)}
              >
                Encerrar sessões em todos os dispositivos
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                <span className="text-sm text-red-300">
                  Confirma encerrar todas as sessões?
                </span>
                <Button
                  type="button"
                  onClick={handleLogoutAll}
                  disabled={logoutAllSubmitting}
                  className="bg-red-500/90 text-white hover:bg-red-500"
                >
                  {logoutAllSubmitting ? "Encerrando…" : "Sim, encerrar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLogoutAllConfirming(false)}
                  disabled={logoutAllSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
