import { useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import {
  buildAppStoreUrl,
  buildPlayStoreUrl,
  parseReferralRef,
  resolveAppReferralRedirectUrl,
} from "../lib/appReferralRedirect.js";

const pageStyle = {
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
  marginTop: "2rem",
  padding: "0 1rem",
};

export function AppReferralPage() {
  const [searchParams] = useSearchParams();
  const ref = parseReferralRef(searchParams);

  useLayoutEffect(() => {
    const target =
      typeof window.irwResolveAppReferralRedirectUrl === "function"
        ? window.irwResolveAppReferralRedirectUrl(`?${searchParams.toString()}`)
        : resolveAppReferralRedirectUrl({
            pathname: window.location.pathname,
            search: `?${searchParams.toString()}`,
            userAgent: window.navigator.userAgent,
            navigator: window.navigator,
          });
    if (target) window.location.replace(target);
  }, [searchParams]);

  const playUrl = buildPlayStoreUrl(ref);
  const iosUrl = buildAppStoreUrl(ref);

  return (
    <div style={pageStyle}>
      <p>Get the IR Wellness app{ref ? ` — referral ${ref}` : ""}</p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "center",
          marginTop: "1.25rem",
        }}
      >
        <a href={iosUrl} target="_blank" rel="noopener noreferrer" aria-label="Download on App Store">
          <FaApple size={28} aria-hidden />
          {" App Store"}
        </a>
        <a href={playUrl} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play">
          <FaGooglePlay size={28} aria-hidden />
          {" Google Play"}
        </a>
      </div>
    </div>
  );
}
