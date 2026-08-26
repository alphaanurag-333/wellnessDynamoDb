import { FaFacebook, FaGoogle } from "react-icons/fa";
import { useSiteConfig } from "../../hooks/useSiteConfig.js";

function starsForRating(rating) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const filled = Math.round(value);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

const PLATFORM_ICON = {
  google: FaGoogle,
  facebook: FaFacebook,
};

export default function WellnesspediaCtaSection() {
  const { socialProof } = useSiteConfig();

  if (!socialProof?.length) return null;

  return (
    <section className="wp-section wp-lower-cta backgroundapply" aria-label="Social proof">
      <div className="site-container">
        <div className="wp-social-proof">
          {socialProof.map((card) => {
            const Icon = PLATFORM_ICON[card.platform] || FaGoogle;
            const body = (
              <>
                <strong className="wp-social-card__score">{card.score}</strong>
                {card.showStars ? (
                  <div className="wp-social-card__stars" aria-hidden>
                    {starsForRating(card.rating)}
                  </div>
                ) : null}
                <div className="wp-social-card__meta">
                  <Icon aria-hidden />
                  <span>{card.meta}</span>
                </div>
              </>
            );

            if (card.href) {
              return (
                <a
                  key={card.key}
                  className="wp-social-card"
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {body}
                </a>
              );
            }

            return (
              <article key={card.key} className="wp-social-card">
                {body}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
