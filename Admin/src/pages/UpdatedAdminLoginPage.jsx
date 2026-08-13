import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import defaultLogo from "../assets/logo/defaultlogo.png";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import "../updatedadmin.css";

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
            >
              {passwordVisible ? "Hide" : "Show"}
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
