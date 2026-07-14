import { useEffect, useMemo, useState } from "react";
import { Country } from "country-state-city";
import Swal from "sweetalert2";
import { AuthPasswordToggle } from "./AuthPasswordToggle.jsx";
import { AuthPortalNav } from "./AuthPortalNav.jsx";
import defaultLogo from "../assets/logo/defaultlogo.png";
import {
  ALL_COUNTRIES,
  DEFAULT_DIAL,
  DEFAULT_ISO,
  dialCodeFromPhonecode,
} from "../admin/pages/wellnessCoach/WellnessCoachShared.js";

const OTP_RESEND_SECONDS = 30;

function formatPhoneDisplay(phoneCountryCode, phone) {
  const cc = String(phoneCountryCode || DEFAULT_DIAL).trim();
  const num = String(phone || "").trim();
  return `${cc} ${num}`.trim();
}

export function PortalAuthLogin({
  brandLogoSrc,
  title,
  subtitle,
  footer = null,
  portalNavActive = null,
  onPasswordLogin,
  onOtpSend,
  onOtpVerify,
  onSuccess,
  successWelcome,
}) {
  const [loginTab, setLoginTab] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [phoneCountryIso, setPhoneCountryIso] = useState(DEFAULT_ISO);
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_DIAL);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPhase, setOtpPhase] = useState("phone");
  const [debugOtp, setDebugOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const dialCountryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((c) => (
        <option key={`login-dial-${c.isoCode}`} value={c.isoCode}>
          {c.name} ({dialCodeFromPhonecode(c.phonecode)})
        </option>
      )),
    [],
  );

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const resetOtpFlow = () => {
    setOtpPhase("phone");
    setOtp("");
    setDebugOtp("");
    setResendSeconds(0);
  };

  const handleTabChange = (tab) => {
    setLoginTab(tab);
    resetOtpFlow();
  };

  const handlePhoneCountryChange = (iso) => {
    const code = iso || DEFAULT_ISO;
    const c = Country.getCountryByCode(code);
    setPhoneCountryIso(code);
    setPhoneCountryCode(c ? dialCodeFromPhonecode(c.phonecode) : DEFAULT_DIAL);
  };

  const handlePhoneInput = (e) => {
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handlePhoneKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  };

  const finishLogin = async (data) => {
    const name = successWelcome?.(data);
    await Swal.fire({
      icon: "success",
      title: "Signed in",
      text: name || "Welcome back.",
      timer: 1500,
    });
    await onSuccess(data);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await onPasswordLogin({ email: email.trim(), password });
      await finishLogin(data);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Could not sign in",
        text: err.message || "Login failed. Check your email and password.",
        confirmButtonColor: "#ea580c",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      return Swal.fire({
        icon: "warning",
        title: "Mobile number required",
        text: "Enter your 10-digit mobile number.",
        confirmButtonColor: "#ea580c",
      });
    }
    if (trimmedPhone.length !== 10) {
      return Swal.fire({
        icon: "warning",
        title: "Invalid mobile number",
        text: "Mobile number must be exactly 10 digits.",
        confirmButtonColor: "#ea580c",
      });
    }

    setLoading(true);
    try {
      const data = await onOtpSend({
        phone: trimmedPhone,
        phoneCountryCode: phoneCountryCode || DEFAULT_DIAL,
      });
      setOtpPhase("verify");
      setOtp("");
      setDebugOtp(data?.debugOtp ? String(data.debugOtp) : "");
      setResendSeconds(OTP_RESEND_SECONDS);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Could not send OTP",
        text: err.message || "Failed to send OTP. Please try again.",
        confirmButtonColor: "#ea580c",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpPhoneSubmit = async (e) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    const code = otp.trim();
    if (!code) {
      return Swal.fire({
        icon: "warning",
        title: "OTP required",
        text: "Enter the OTP sent to your mobile number.",
        confirmButtonColor: "#ea580c",
      });
    }

    setLoading(true);
    try {
      const data = await onOtpVerify({
        phone: phone.trim(),
        phoneCountryCode: phoneCountryCode || DEFAULT_DIAL,
        otp: code,
      });
      await finishLogin(data);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Verification failed",
        text: err.message || "Invalid OTP. Please try again.",
        confirmButtonColor: "#ea580c",
      });
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = brandLogoSrc || defaultLogo;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            <img
              src={logoSrc}
              alt=""
              className="auth-brand__logo-img"
              width={112}
              height="auto"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = defaultLogo;
              }}
            />
          </span>
        </div>
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>

        {portalNavActive ? <AuthPortalNav active={portalNavActive} /> : null}

        <div className="auth-login-tabs" role="tablist" aria-label="Login method">
          <button
            type="button"
            role="tab"
            aria-selected={loginTab === "password"}
            className={`auth-login-tabs__btn${loginTab === "password" ? " auth-login-tabs__btn--active" : ""}`}
            onClick={() => handleTabChange("password")}
          >
            Login with password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginTab === "otp"}
            className={`auth-login-tabs__btn${loginTab === "otp" ? " auth-login-tabs__btn--active" : ""}`}
            onClick={() => handleTabChange("otp")}
          >
            Login with OTP
          </button>
        </div>

        {loginTab === "password" ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">
                Email ID <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abc@example.com"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="auth-field">
              <span className="auth-field__label">
                Password <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap">
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <AuthPasswordToggle
                  visible={passwordVisible}
                  onToggle={() => setPasswordVisible((v) => !v)}
                />
              </div>
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : otpPhase === "phone" ? (
          <form className="auth-form" onSubmit={handleOtpPhoneSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">
                Mobile number <span className="required-dot">*</span>
              </span>
              <div className="auth-phone-row auth-phone-row--compact">
                <select
                  className="auth-select auth-select--compact"
                  value={phoneCountryIso || DEFAULT_ISO}
                  onChange={(e) => handlePhoneCountryChange(e.target.value)}
                  aria-label="Country calling code"
                  autoComplete="tel-country-code"
                  disabled
                  aria-readonly="true"
                >
                  {dialCountryOptions}
                </select>
                <div className="auth-input-wrap auth-input-wrap--compact">
                  <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={handlePhoneInput}
                    onKeyDown={handlePhoneKeyDown}
                    placeholder="9876543210"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    required
                  />
                </div>
              </div>
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleOtpVerifySubmit}>
            <div className="auth-otp-sent">
              <p className="auth-otp-sent__label">OTP sent to</p>
              <p className="auth-otp-sent__phone">{formatPhoneDisplay(phoneCountryCode, phone)}</p>
              <button
                type="button"
                className="auth-link auth-otp-sent__change"
                onClick={resetOtpFlow}
                disabled={loading}
              >
                Change mobile number
              </button>
            </div>

            {debugOtp ? (
              <div className="auth-otp-test" role="status">
                <span className="auth-otp-test__label">Test OTP</span>
                <strong className="auth-otp-test__code">{debugOtp}</strong>
              </div>
            ) : null}

            <label className="auth-field">
              <span className="auth-field__label">
                Enter OTP <span className="required-dot">*</span>
              </span>
              <div className="auth-input-wrap">
                <input
                  type="text"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  minLength={6}
                  required
                />
              </div>
            </label>

            <div className="auth-otp-actions">
              <button
                type="button"
                className="auth-link auth-otp-actions__resend"
                disabled={loading || resendSeconds > 0}
                onClick={sendOtp}
              >
                {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>
          </form>
        )}

        {footer ? <div className="auth-footer-link">{footer}</div> : null}
      </div>
    </div>
  );
}
