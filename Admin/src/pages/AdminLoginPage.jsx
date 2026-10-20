import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import defaultLogo from "../assets/logo/defaultlogo.png";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { consumePanelSessionNotice } from "../utils/panelSession.js";
import { useAppSelector } from "../store/hooks.js";
import { selectAdminLogoUrl, selectAppName } from "../store/slices/appConfigSlice.js";
import "../admin.css";

const COUNTRY_CODE = "+91";
const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const OTP_VALID_SECONDS = 60;

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

function formatPhone(digits) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

const TERMS_URL = "https://www.irwellness.in/terms-and-conditions";

function PhoneField({ value, onChange, disabled, autoFocus, label }) {
  return (
    <label className="ua-login__field">
      {label ? <span className="ua-login__label">{label}</span> : <span className="ua-login__sr">WhatsApp number</span>}
      <div className="ua-login__phone">
        <span className="ua-login__cc">{COUNTRY_CODE}</span>
        <input
          className="ua-login__input ua-login__input--phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          disabled={disabled}
          value={formatPhone(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH))}
          placeholder="00000 00000"
          autoFocus={autoFocus}
        />
      </div>
    </label>
  );
}

export function AdminLoginPage() {
  const { login, sendLoginOtp, loginWithOtp, completeTotpLogin, isAuthenticated, bootstrapping, authError, setAuthError } =
    useViewAs();
  const navigate = useNavigate();
  const [mode, setMode] = useState("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(() => {
    const reason = consumePanelSessionNotice();
    if (reason === "day") return "Your session ended because the date changed. Please sign in again.";
    if (reason === "idle") return "Your session ended after 30 minutes of inactivity. Please sign in again.";
    return "";
  });
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const appName = useAppSelector(selectAppName);
  const logoUrl = useAppSelector(selectAdminLogoUrl) || defaultLogo;

  const mfaStep = Boolean(mfaToken);
  const phoneValid = phone.length === PHONE_LENGTH;

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  if (bootstrapping) {
    return <BrandLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  function switchMode(next) {
    if (next === mode || busy) return;
    setMode(next);
    setOtpSent(false);
    setOtp("");
    setPassword("");
    setNotice("");
    setAuthError("");
  }

  function handleLoginResult(result) {
    if (result?.mfaRequired && result?.mfaToken) {
      setMfaToken(result.mfaToken);
      setTotpCode("");
      setNotice("");
      return;
    }
    navigate(UPDATED_ADMIN_PATHS.dashboard, { replace: true });
  }

  async function requestOtp() {
    const data = await sendLoginOtp({ phone, phoneCountryCode: COUNTRY_CODE });
    setOtpSent(true);
    setOtp("");
    setResendIn(OTP_VALID_SECONDS);
    setNotice(data?.message || "OTP has been sent successfully on WhatsApp");
  }

  async function run(task) {
    setBusy(true);
    setAuthError("");
    try {
      await task();
    } catch (err) {
      setNotice("");
      setAuthError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (mfaStep) {
      run(async () => handleLoginResult(await completeTotpLogin({ mfaToken, code: totpCode })));
      return;
    }
    if (!termsAccepted) {
      setAuthError("Accept the terms and conditions to continue.");
      return;
    }
    if (!phoneValid) {
      setAuthError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (mode === "password") {
      if (!password) {
        setAuthError("Enter your password.");
        return;
      }
      run(async () => handleLoginResult(await login({ phone, phoneCountryCode: COUNTRY_CODE, password })));
      return;
    }
    if (!otpSent) {
      run(requestOtp);
      return;
    }
    run(async () => handleLoginResult(await loginWithOtp({ phone, phoneCountryCode: COUNTRY_CODE, otp })));
  }

  function onResend() {
    if (busy || resendIn > 0) return;
    run(requestOtp);
  }

  function changeNumber() {
    setOtpSent(false);
    setOtp("");
    setNotice("");
    setAuthError("");
  }

  function backToSignIn() {
    setMfaToken("");
    setTotpCode("");
    setOtpSent(false);
    setOtp("");
    setNotice("");
    setAuthError("");
  }

  let heading = "Enter your WhatsApp number";
  let sub = "We will send a one-time code to your WhatsApp. Use the number saved on your account.";
  if (mfaStep) {
    heading = "Authenticator code";
    sub = "Enter the 6-digit code from Google Authenticator.";
  } else if (mode === "password") {
    heading = "Sign in with your password";
    sub = "Use the mobile number and password saved on your account. No password yet? Use the OTP tab to sign in with a WhatsApp code.";
  } else if (otpSent) {
    heading = "Enter the WhatsApp code";
    sub = `We sent a 6-digit code on WhatsApp to ${COUNTRY_CODE} ${formatPhone(phone)}. OTP is valid for ${OTP_VALID_SECONDS} seconds.`;
  }

  let submitLabel = "Sign in";
  if (busy) {
    submitLabel = mfaStep || otpSent ? "Verifying…" : mode === "otp" ? "Sending code…" : "Signing in…";
  } else if (mfaStep) {
    submitLabel = "Verify code";
  } else if (mode === "otp" && otpSent) {
    submitLabel = "Verify & sign in";
  }

  const submitDisabled =
    busy ||
    (!mfaStep && !termsAccepted) ||
    (mfaStep
      ? totpCode.length !== OTP_LENGTH
      : !phoneValid ||
        (mode === "password" && !password) ||
        (mode === "otp" && otpSent && otp.length !== OTP_LENGTH));

  return (
    <div className="updated-admin ua-login">
      <div className="ua-login__backdrop" aria-hidden="true" />

      <form className="ua-login__card" onSubmit={onSubmit} noValidate>
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
          <div className="ua-login__brand-title">{appName}</div>
          <p className="ua-login__brand-sub">Sign in to manage users, teams, and console access.</p>
        </div>

        {!mfaStep ? (
          <div className="ua-login__tabs" role="tablist" aria-label="Sign-in method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "otp"}
              className={`ua-login__tab${mode === "otp" ? " ua-login__tab--active" : ""}`}
              onClick={() => switchMode("otp")}
              disabled={busy}
            >
              OTP
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "password"}
              className={`ua-login__tab${mode === "password" ? " ua-login__tab--active" : ""}`}
              onClick={() => switchMode("password")}
              disabled={busy}
            >
              Password
            </button>
          </div>
        ) : null}

        <div className="ua-login__head">
          <h1 className="ua-login__title">{heading}</h1>
          <p className="ua-login__sub">{sub}</p>
        </div>

        {mfaStep ? (
          <label className="ua-login__field">
            <span className="ua-login__sr">Authenticator code</span>
            <input
              className="ua-login__input ua-login__input--code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={OTP_LENGTH}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              placeholder="000000"
              autoFocus
            />
          </label>
        ) : mode === "otp" && otpSent ? (
          <>
            <label className="ua-login__field">
              <span className="ua-login__sr">WhatsApp code</span>
              <input
                className="ua-login__input ua-login__input--code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                placeholder="000000"
                autoFocus
              />
            </label>
            <div className="ua-login__row">
              <button type="button" className="ua-login__link" onClick={changeNumber} disabled={busy}>
                Change number
              </button>
              <button type="button" className="ua-login__link" onClick={onResend} disabled={busy || resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code on WhatsApp"}
              </button>
            </div>
          </>
        ) : (
          <>
            <PhoneField
              value={phone}
              onChange={setPhone}
              disabled={busy}
              autoFocus
              label={mode === "password" ? "Mobile no" : ""}
            />
            {mode === "password" ? (
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
                    disabled={busy}
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
            ) : null}
          </>
        )}

        {!mfaStep ? (
          <div className="ua-login__terms">
            <input
              id="ua-login-terms"
              type="checkbox"
              checked={termsAccepted}
              disabled={busy}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setAuthError("");
              }}
            />
            <p className="ua-login__terms-copy">
              <label htmlFor="ua-login-terms">
                I accept the {appName} terms and agree to follow the system and strategy designed by the team.{" "}
              </label>
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
                Read the terms
              </a>
            </p>
          </div>
        ) : null}

        {notice && !authError ? (
          <div className="ua-login__notice" role="status">
            {notice}
          </div>
        ) : null}

        {authError ? (
          <div className="ua-login__error" role="alert">
            {authError}
          </div>
        ) : null}

        <button type="submit" className="ua-login__submit" disabled={submitDisabled}>
          {submitLabel}
        </button>

        {mfaStep ? (
          <button type="button" className="ua-login__back" disabled={busy} onClick={backToSignIn}>
            ← Back to sign in
          </button>
        ) : null}
      </form>
    </div>
  );
}
