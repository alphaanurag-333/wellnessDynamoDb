import React from "react";
import fatLossImg from "../../site/images/fat-loss.jpg"; // Change path

const Diabetes = () => {
  return (
    <section className="fat-loss-page">
      {/* Hero Section */}
      <section className="fat-hero">
        <div className="fat-hero-overlay"></div>

        <div className="container">
          <div className="fat-hero-content">
            <span className="fat-subtitle">INDIA REDEFINING WELLNESS</span>

            <h1 className="fat-title">✱ DIABETES REVERSAL</h1>

            <p className="fat-description">
             Our Diabetes Reversal program is designed to help you take control of your health. Through personalized nutrition, targeted exercise, and expert guidance, we aim to reduce your dependence on medication and improve your overall well-being. Empower yourself to live a healthier, diabetes-free life!
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
               An ICMR study says India has over 100 mn diabetics & 136 mn pre-diabetics (Source: Economic Times).

There are 4 types of diabetes and predominantly people are suffering with Type 2 diabetes, which is the root cause of Insulin resistance. 

Our approach goes beyond simply managing symptoms; we address the underlying imbalances and root causes of diabetes to promote healing and restoration. Through a combination of personalized nutrition plans, targeted lifestyle interventions, and evidence-based holistic therapies, we help our clients optimize blood sugar levels, improve insulin sensitivity, and reduce dependence on medication.

We are dedicated to revolutionizing the approach to managing and even reversing diabetes through a holistic and personalized approach. Our mission is to empower individuals with diabetes to take control of their health and achieve lasting wellness.

*Only Type 2 diabetes will be considered for the program
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

     
      
    </section>
  );
};

export default Diabetes;
