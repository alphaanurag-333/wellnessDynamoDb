import React from "react";
import fatLossImg from "../../site/images/pcod-banner.png"; // Change path
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";

const Pcod = () => {
  return (
    <section className="fat-loss-page">
      {/* Hero Section */}
      <section className="fat-hero">
        <div className="fat-hero-overlay"></div>

        <div className="container">
          <div className="fat-hero-content">
            <span className="fat-subtitle">INDIA REDEFINING WELLNESS</span>

            <h1 className="fat-title">✱ PCOD & PCOS</h1>

            <p className="fat-description">
              Our PCOD/PCOS program offers a holistic approach to managing and overcoming Polycystic Ovary Syndrome. With personalized nutrition plans, tailored exercise routines, and hormonal balance strategies, we aim to alleviate symptoms and enhance your overall health. Take charge of your wellness journey and find relief from PCOD/PCOS today!
            </p>
          </div>
        </div>

        <div className="zigzag"></div>
      </section>

      {/* About Section */}

      <section className="fat-about">
        <div className="container">
          <div className="fat-about-wrapper">
            <div className="fat-image">
              <img src={fatLossImg} alt="Fat Loss" />
            </div>

            <div className="fat-content">
              <p>
               According to a recent study, ‘One in five women suffers from PCOD in India’ (Source Indian Express)
              </p>

              <p>
                Both PCOD & PCOS are different despite having similarities like being related to the ovaries and causing hormonal disturbances.
              </p>

              <p>
                We recognize that PCOD/PCOS is a complex hormonal disorder with far-reaching effects on physical, emotional, and reproductive health. That’s why we take a comprehensive approach to its reversal addressing the underlying imbalances that contribute to the condition.
              </p>

              <p>
                With us, you can expect more than just symptom management, it will be a transformative journey towards greater health, vitality, and well-being. Whether you’re struggling with irregular periods, infertility, weight gain, or other symptoms of PCOD/ PCOS, we are here to help you reversing the condition and live your best life.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ProgramTestimonialsSection type="pcod_pcos_reversal" />

      
    </section>
  );
};

export default Pcod;
