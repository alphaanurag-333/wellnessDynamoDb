import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Navigate, useNavigate } from "react-router-dom";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function UpdatedAdminLoginPage() {
  const { login, isAuthenticated, bootstrapping, authError, setAuthError } = useViewAs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  if (bootstrapping) {
    return (
      <div className="updated-admin" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p>Loading session…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      await login({ email, password });
      navigate(UPDATED_ADMIN_PATHS.dashboard, { replace: true });
    } catch (err) {
      setAuthError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="updated-admin"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(160deg, #f4f7f5 0%, #e8efe9 55%, #dfe8e2 100%)",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 16,
          padding: "28px 24px",
          boxShadow: "0 18px 50px rgba(20, 40, 30, 0.12)",
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", color: "#5b6b62", fontWeight: 600 }}>
            STAFF CONSOLE
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 24, fontFamily: "Georgia, serif" }}>
            India Redefining Wellness
          </h1>
          <p style={{ margin: "8px 0 0", color: "#5b6b62", fontSize: 14 }}>
            Sign in with your staff Account. Switch roles from the sidebar after login.
          </p>
        </div>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #c9d5ce" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Password
          <div style={{ position: "relative" }}>
            <input
              type={passwordVisible ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 42px 10px 12px",
                borderRadius: 10,
                border: "1px solid #c9d5ce",
              }}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                padding: 0,
                border: 0,
                borderRadius: 8,
                background: "transparent",
                color: "#5b6b62",
                cursor: "pointer",
              }}
            >
              {passwordVisible ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
            </button>
          </div>
        </label>

        {authError ? (
          <div style={{ color: "#b42318", fontSize: 13 }} role="alert">
            {authError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 4,
            padding: "12px 14px",
            borderRadius: 10,
            border: 0,
            background: "#1f6b45",
            color: "#fff",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
