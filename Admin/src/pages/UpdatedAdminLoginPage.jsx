import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import defaultLogo from "../assets/logo/defaultlogo.png";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import "../admin.css";

function EyeIcon({ off = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c7 0 10 7 10 7a13.4 13.4 0 0 1-3.2 3.9" />
          <path d="M6.1 6.1C3.7 7.8 2 12 2 12s3 7 10 7c1.7 0 3.2-.4 4.5-1" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function UpdatedAdminLoginPage() {
  const { login, isAuthenticated, bootstrapping, authError, setAuthError } = useViewAs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  if (bootstrapping) {
    return (
      <div className="updated-admin ua-login">
        <div className="ua-login__boot">Loading session…</div>
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
    <div className="updated-admin ua-login">
      <div className="ua-login__backdrop" aria-hidden="true" />

      <form className="ua-login__card" onSubmit={onSubmit}>
        <div className="ua-login__brand">
          <img
            className="ua-login__logo"
            src={defaultLogo}
            alt=""
            width={88}
            height="auto"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="ua-login__kicker">Admin console</div>
          <h1 className="ua-login__title">India Redefining Wellness</h1>
          <p className="ua-login__sub">
            Sign in to manage users, teams, and console access.
          </p>
        </div>

        <label className="ua-login__field">
          <span className="ua-login__label">Email</span>
          <input
            className="ua-login__input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="you@irwellness.in"
          />
        </label>

        <label className="ua-login__field">
          <span className="ua-login__label">Password</span>
          <div className="ua-login__password">
            <input
              className="ua-login__input"
              type={passwordVisible ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="ua-login__eye"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
            >
              <EyeIcon off={passwordVisible} />
            </button>
          </div>
        </label>

        {authError ? (
          <div className="ua-login__error" role="alert">
            {authError}
          </div>
        ) : null}

        <button type="submit" className="ua-login__submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
