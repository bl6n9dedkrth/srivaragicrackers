import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Owner Sign In — Sri Varagi Crackers" },
    { name: "description", content: "Secure sign-in for the Sri Varagi Crackers owner dashboard." },
    { property: "og:title", content: "Owner Sign In — Sri Varagi Crackers" },
    { property: "og:description", content: "Secure sign-in for the Sri Varagi Crackers owner dashboard." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const action = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    const { data, error: authError } = await action;
    if (authError) { setError(authError.message); setBusy(false); return; }
    if (!data.session) { setNotice("Check your email to confirm the account, then sign in."); setBusy(false); return; }
    await supabase.rpc("claim_owner_role");
    setBusy(false);
    void navigate({ to: "/admin" });
  };

  return (
    <div className="section-wrap page-enter flex min-h-[70svh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 sm:p-8">
        <span className="brand-mark"><ShieldCheck size={17} /></span>
        <h1 className="mt-5 font-display text-4xl text-primary">Owner sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">This area is restricted to the business owner. Customers can browse the catalogue without an account.</p>
        <form onSubmit={submit} className="mt-7 grid gap-4">
          <label className="field-label">Email<Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" /></label>
          <label className="field-label">Password<Input type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {notice && <p className="text-sm text-primary" role="status">{notice}</p>}
          <Button type="submit" variant="festive" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "signin" ? "Sign in" : "Create owner account"}</Button>
        </form>
        <Button variant="link" className="mt-3 px-0" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
          {mode === "signin" ? "First time? Create the owner account" : "Already registered? Sign in"}
        </Button>
      </div>
    </div>
  );
}
