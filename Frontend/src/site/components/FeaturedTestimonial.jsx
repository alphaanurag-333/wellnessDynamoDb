import { DEFAULT_IMAGE_SRC, handleMediaImageError } from "../../media.js";

export function FeaturedTestimonial({ testimonial }) {
  if (!testimonial) return null;

  const name = testimonial.name || "Community Member";
  const image = testimonial.profileImage || DEFAULT_IMAGE_SRC;
  const quote = String(testimonial.description || "").trim();

  return (
    <section className="site-featured" aria-label="Featured testimonial">
      <div className="site-container">
        <article className="site-featured__card">
          <span className="site-featured__quote-mark" aria-hidden>
            &ldquo;
          </span>
          <div className="site-featured__profile">
            <img
              className="site-featured__avatar"
              src={image}
              alt=""
              width={64}
              height={64}
              onError={handleMediaImageError}
            />
            <div>
              <h2 className="site-featured__name">{name}</h2>
              <p className="site-featured__role">Wellness Member</p>
            </div>
          </div>
          <p className="site-featured__text">{quote}</p>
        </article>
      </div>
    </section>
  );
}
