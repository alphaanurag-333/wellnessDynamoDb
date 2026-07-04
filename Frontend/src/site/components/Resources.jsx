import React from "react";
import { Plus } from "lucide-react";
import BMISection from "./BMISection";
import HydrationGuide from "./HydrationGuide";
import BMRCalculator from "./BMRCalculator";
import BodyFatCalculator from "./BodyFatCalculator";
import VisceralFatCalculator from "./VisceralFatCalculator";

const ResourcesSection = () => {
  return (
    <section className="wellness-toolkit">
      <div className="resources-header">
        <div className="site-container">
          <div className="wellness-toolkit__content">
            <span className="wellness-toolkit__badge">
              CLINICALLY PROVEN TOOLS
            </span>

            <h2 className="wellness-toolkit__title">
              Your Wellness <span>Toolkit</span>
            </h2>

            <p className="wellness-toolkit__description">
              Empowering your health journey with precision-engineered
              resources. Access our clinical calculators and expert-curated
              guides designed for your restorative sanctuary.
            </p>

            <button className="wellness-toolkit__button">
              <span className="button-icon">
                <Plus size={14} strokeWidth={2.5} />
              </span>

              <span>Start Calculating</span>
            </button>
          </div>
        </div>

        <div className="wellness-toolkit__glow"></div>
      </div>

      <BMISection />
      {/* <HydrationGuide /> */}
      <BMRCalculator />
      <BodyFatCalculator />
      <VisceralFatCalculator /> 
      <section className="final-cta">
        <div className="final-cta__overlay"></div>

        <div className="final-cta__shape final-cta__shape--top"></div>
        <div className="final-cta__shape final-cta__shape--bottom"></div>

        <div className="site-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">
              Are you tired of facing your wellness journey alone?
            </h2>

            <p className="final-cta__description">
              Discover a healthier, happier you with our vibrant wellness
              community. Connect, learn, and grow alongside like-minded
              individuals on your journey to well-being. Take the first step
              towards a balanced life – join us today and transform your
              tomorrow.
            </p>

            <button className="final-cta__button">
              Book Your Free Consultation
            </button>
          </div>
        </div>
      </section>
    </section>
  );
};

export default ResourcesSection;
