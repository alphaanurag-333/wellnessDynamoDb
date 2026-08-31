import { useSelector } from "react-redux";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import dummyAppImage from "../images/apk.png";
import {
  selectAppDisplayName,
  selectApkLogoLightUrl,
  selectLoginBrandLogoUrl,
} from "../../store/appConfigSelectors.js";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";

export default function AppHeroSection() {
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const apkLogoUrl = useSelector(selectApkLogoLightUrl);
  const appName = useSelector(selectAppDisplayName) || "India Redefining Wellness";
  const logoSrc = brandLogoUrl || defaultLogo;
  const appPreviewSrc = dummyAppImage;
  // const appPreviewSrc = apkLogoUrl || dummyAppImage;

  return (
    <section className="app-hero" aria-labelledby="app-hero-title">
      <div className="app-hero__glow app-hero__glow--orange" aria-hidden />
      <div className="app-hero__glow app-hero__glow--mint" aria-hidden />
      <svg className="app-hero__leaf" viewBox="0 0 90 140" aria-hidden>
        <path
          fill="currentColor"
          d="M78 12C48 46 22 82 8 132c38-22 64-58 70-120Z"
        />
      </svg>

      <div className="site-container app-hero__grid">
        <div className="app-hero__copy">
          {/* <div className="app-hero__brand">
            <img src={logoSrc} alt={appName} />
            <p>Your Wellness Partner</p>
          </div> */}

          <h2 id="app-hero-title" className="app-hero__title">
            <span>
              Transform <em>Today</em>
            </span>
            <span>
              Thrive <em className="is-blue">Tomorrow</em>
            </span>
          </h2>

          <p className="app-hero__sub">
            Your all-in-one companion for a healthier, stronger and happier you.
          </p>

          <AppDownloadButtons tone="dark" appleFirst />
        </div>

        <div className="app-hero__visual">
          <img
            className="app-hero__image"
            src={appPreviewSrc}
            alt="India Redefining Wellness app preview"
          />
        </div>
      </div>
    </section>
  );
}
