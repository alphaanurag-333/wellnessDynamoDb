import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  coachLogin,
  coachSendLoginOtp,
  coachVerifyLoginOtp,
} from "../api/coachAuth.js";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { setCoachCredentials } from "../../store/authSlice.js";
import { PortalAuthLogin } from "../../components/PortalAuthLogin.jsx";

export function CoachLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl);

  if (coachToken) {
    return <Navigate to="/coach/dashboard" replace />;
  }

  const handleSuccess = async (data) => {
    dispatch(
      setCoachCredentials({
        coachToken: data.accessToken,
        refreshToken: data.refreshToken,
        coach: data.coach,
      }),
    );
    navigate("/coach/dashboard", { replace: true });
  };

  return (
    <PortalAuthLogin
      brandLogoSrc={brandLogoSrc}
      title="Wellness Coach"
      subtitle="Sign in with password or OTP to access your coach dashboard."
      onPasswordLogin={coachLogin}
      onOtpSend={coachSendLoginOtp}
      onOtpVerify={coachVerifyLoginOtp}
      onSuccess={handleSuccess}
      successWelcome={(data) => {
        const name = data.coach?.name?.trim();
        return name ? `Welcome, ${name}.` : "Welcome to the wellness coach portal.";
      }}
      footer={
        <>
          New here?{" "}
          <Link to="/coach/register" className="auth-link">
            Register as Wellness Coach
          </Link>
        </>
      }
    />
  );
}
