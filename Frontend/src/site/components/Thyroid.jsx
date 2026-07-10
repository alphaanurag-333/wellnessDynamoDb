import React from "react";
import fatLossImg from "../../site/images/thyroid-banner.png"; // Change path
import ProgramTestimonialsSection from "./ProgramTestimonialsSection";

const Thyroid = () => {
  return (
    <section className="fat-loss-page">
      {/* Hero Section */}
      <section className="fat-hero">
        <div className="fat-hero-overlay"></div>

        <div className="container">
          <div className="fat-hero-content">
            <span className="fat-subtitle">INDIA REDEFINING WELLNESS</span>

            <h1 className="fat-title">✱ Thyroid Care</h1>

            <p className="fat-description">
             Our Thyroid Care program focuses on restoring balance and optimizing thyroid function. Through customized nutrition, targeted exercise, and expert medical guidance, we address hypothyroidism and hyperthyroidism symptoms. Achieve better health and vitality with our comprehensive thyroid care solutions.
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
              Nearly every third Indian suffers from a thyroid disorder (Source: Economic Times)

When the thyroid gland malfunctions, it can lead to either hypothyroidism or hyperthyroidism.

This condition is not just limited to the under or over activity of thyroid gland rather dives deep into a combination of hormonal imbalances, gut health, nutritional deficiencies and various other underlying reasons. 

When it comes to thyroid reversal, we focus on identifying and addressing all these underlying reasons in the body that may be contributing to thyroid dysfunction, strategies to support thyroid health, and lifestyle changes that can make a significant impact.

We understand that each individual’s journey to thyroid reversal is unique. Our team of experts is committed to providing personalized guidance, support, and resources every step of the way. Whether you’re newly diagnosed with a thyroid condition or seeking alternative approaches to conventional treatment, we’re here to support you on your path to optimal health and well-being.
              </p>

              {/* <p>
                There are various reasons for obesity including energy
                imbalance, hormonal imbalance, persistent stress, nutritional
                deficiency, and inadequate sleep quality.
              </p>

              <p>
                We understand that every person is unique and there is no
                one-size-fits-all solution for fat loss. That's why we offer
                personalized programs tailored to individual needs, preferences,
                and health conditions.
              </p>

              <p>
                Our certified wellness coaches work closely with every client to
                create comprehensive plans covering nutrition, exercise, stress
                management, lifestyle correction, and long-term health.
              </p> */}
            </div>
          </div>
        </div>
      </section>

      <ProgramTestimonialsSection type="thyroid_care" />
      
    </section>
  );
};

export default Thyroid;
