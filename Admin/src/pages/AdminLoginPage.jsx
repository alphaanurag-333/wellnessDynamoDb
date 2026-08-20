import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import defaultLogo from "../assets/logo/defaultlogo.png";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useAppSelector } from "../store/hooks.js";
import { selectAdminLogoUrl, selectAppName } from "../store/slices/appConfigSlice.js";
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

export function AdminLoginPage() {
  const { login, completeTotpLogin, isAuthenticated, bootstrapping, authError, setAuthError } = useViewAs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const appName = useAppSelector(selectAppName);
  const logoUrl = useAppSelector(selectAdminLogoUrl) || defaultLogo;

  const mfaStep = Boolean(mfaToken);

  if (bootstrapping) {
    return <BrandLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      if (mfaStep) {
        await completeTotpLogin({ mfaToken, code: totpCode });
        navigate(UPDATED_ADMIN_PATHS.dashboard, { replace: true });
        return;
      }
      const result = await login({ email, password });
      if (result?.mfaRequired && result?.mfaToken) {
        setMfaToken(result.mfaToken);
        setTotpCode("");
        return;
      }
      navigate(UPDATED_ADMIN_PATHS.dashboard, { replace: true });
    } catch (err) {
      setAuthError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function backToPassword() {
    setMfaToken("");
    setTotpCode("");
    setAuthError("");
  }

  return (
    <div className="updated-admin ua-login">
      <div className="ua-login__backdrop" aria-hidden="true" />

      <form className="ua-login__card" onSubmit={onSubmit}>
        <div className="ua-login__brand">
          <img
            className="ua-login__logo"
            src={logoUrl}
            alt=""
            width={88}
            height="auto"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="ua-login__kicker">Admin console</div>
          <h1 className="ua-login__title">{appName}</h1>
          <p className="ua-login__sub">
            {mfaStep
              ? "Enter the 6-digit code from Google Authenticator."
              : "Sign in to manage users, teams, and console access."}
          </p>
        </div>

        {mfaStep ? (
          <label className="ua-login__field">
            <span className="ua-login__label">Authenticator code</span>
            <input
              className="ua-login__input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoFocus
            />
          </label>
        ) : (
          <>
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
          </>
        )}

        {authError ? (
          <div className="ua-login__error" role="alert">
            {authError}
          </div>
        ) : null}

        <button type="submit" className="ua-login__submit" disabled={busy || (mfaStep && totpCode.length !== 6)}>
          {busy ? (mfaStep ? "Verifying…" : "Signing in…") : mfaStep ? "Verify code" : "Sign in"}
        </button>

        {mfaStep ? (
          <button type="button" className="ua-login__back" disabled={busy} onClick={backToPassword}>
            ← Back to password
          </button>
        ) : null}
      </form>
    </div>
  );
}
