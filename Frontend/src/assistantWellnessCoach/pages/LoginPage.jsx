import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import {
  assistantLogin,
  assistantSendLoginOtp,
  assistantVerifyLoginOtp,
} from "../api/assistantAuth.js";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { setAssistantCredentials } from "../../store/authSlice.js";
import { PortalAuthLogin } from "../../components/PortalAuthLogin.jsx";

export function AssistantLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl);

  if (assistantToken) {
    return <Navigate to="/assistant/dashboard" replace />;
  }

  const handleSuccess = async (data) => {
    dispatch(
      setAssistantCredentials({
        assistantToken: data.accessToken,
        refreshToken: data.refreshToken,
        assistant: data.assistant,
      }),
    );
    navigate("/assistant/dashboard", { replace: true });
  };

  return (
    <PortalAuthLogin
      brandLogoSrc={brandLogoSrc}
      title="Assistant Wellness Coach"
      subtitle="Sign in with password or OTP to access your assistant dashboard."
      onPasswordLogin={assistantLogin}
      onOtpSend={assistantSendLoginOtp}
      onOtpVerify={assistantVerifyLoginOtp}
      onSuccess={handleSuccess}
      successWelcome={(data) => {
        const name = data.assistant?.name?.trim();
        return name ? `Welcome, ${name}.` : "Welcome to the assistant wellness coach portal.";
      }}
    />
  );
}
