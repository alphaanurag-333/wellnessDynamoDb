import React from "react";
import { Plus } from "lucide-react";
import { FiArrowRight } from "react-icons/fi";
import BMISection from "./BMISection";
import BMRCalculator from "./BMRCalculator";
import BodyFatCalculator from "./BodyFatCalculator";
import VisceralFatCalculator from "./VisceralFatCalculator";
import FinalCTA from "./FinalCTA";

const ResourcesSection = () => {
  const scrollToTools = () => {
    const el = document.getElementById("wellness-tools");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="wellness-toolkit wellnesspedia-page">
      <div className="resources-header pt-2 pb-0">
        <div className="site-container">
          <div className="wellness-toolkit__content" style={{maxWidth:"100%"}}>
            {/* <span className="wellness-toolkit__badge">
              CLINICALLY PROVEN TOOLS
            </span> */}

            <h2 className="wellness__title mb-0">
              Your Wellness <span>Toolkit</span>
            </h2>

            <p className="wellness-toolkit__description" style={{maxWidth:"100%"}}>
              Empowering your health journey with precision-engineered
              resources. Access our clinical calculators and expert-curated
              guides designed for your restorative sanctuary.
            </p>

            {/* <button
              type="button"
              className="wellness-toolkit__button"
              onClick={scrollToTools}
            >
              <span className="button-icon">
                <Plus size={14} strokeWidth={2.5} />
              </span>

              <span>Start Calculating</span>
            </button> */}
          </div>
        </div>

        <div className="wellness-toolkit__glow"></div>
      </div>

      <div id="wellness-tools" className="wellnesspedia-page__tools">
        <BMISection />
        {/* <HydrationGuide /> */}
        <BMRCalculator />
        <BodyFatCalculator />
        <VisceralFatCalculator />
      </div>

      {/* <section className="final-cta">
        <div className="final-cta__overlay"></div>

        <div className="final-cta__shape final-cta__shape--top"></div>
        <div className="final-cta__shape final-cta__shape--bottom"></div>

        <div className="site-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">
              Are you tired of facing your wellness journey alone?
            </h2>

            <p className="final-cta__description" style={{maxWidth:'100%', textAlign:'justify'}}>
              Discover a healthier, happier you with our vibrant wellness
              community. Connect, learn, and grow alongside like-minded
              individuals on your journey to well-being. Take the first step
              towards a balanced life – join us today and transform your
              tomorrow.
            </p>

            <button
              type="button"
              className="final-cta__button mt-0"
              onClick={() =>
                window.open(
                  "https://chat.whatsapp.com/Lcv5qyt7tvX6nrif7poqBB",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              JOIN IRW COMMUNITY
              <FiArrowRight />
            </button>
          </div>
        </div>
      </section> */}
   <FinalCTA/>
    </section>
  );
};

export default ResourcesSection;
