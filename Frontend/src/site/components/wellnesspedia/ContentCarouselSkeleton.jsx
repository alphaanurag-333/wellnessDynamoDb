export default function ContentCarouselSkeleton({ count = 2, variant = "recipe" }) {
  const cards = Array.from({ length: count }, (_, i) => i);
  return (
    <div
      className={`wp-carousel-skeleton wp-carousel-skeleton--${variant}`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="wp-visually-hidden">Loading…</span>
      <div className="wp-carousel-skeleton__track">
        {cards.map((i) => (
          <div key={i} className="wp-carousel-skeleton__card">
            <div className="wp-carousel-skeleton__media" />
            <div className="wp-carousel-skeleton__lines">
              <span className="wp-carousel-skeleton__line wp-carousel-skeleton__line--title" />
              <span className="wp-carousel-skeleton__line" />
              <span className="wp-carousel-skeleton__line wp-carousel-skeleton__line--short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
