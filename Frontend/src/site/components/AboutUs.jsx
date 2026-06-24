import { FiBookOpen } from "react-icons/fi";

import aboutOne from "../images/about-one.png";
import aboutTwo from "../images/about-two.png";
import aboutThree from "../images/about-three.jpg";
import aboutFour from "../images/about-four.png";

export default function AboutUs() {
  return (
    <section className="about-section">
      <div className="site-container">
        <div className="about-wrapper">
          <div className="about-content">
            <div className="about-us__badge">ABOUT US</div>

            <h2 className="about-title">
              Welcome to India
              <br />
              Redefining Wellness!
            </h2>

            <p className="about-description">
              Welcome to India Redefining Wellness, your trusted partner in
              holistic health and wellness transformation. At India Redefining
              Wellness, we specialize in personalized holistic solutions aimed
              at addressing a wide range of health concerns, including
              personalized holistic fat loss, lifestyle disorders reversal like
              Diabetes, Hypo & Hyper Thyroid, PCOD/PCOS, Gut Health, and
              Autoimmune Disorders.
            </p>

            <button className="about-btn">
              Read All Stories
              <FiBookOpen />
            </button>
          </div>

          <div className="about-gallery">
            <div className="about-gallery-left">
              <div className="about-card about-card--large">
                <img src={aboutOne} alt="Running" />
              </div>

              <div className="about-card about-card--small">
                <img src={aboutThree} alt="Yoga" />
              </div>
            </div>

            <div className="about-gallery-right">
              <div className="about-card about-card--top">
                <img src={aboutTwo} alt="Healthy Food" />
              </div>

              <div className="about-card about-card--bottom">
                <img src={aboutFour} alt="Meditation" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
