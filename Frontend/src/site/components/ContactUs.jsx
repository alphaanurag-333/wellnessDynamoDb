import React, { useState } from "react";
import FinalCTA from "./FinalCTA";

export default function ContactUsSection() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    inquiry: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(formData);

    // API Call Here
  };

  return (
    <section className="contact-section">
      <div className="contact-hero">
        <div className="contact-hero-content">
          <span className="contact-tag">CONTACT OUR TEAM</span>

          <h1 className="contact-title">
            Contact Our
            <span> Wellness Team</span>
          </h1>

          <p className="contact-description">
            Expert guidance for your wellness journey. Reach out to our
            specialists for personalized clinical support.
          </p>
        </div>
      </div>

      <div className="contact-card">
        <form onSubmit={handleSubmit}>
          {/* Row */}

          <div className="contact-row">
            <div className="contact-field">
              <label>First Name</label>

              <input
                type="text"
                name="firstName"
                placeholder="Jane"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>

            <div className="contact-field">
              <label>Last Name</label>

              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row */}

          <div className="contact-row">
            <div className="contact-field">
              <label>Email Address</label>

              <input
                type="email"
                name="email"
                placeholder="jane.doe@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="contact-field">
              <label>Phone Number</label>

              <input
                type="text"
                name="phone"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Inquiry */}

          <div className="contact-field contact-full">
            <label>Inquiry Type</label>

            <select
              name="inquiry"
              value={formData.inquiry}
              onChange={handleChange}
            >
              <option value="">Select an option...</option>

              <option value="consultation">Book Consultation</option>

              <option value="program">Health Program</option>

              <option value="appointment">Appointment</option>

              <option value="general">General Inquiry</option>
            </select>
          </div>

          {/* Message */}

          <div className="contact-field contact-full">
            <label>Your Message</label>

            <textarea
              name="message"
              placeholder="Please tell us a little about your health goals and how we can help..."
              value={formData.message}
              onChange={handleChange}
            ></textarea>
          </div>

          {/* Footer */}

          <div className="contact-footer">
            <button type="submit">Send Secure Message</button>

            <p>
              We respect your privacy. Your information is confidential and will
              never be shared.
            </p>
          </div>
        </form>
      </div>
      <FinalCTA/>
    </section>
  );
}
