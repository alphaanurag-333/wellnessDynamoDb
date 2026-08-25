import { FaFacebook, FaGoogle } from "react-icons/fa";

export default function WellnesspediaCtaSection() {
  return (
    <section className="wp-section wp-lower-cta" aria-label="Social proof">
      <div className="site-container">
        <div className="wp-social-proof">
          <article className="wp-social-card">
            <strong className="wp-social-card__score">4.9</strong>
            <div className="wp-social-card__stars" aria-hidden>
              {"★★★★★"}
            </div>
            <div className="wp-social-card__meta">
              <FaGoogle aria-hidden />
              <span>500+ Reviews</span>
            </div>
          </article>
          <article className="wp-social-card">
            <strong className="wp-social-card__score">4.8</strong>
            <div className="wp-social-card__stars" aria-hidden>
              {"★★★★★"}
            </div>
            <div className="wp-social-card__meta">
              <FaFacebook aria-hidden />
              <span>1.2K Followers</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
