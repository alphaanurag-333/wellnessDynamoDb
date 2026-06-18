import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteButton } from "./SiteButton.jsx";
import { SiteCard } from "./SiteCard.jsx";

function StatsStars({ rating }) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const roundHigh = value - full >= 0.75;
  const stars = [];

  for (let i = 0; i < full + (roundHigh ? 1 : 0); i += 1) {
    stars.push(<IoStar key={`f-${i}`} aria-hidden />);
  }
  if (hasHalf && !roundHigh) {
    stars.push(<IoStarHalf key="half" aria-hidden />);
  }
  const empty = 5 - stars.length;
  for (let i = 0; i < empty; i += 1) {
    stars.push(<IoStarOutline key={`e-${i}`} aria-hidden />);
  }

  return <div className="site-stats__stars">{stars}</div>;
}

export function StatsSection() {
  const { stats } = useSiteConfig();

  if (!stats.length) return null;

  return (
    <section className="site-section site-section--stats" aria-label="Platform highlights">
      <div className="site-container">
        <div className={`site-stats site-stats--${Math.min(stats.length, 4)}`}>
          {stats.map((card) => (
            <SiteCard key={card.key} className="site-stats__card site-stats__card--glow">
              <p className="site-stats__rating">{card.value}</p>
              {card.showStars ? <StatsStars rating={card.rating} /> : null}
              <p className="site-stats__label">{card.label}</p>
            </SiteCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChallengeBanner() {
  const { challenge } = useSiteConfig();

  return (
    <section className="site-section" aria-labelledby="challenge-title">
      <div className="site-container">
        <div className="site-challenge site-challenge--premium">
          <div>
            <h2 id="challenge-title" className="site-challenge__title">
              {challenge.title}
            </h2>
            <p className="site-challenge__text">{challenge.description}</p>
          </div>
          <div className="site-challenge__cta">
            <SiteButton variant="onGradient" href={challenge.ctaHref}>
              {challenge.ctaLabel}
            </SiteButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CommunitySection() {
  const { community, appName } = useSiteConfig();

  return (
    <section className="site-section site-section--muted site-community" aria-labelledby="community-title">
      <div className="site-container site-community__inner">
        <h2 id="community-title" className="site-heading site-heading--center">
          {appName} Community
        </h2>
        <p className="site-subtext site-subtext--center">{community.description}</p>
        <SiteButton href={community.ctaHref}>{community.ctaLabel}</SiteButton>
      </div>
    </section>
  );
}
