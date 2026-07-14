export default function FinalCTA() {
  return (    <section className="final-cta">
      <div className="final-cta__overlay"></div>

      <div className="final-cta__shape final-cta__shape--top"></div>
      <div className="final-cta__shape final-cta__shape--bottom"></div>

      <div className="site-container">
        <div className="final-cta__content">
          <h2 className="final-cta__title">
            Ready to rediscover your
            <br />
            health?
          </h2>

          <p className="final-cta__description">
            Schedule your free 20-minute discovery call today and start your
            journey towards lasting vitality.
          </p>

          <button
            type="button"
            className="final-cta__button"
            onClick={() =>
              window.open("https://wa.me/919372109740", "_blank", "noopener,noreferrer")
            }
          >
            JOIN IRW WELLNESS COMMUNITY
          </button>        </div>
      </div>
    </section>
  );
}
