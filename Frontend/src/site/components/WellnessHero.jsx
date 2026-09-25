import React from "react";
import { FiArrowRight, FiAward } from "react-icons/fi";
import { BookConsultationButton } from "./AppDownloadModalContext.jsx";

// import heroImage from "../assets/wellness-room.jpg";
import heroImage from "../images/Exercise.jpg";

export default function WellnessHero() {
  return (
    <section className="wellness-hero">
      <div className="wellness-hero__container">
        <div className="wellness-hero__content">
          {/* <div className="wellness-hero__badge">
            Welcome to India Redefining Wellness!
          </div> */}

          <h1 className="wellness-hero__title">
            Improving Health. <span>Inspiring</span> Healthy Living.
          </h1>

          <div className="wellness-hero__visual improvingimg">
            <div className="wellness-hero__image-wrapper">
              <img
                src={heroImage}
                alt="Wellness Clinic"
                className="wellness-hero__image"
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
              />

              <div className="wellness-hero__stat-card">
                <div className="wellness-hero__stat-icon">
                  <FiAward />
                </div>

                <div>
                  <h4>5,000+</h4>
                  <p>Lives transformed through our personalized programs.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="wellness-hero__description">
            <p>
              At <strong>India Redefining Wellness</strong>, we believe lasting health begins with understanding the individual—not simply managing isolated symptoms. Our <strong>personalised health and wellness approach</strong> combines functional nutrition, lifestyle assessment and root-cause understanding to explore how <strong>nutrition, metabolism, gut health, movement, sleep, stress and emotional wellbeing</strong> influence overall health.
            </p>
            <p>
              Through <strong>personalised nutrition, functional wellness strategies and dedicated 1:1 guidance</strong>, we support individuals working towards healthy weight management, better metabolic health and sustainable lifestyle improvement. Our holistic approach is especially relevant for people seeking support with concerns such as <strong>Obesity, Diabetes, PMOS (formerly PCOS/PCOD) , Thyroid health, Digestive Wellbeing and Metabolic Imbalance.</strong>
            </p>
            <p>
              Our purpose is to make healthier living <strong>practical, personalised and sustainable</strong>—empowering people to take greater ownership of their wellbeing, improve quality of life and work towards healthier, longer lives, with reduced dependence on medication wherever medically appropriate.
            </p>
          </div>

          <div className="wellness-hero__actions">
            <BookConsultationButton className="wellness-btn wellness-btn--primary">
              Book a consultation
              <FiArrowRight />
            </BookConsultationButton>
          </div>
        </div>

        <div className="wellness-hero__visual improvingimgs">
          <div className="wellness-hero__image-wrapper">
            <img
              src={heroImage}
              alt="Wellness Clinic"
              className="wellness-hero__image"
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
            />

            <div className="wellness-hero__stat-card">
              <div className="wellness-hero__stat-icon">
                <FiAward />
              </div>

              <div>
                <h4>5,000+</h4>
                <p>Lives transformed through our personalized programs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
