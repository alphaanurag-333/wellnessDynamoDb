import appPreviewImage from "../images/irw-personalised-wellness-mobile-app.webp";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";

const APP_PREVIEW_ALT =
  "IRW personalised wellness mobile app for nutrition, activity and progress tracking";

export default function AppHeroSection() {
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
          <h2 id="app-hero-title" className="app-hero__title">
            Transform <em>Today.</em> Thrive <em className="is-blue">Tomorrow.</em>
          </h2>

          <p className="app-hero__sub">
            Your all-in-one companion for a healthier, stronger and happier you.
          </p>

          <p className="app-hero__body">
            Take your personalised wellness journey wherever you go with the IRW
            app—track your daily habits, nutrition, progress and wellness
            activities while staying connected with your IRW guidance and
            support.
          </p>

          <AppDownloadButtons tone="dark" appleFirst />
        </div>

        <div className="app-hero__visual">
          <img
            className="app-hero__image"
            src={appPreviewImage}
            alt={APP_PREVIEW_ALT}
            width={1024}
            height={1536}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
