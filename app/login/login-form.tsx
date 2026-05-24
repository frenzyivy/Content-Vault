"use client";

import { useState, useTransition } from "react";
import { login, signup, signInWithGoogle } from "./actions";

const C = {
  bg: "#1a1714", panel: "#221e1a", panel2: "#2a2521", line: "#39322c",
  text: "#ece5dc", dim: "#9c9088", accent: "#d4a373", green: "#7a8b6f", red: "#b56b5a",
};
const serif = `"Georgia", "Iowan Old Style", serif`;
const sans = `"Helvetica Neue", "Inter", system-ui, sans-serif`;

type Mode = "login" | "signup";
type Errors = { name?: string; email?: string; pw?: string };

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSignup = mode === "signup";

  const validate = () => {
    const e: Errors = {};
    if (isSignup && !name.trim()) e.name = "What should we call you?";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Enter a valid email";
    if (pw.length < 6) e.pw = "At least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (isPending) return;
    if (!validate()) return;
    setServerError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", pw);
    if (isSignup) fd.set("name", name);
    startTransition(async () => {
      const result = await (isSignup ? signup(fd) : login(fd));
      if (result?.error) setServerError(result.error);
      else if (result?.needsConfirmation) setConfirmation(true);
      // on success the server action redirects, so nothing else to do
    });
  };

  const onGoogle = () => {
    if (isPending) return;
    setServerError(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result?.error) setServerError(result.error);
    });
  };

  const swap = () => {
    setMode(isSignup ? "login" : "signup");
    setErrors({});
    setServerError(null);
  };

  const field = (hasErr?: boolean): React.CSSProperties => ({
    background: C.panel2, border: `1px solid ${hasErr ? C.red : C.line}`, color: C.text,
    padding: "12px 14px", borderRadius: 3, fontSize: 14.5, outline: "none", width: "100%",
    boxSizing: "border-box", fontFamily: sans, transition: "border-color .15s",
  });
  const lbl: React.CSSProperties = { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.dim, marginBottom: 7, display: "block" };
  const errStyle: React.CSSProperties = { color: C.red, fontSize: 12, marginTop: 5 };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: sans, display: "grid", placeItems: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* atmospheric glow */}
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}1f, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-25%", left: "-15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.green}18, transparent 65%)`, pointerEvents: "none" }} />
      {/* subtle grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />

      <div style={{ width: "min(420px, 100%)", position: "relative", zIndex: 1 }}>
        {/* brand */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <span style={{ width: 11, height: 11, borderRadius: 11, background: C.accent, boxShadow: `0 0 16px ${C.accent}88` }} />
            <span style={{ fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", color: C.accent }}>The Content Vault</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 33, color: C.text, lineHeight: 1.1 }}>
            {confirmation ? "Check your email." : isSignup ? "Start your vault" : "Welcome back"}
          </h1>
          {!confirmation && (
            <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 14, lineHeight: 1.5 }}>
              {isSignup ? "Save every reel, idea & profile worth remembering." : "Your ideas, references and profiles are waiting."}
            </p>
          )}
        </div>

        {/* card */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 28, boxShadow: "0 24px 60px -20px #00000080" }}>
          {confirmation ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 54, height: 54, borderRadius: 54, margin: "0 auto 18px", display: "grid", placeItems: "center", background: `${C.green}22`, border: `1px solid ${C.green}` }}>
                <span style={{ color: C.green, fontSize: 26 }}>✓</span>
              </div>
              <p style={{ color: C.dim, fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>
                We sent a confirmation link to <span style={{ color: C.text }}>{email}</span>.
                Click it to finish creating your vault.
              </p>
              <button onClick={() => { setConfirmation(false); setMode("login"); }} style={primaryBtn(true)}>Back to log in</button>
            </div>
          ) : (
            <>
              {/* mode toggle */}
              <div style={{ display: "flex", background: C.panel2, borderRadius: 4, padding: 4, marginBottom: 24 }}>
                {(["login", "signup"] as Mode[]).map((m) => (
                  <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); setServerError(null); }}
                    style={{
                      flex: 1, padding: "9px", borderRadius: 3, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                      background: mode === m ? C.accent : "transparent", color: mode === m ? "#1a1714" : C.dim, transition: "all .15s",
                    }}>
                    {m === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              {isSignup && (
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Komal" style={field(!!errors.name)}
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                  {errors.name && <div style={errStyle}>{errors.name}</div>}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={field(!!errors.email)}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
                {errors.email && <div style={errStyle}>{errors.email}</div>}
              </div>

              <div style={{ marginBottom: isSignup ? 22 : 12 }}>
                <label style={lbl}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
                    style={{ ...field(!!errors.pw), paddingRight: 60 }}
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.dim, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>
                    {showPw ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {errors.pw && <div style={errStyle}>{errors.pw}</div>}
              </div>

              {!isSignup && (
                <div style={{ textAlign: "right", marginBottom: 18 }}>
                  <button type="button" style={{ background: "none", border: "none", color: C.dim, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {serverError && (
                <div style={{ marginBottom: 14, padding: "10px 12px", border: `1px solid ${C.red}55`, background: `${C.red}18`, color: C.red, fontSize: 12.5, borderRadius: 3 }}>
                  {serverError}
                </div>
              )}

              <button type="button" onClick={submit} style={primaryBtn(!isPending)}>
                {isPending ? "One sec…" : isSignup ? "Create my vault" : "Log in"}
              </button>

              {/* divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>

              <button type="button" onClick={onGoogle} disabled={isPending}
                style={{ width: "100%", padding: "12px", borderRadius: 3, border: `1px solid ${C.line}`, background: "transparent", color: C.text, fontSize: 14, cursor: isPending ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: sans }}>
                <GoogleG /> Continue with Google
              </button>
            </>
          )}
        </div>

        {/* footer swap */}
        {!confirmation && (
          <p style={{ textAlign: "center", marginTop: 22, color: C.dim, fontSize: 13.5 }}>
            {isSignup ? "Already have a vault?" : "New here?"}{" "}
            <button type="button" onClick={swap} style={{ background: "none", border: "none", color: C.accent, fontSize: 13.5, cursor: "pointer", fontWeight: 600 }}>
              {isSignup ? "Log in" : "Create one"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "13px", borderRadius: 3, border: "none",
    background: enabled ? C.accent : C.line, color: "#1a1714", fontSize: 14.5, fontWeight: 600,
    cursor: enabled ? "pointer" : "wait", fontFamily: sans, letterSpacing: 0.2,
  };
}

function GoogleG() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.3 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
