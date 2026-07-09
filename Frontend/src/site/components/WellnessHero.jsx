import React from "react";
import { FiArrowRight, FiAward } from "react-icons/fi";

// import heroImage from "../assets/wellness-room.jpg";
import heroImage from "../images/Exercise.jpg";

export default function WellnessHero() {
  return (
    <section className="wellness-hero">
      <div className="wellness-hero__container">
        <div className="wellness-hero__content">
          <div className="wellness-hero__badge">
            Welcome to India Redefining Wellness!
          </div>

          <h1 className="wellness-hero__title">
            Improving health by<span> Inspiring </span>
            healthy <br />
            living.
          </h1>

          <p className="wellness-hero__description">
            At India Redefining Wellness, we’re dedicated to improving health by
            inspiring healthy living. Our mission is to empower individuals to
            take charge of their well-being through holistic approaches that
            prioritize physical, mental, and emotional wellness. By offering
            personalized programs and guidance, we strive to inspire positive
            lifestyle changes that promote disease & medicine free life along
            with longevity and vitality. <br/><br/>
            Through our commitment to redefining wellness, we aim to create a community where individuals are motivated to make sustainable choices that enhance their overall health and quality of life. Join us on this journey to embrace healthy living and unlock your full potential at India Redefining Wellness.
          </p>
    

          <div className="wellness-hero__actions">
            <button
              type="button"
              className="wellness-btn wellness-btn--primary"
              onClick={() =>
                window.open("https://wa.me/919372109740", "_blank", "noopener,noreferrer")
              }
            >
              Book a consultation
              <FiArrowRight />
            </button>

            {/* <button className="wellness-btn wellness-btn--secondary">
              Explore Our Services
            </button> */}
          </div>
        </div>

        <div className="wellness-hero__visual">
          <div className="wellness-hero__image-wrapper">
            <img
              src={heroImage}
              alt="Wellness Clinic"
              className="wellness-hero__image"
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
