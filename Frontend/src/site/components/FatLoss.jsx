import React from "react";
import fatLossImg from "../../site/images/fat-loss.jpg"; // Change path

const FatLoss = () => {
  return (
    <section className="fat-loss-page">
      {/* Hero Section */}
      <section className="fat-hero">
        <div className="fat-hero-overlay"></div>

        <div className="container">
          <div className="fat-hero-content">
            <span className="fat-subtitle">INDIA REDEFINING WELLNESS</span>

            <h1 className="fat-title">✱ FAT LOSS</h1>

            <p className="fat-description">
              Achieve your ideal weight with our comprehensive fat loss program.
              We combine personalized nutrition plans, effective workouts, and
              ongoing support to help you lose fat and maintain a healthier
              lifestyle. Start your journey to a fitter, leaner you today!
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
                According to a recent study published in Lancet, India is among
                the top three most obese nations, with nearly 70% of the
                population being overweight.
              </p>

              <p>
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
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="obesity-section">
        <div className="container">
          <div className="obesity-card">
            <div className="obesity-heading">
              <span className="obesity-badge">WHY WEIGHT LOSS MATTERS</span>

              <h2>
                Did you know obesity increases your chance of being hospitalized
                by <span>6 times?</span>
              </h2>
            </div>

            <div className="obesity-content">
              <p>
                That's right. People with a <strong>weak immune system</strong>{" "}
                are at a much higher risk of developing Type 2 Diabetes, High
                Blood Pressure, Heart Disease, Liver Disease and even common
                viral infections.
              </p>

              <div className="hope-box">
                <h3>But don't worry! 💚</h3>

                <p>
                  There is still hope. With the right nutrition, personalized
                  guidance, exercise and healthy lifestyle changes, obesity can
                  be managed and reversed safely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      
    </section>
  );
};

export default FatLoss;
