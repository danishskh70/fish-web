import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { Btn, Err, Field, Icon } from "../lib";

export default function Login() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/dashboard";
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: u.trim(), password: p }),
      });
      setP("");
      await qc.invalidateQueries({ queryKey: ["me"] });
      nav(from, { replace: true });
    } catch (x) {
      const a = x as ApiError;
      if (a.status === 429) setWait(a.retryAfter ?? 60);
      setErr(a.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="login-hero" style={{ paddingBottom: 30 }}>
        <Icon n="fish" size={68} />
        <h1>
          FishSeed
          <br />
          Manager
        </h1>
        <p>Manage your fish seed business easily</p>
        <div className="sub" style={{ color: "rgba(255,255,255,.8)", marginTop: 14 }}>
          Trips · Orders · Handovers · Bills
        </div>
      </div>
      <svg
        className="wave"
        viewBox="0 0 480 46"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 0h480v14c-60 26-120 26-180 10S140 4 80 18 20 40 0 30z"
          fill="#064d3b"
        />
      </svg>
      <form className="card login-card" style={{ marginTop: 18 }} onSubmit={submit}>
        <Field label="Username">
          <input
            className="input"
            value={u}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
            aria-label="Username"
          />
        </Field>
        <Field label="Password">
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
              required
              aria-describedby={err ? "login-error" : undefined}
              style={{ paddingRight: 72 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 2,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--mut)",
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.78rem",
              }}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        {err && (
          <div id="login-error" role="alert" aria-live="assertive">
            <Err m={err} />
          </div>
        )}
        {wait > 0 && (
          <div className="alert bad" role="status" aria-live="polite">
            Too many tries. Wait {wait}s.
          </div>
        )}
        <Btn block busy={busy} disabled={wait > 0}>
          Get started
        </Btn>
        <div className="sub center mt">Made for fish farmers and suppliers</div>
      </form>
    </>
  );
}
