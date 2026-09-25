const COMMUNITY_LINK = "https://chat.whatsapp.com/Lcv5qyt7tvX6nrif7poqBB";

export default function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="final-cta__overlay"></div>

      <div className="final-cta__shape final-cta__shape--top"></div>
      <div className="final-cta__shape final-cta__shape--bottom"></div>

      <div className="site-container">
        <div className="final-cta__content">
          <h2 className="final-cta__title contentsizes">
            Better Wellness Is Easier with the Right Support
          </h2>

          <p className="final-cta__description custimesmainsixe">
            Connect with a supportive wellness community where learning,
            motivation and shared experiences help you stay consistent with
            healthier choices. At IRW, you don't just receive guidance—you
            become part of a community committed to sustainable wellbeing.
          </p>

          <button
            type="button"
            className="final-cta__button mt-3 mb-0"
            onClick={() =>
              window.open(COMMUNITY_LINK, "_blank", "noopener,noreferrer")
            }
          >
            Join the IRW Community
          </button>
        </div>
      </div>
    </section>
  );
}
