import { useSelector } from "react-redux";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteButton } from "./SiteButton.jsx";


export function SiteHero() {
  const { hero } = useSiteConfig();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);

  return (
    <section className="site-hero site-hero--premium" aria-labelledby="site-hero-title">
      <div className="site-hero__bg" aria-hidden>
        <span className="site-hero__orb site-hero__orb--1" />
        <span className="site-hero__orb site-hero__orb--2" />
        <span className="site-hero__orb site-hero__orb--3" />
      </div>
      <div className="site-container site-hero__container">
        <div className="site-hero__grid">
          <div className="site-hero__content">
            <p className="site-hero__tagline">{hero.tagline}</p>
            <h1 id="site-hero-title" className="site-hero__title">
              {hero.headline}
            </h1>
            <p className="site-hero__text">{hero.subtext}</p>
            <div className="site-hero__actions">
              <SiteButton href={hero.ctaHref}>{hero.ctaLabel}</SiteButton>
              <SiteButton variant="secondary" href={hero.secondaryHref}>
                {hero.secondaryLabel}
              </SiteButton>
            </div>
          </div>

          <div className="site-hero__visual-wrap">
            <div className="site-phone-mockup site-phone-mockup--hero">
              <div className="site-phone-mockup__notch" />
              <div className="site-phone-mockup__screen">
                {brandLogoUrl ? (
                  <img className="site-phone-mockup__logo" src={brandLogoUrl} alt="" />
                ) : null}
                <p className="site-phone-mockup__app-name">{hero.visualTitle}</p>
                <p className="site-phone-mockup__tagline">{hero.visualText}</p>
                <div className="site-phone-mockup__cards">
                  <span className="site-phone-mockup__mini-card" />
                  <span className="site-phone-mockup__mini-card site-phone-mockup__mini-card--accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
