import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { assistantLogin } from "../api/assistantAuth.js";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { setAssistantCredentials } from "../../store/authSlice.js";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { AuthPasswordToggle } from "../../components/AuthPasswordToggle.jsx";

export function AssistantLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl) || defaultLogo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  if (assistantToken) {
    return <Navigate to="/assistant/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let data;
    try {
      data = await assistantLogin({ email: email.trim(), password });
      dispatch(
        setAssistantCredentials({
          assistantToken: data.accessToken,
          refreshToken: data.refreshToken,
          assistant: data.assistant,
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

    const name = data.assistant?.name?.trim();
    await Swal.fire({
      icon: "success",
      title: "Signed in",
      text: name ? `Welcome, ${name}.` : "Welcome to the assistant wellness coach portal.",
      timer: 1500,
    });
    navigate("/assistant/dashboard", { replace: true });
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
        <h1 className="auth-card__title">Assistant Wellness Coach</h1>
        <p className="auth-card__subtitle">Enter your credentials to access your assistant dashboard.</p>
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
      </div>
    </div>
  );
}
