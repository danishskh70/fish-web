import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { MODE, isAuthed, login } from "../api/api";
import { LogoMark } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button } from "../ui/kit";

export default function Login() {
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/dashboard";
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (isAuthed()) return <Navigate to="/dashboard" replace />;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await login(u, p); nav(from, { replace: true }); } catch (x) { setErr(x instanceof Error ? x.message : "Could not sign in"); } finally { setBusy(false); }
  }
  return (
    <main className="login">
      <section className="login-brand" aria-label="MatsyaSetu">
        <svg className="login-waves" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true"><path d="M0 300c80-30 140 30 220 0s140-40 220-10 110 20 160 0v110H0z" fill="rgba(255,255,255,.07)" /><path d="M0 340c90-24 150 26 230 0s150-30 230-4 90 14 140 0v70H0z" fill="rgba(255,255,255,.1)" /></svg>
        <div className="login-logo"><LogoMark size={72} /><h1>MatsyaSetu</h1><p>Fish Seed Management System</p></div>
        <div className="login-tag">Plan · Distribute · Grow</div>
      </section>
      <section className="login-form">
        <form onSubmit={submit} className="login-card">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to your account</p>
          <label className="field"><span className="label">Username</span><input className="input" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="Enter username" autoFocus /></label>
          <label className="field"><span className="label">Password</span>
            <span className="pw"><input className="input" type={show ? "text" : "password"} value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" placeholder="Enter password" />
              <button type="button" className="pw-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}><Icon n={show ? "eyeoff" : "eye"} size={18} /></button></span>
          </label>
          {err && <div className="note bad" role="alert">{err}</div>}
          <Button block busy={busy}>Sign in</Button>
          <p className="sub center">{MODE === "demo" ? "Demo mode: any username and password works." : "Use your backend username and password."}</p>
        </form>
      </section>
    </main>
  );
}
