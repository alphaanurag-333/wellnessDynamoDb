import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { staffLogin, staffSendLoginOtp, staffVerifyLoginOtp } from "../api/staffAuth.js";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import {
  setAssistantCredentials,
  setCoachCredentials,
  setCredentials,
  setStaffCredentials,
} from "../../store/authSlice.js";
import { PortalAuthLogin } from "../../components/PortalAuthLogin.jsx";
import { firstAllowedPanelPath, homePrefixForAccountType } from "../utils/navAccess.js";

export function PanelLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const staffToken = useSelector((s) => s.auth.staffToken);
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const brandLogoSrc = mediaUrl(brandLogoUrl);

  if (staffToken) {
    return <Navigate to={firstAllowedPanelPath()} replace />;
  }

  const handleSuccess = async (data) => {
    const { accessToken, refreshToken, account } = data;
    dispatch(setStaffCredentials({ staffToken: accessToken, refreshToken, staffAccount: account }));

    // Admin/Coach/Assistant accounts keep their historical pages
    // (`/admin/...`, `/coach/...`, `/assistant/...`) — mirror the same token
    // into that portal's own Redux slot so every existing page's
    // `useSelector((s) => s.auth.adminToken)`-style calls and that layout's
    // token guard keep working unmodified after logging in from here.
    if (account?.accountType === "admin") {
      dispatch(setCredentials({ adminToken: accessToken, refreshToken, admin: account }));
    } else if (account?.accountType === "wellness_coach") {
      dispatch(setCoachCredentials({ coachToken: accessToken, refreshToken, coach: account }));
    } else if (account?.accountType === "assistant_wellness_coach") {
      dispatch(setAssistantCredentials({ assistantToken: accessToken, refreshToken, assistant: account }));
    }

    const homePath = `${homePrefixForAccountType(account?.accountType)}/dashboard`;
    navigate(homePath, { replace: true });
  };

  return (
    <PortalAuthLogin
      brandLogoSrc={brandLogoSrc}
      title="Staff Panel"
      subtitle="Sign in with password or OTP — Admin, Wellness Coach and Assistant Wellness Coach share one login."
      onPasswordLogin={staffLogin}
      onOtpSend={staffSendLoginOtp}
      onOtpVerify={staffVerifyLoginOtp}
      onSuccess={handleSuccess}
      successWelcome={(data) => {
        const name = data.account?.name?.trim();
        return name ? `Welcome, ${name}.` : "Welcome to the staff panel.";
      }}
      footer={
        <>
          New wellness coach?{" "}
          <Link to="/coach/register" className="auth-link">
            Register as Wellness Coach
          </Link>
        </>
      }
    />
  );
}
