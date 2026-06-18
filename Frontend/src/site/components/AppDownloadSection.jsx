import { useSelector } from "react-redux";
import { IoPhonePortraitOutline, IoSparklesOutline } from "react-icons/io5";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";
import { SiteButton } from "./SiteButton.jsx";

export function AppDownloadSection() {
  const { appName, mobileApp, consultancyAmount, hero } = useSiteConfig();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const logoSrc = brandLogoUrl || defaultLogo;

  return (
    <section className="site-section site-app-download" aria-labelledby="app-download-title">
      <div className="site-container">
        <div className="site-app-download__grid">
          <div className="site-app-download__copy">
            <p className="site-eyebrow">
              <IoSparklesOutline aria-hidden /> Mobile Experience
            </p>
            <h2 id="app-download-title" className="site-heading">
              Your wellness journey, in your pocket
            </h2>
            <p className="site-subtext">
              Book consultations{consultancyAmount ? ` from ${consultancyAmount}` : ""}, join challenges,
              explore recipes, and connect with coaches — all inside the {appName} app.
            </p>
            <div className="site-app-download__actions">
              <SiteButton href={hero.ctaHref}>{hero.ctaLabel}</SiteButton>
              <AppDownloadButtons tone="dark" />
            </div>
          </div>

          <div className="site-app-download__phone" aria-hidden>
            <div className="site-phone-mockup">
              <div className="site-phone-mockup__notch" />
              <div className="site-phone-mockup__screen">
                <img className="site-phone-mockup__logo" src={logoSrc} alt="" />
                <p className="site-phone-mockup__app-name">{appName}</p>
                <p className="site-phone-mockup__tagline">{mobileApp.ctaLabel}</p>
                <span className="site-phone-mockup__pill">
                  <IoPhonePortraitOutline /> iOS &amp; Android
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
