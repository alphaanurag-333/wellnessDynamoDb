import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { coachLogin } from "../api/coachAuth.js";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { setCoachCredentials } from "../../store/authSlice.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";

export function CoachLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl) || defaultLogo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  if (coachToken) {
    return <Navigate to="/coach/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let data;
    try {
      data = await coachLogin({ email: email.trim(), password });
      dispatch(
        setCoachCredentials({
          coachToken: data.accessToken,
          refreshToken: data.refreshToken,
          coach: data.coach,
        }),
      );
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Could not sign in",
        text: err.message || "Login failed. Check your email and password.",
        confirmButtonColor: "#ea580c",
      });
      return;
    } finally {
      setLoading(false);
    }

    const name = data.coach?.name?.trim();
    await Swal.fire({
      icon: "success",
      title: "Signed in",
      text: name ? `Welcome, ${name}.` : "Welcome to the wellness coach portal.",
      timer: 1500,
    });
    navigate("/coach/dashboard", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            <img
              src={brandLogoSrc}
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
        <h1 className="auth-card__title">Wellness Coach</h1>
        <p className="auth-card__subtitle">Enter your credentials to access your coach dashboard.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field__label">Email ID <span className="required-dot">*</span></span>
            <div className="auth-input-wrap">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="abc@example.com"
                autoComplete="username"
                required
              />
            </div>
          </label>
          <label className="auth-field">
            <span className="auth-field__label">Password <span className="required-dot">*</span></span>
            <div className="auth-input-wrap">
              <input
                type={passwordVisible ? "text" : "password"}
                name="password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((v) => !v)}
              >
                {passwordVisible ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="auth-footer-link">
          New here?{" "}
          <Link to="/coach/register" className="auth-link">
            Register as Wellness Coach
          </Link>
        </p>
      </div>
    </div>
  );
}
