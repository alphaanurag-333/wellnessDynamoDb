import React, { useState } from "react";
import { Country } from "country-state-city";
import FinalCTA from "./FinalCTA";
import { submitContactInquiry } from "../api/publicMisc.js";
import ContactCountryDialSelect from "./ContactCountryDialSelect.jsx";
import {
  DEFAULT_ISO,
  FIELD_LIMITS,
  INITIAL_CONTACT_FORM,
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  dialCodeFromPhonecode,
  firstContactFormError,
  isIndiaDial,
  sanitizeContactEmail,
  sanitizeContactName,
  sanitizeContactPhone,
  validateContactForm,
} from "./contactFormShared.js";

function FieldHint({ id, error, hint, counter }) {
  if (error) {
    return (
      <p id={id} className="contact-field-error" role="alert">
        {error}
      </p>
    );
  }
  if (counter) {
    return (
      <p id={id} className="contact-field-meta">
        {counter}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="contact-field-hint">
        {hint}
      </p>
    );
  }
  return null;
}

export default function ContactUsSection() {
  const [formData, setFormData] = useState(INITIAL_CONTACT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFeedback(null);
    clearFieldError(name);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFirstNameChange = (e) => {
    setFeedback(null);
    clearFieldError("firstName");
    setFormData((prev) => ({
      ...prev,
      firstName: sanitizeContactName(e.target.value, FIELD_LIMITS.firstName),
    }));
  };

  const handleLastNameChange = (e) => {
    setFeedback(null);
    clearFieldError("lastName");
    setFormData((prev) => ({
      ...prev,
      lastName: sanitizeContactName(e.target.value, FIELD_LIMITS.lastName),
    }));
  };

  const handleEmailChange = (e) => {
    setFeedback(null);
    clearFieldError("email");
    setFormData((prev) => ({
      ...prev,
      email: sanitizeContactEmail(e.target.value),
    }));
  };

  const handlePhoneChange = (e) => {
    setFeedback(null);
    clearFieldError("phone");
    setFormData((prev) => ({
      ...prev,
      phone: sanitizeContactPhone(e.target.value, prev.phoneCountryCode),
    }));
  };

  const handlePhoneCountryChange = (iso) => {
    const countryIso = iso || DEFAULT_ISO;
    const country = Country.getCountryByCode(countryIso);
    setFeedback(null);
    clearFieldError("phone");
    setFormData((prev) => ({
      ...prev,
      phoneCountryIso: countryIso,
      phoneCountryCode: country ? dialCodeFromPhonecode(country.phonecode) : prev.phoneCountryCode,
      phone: sanitizeContactPhone(prev.phone, country ? dialCodeFromPhonecode(country.phonecode) : prev.phoneCountryCode),
    }));
  };

  const handleMessageChange = (e) => {
    setFeedback(null);
    clearFieldError("message");
    const message = String(e.target.value ?? "").slice(0, FIELD_LIMITS.message);
    setFormData((prev) => ({ ...prev, message }));
  };

  const handlePhoneKeyDown = (e) => {
    if (isIndiaDial(formData.phoneCountryCode)) {
      blockIndianMobileFirstDigitKeyDown(e);
    } else {
      blockPhoneNonDigitKeyDown(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const errors = validateContactForm(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFeedback({ type: "error", text: firstContactFormError(errors) });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await submitContactInquiry({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneCountryCode: formData.phoneCountryCode,
        phone: formData.phone.trim(),
        inquiryType: formData.inquiry,
        message: formData.message.trim(),
      });
      setFormData(INITIAL_CONTACT_FORM);
      setFeedback({
        type: "success",
        text: result?.message || "Thank you! Our team will get back to you soon.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.message || "Unable to send your message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const phoneHint = isIndiaDial(formData.phoneCountryCode)
    ? "10-digit, starts with 6–9"
    : "4–15 digits, no country code";

  const phonePlaceholder = isIndiaDial(formData.phoneCountryCode) ? "9876543210" : "Phone number";

  return (
    <section className="wellness-toolkit wellnesspedia-page contact-section">
      <div className="contact-hero pt-3 pb-0" style={{minHeight:'auto'}}>
        <div className="contact-hero-content" style={{width:'100%',height:'auto'}}>
          {/* <span className="contact-tag">CONTACT OUR TEAM</span> */}

          <h1 className="wellness__title ">
            Contact Our
            <span> Wellness Team</span>
          </h1>

          <p className="contact-description" style={{maxWidth:'99%'}}>
            Expert guidance for your wellness journey. Reach out to our
            specialists for personalized clinical support.
          </p>
        </div>
      </div>

      <div className="contact-card mt-3 mb-3">
        <form onSubmit={handleSubmit} noValidate>
          {feedback ? (
            <div
              className={`contact-form-feedback contact-form-feedback--${feedback.type}`}
              role={feedback.type === "error" ? "alert" : "status"}
            >
              {feedback.text}
            </div>
          ) : null}

          <div className="contact-row">
            <div className={`contact-field${fieldErrors.firstName ? " contact-field--invalid" : ""}`}>
              <label htmlFor="contact-firstName">
                First Name
                <span className="contact-field-limit">{formData.firstName.length}/{FIELD_LIMITS.firstName}</span>
              </label>
              <input
                id="contact-firstName"
                type="text"
                name="firstName"
                placeholder="Jane"
                value={formData.firstName}
                onChange={handleFirstNameChange}
                onKeyDown={blockPersonNameDigitKeyDown}
                maxLength={FIELD_LIMITS.firstName}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? "contact-firstName-error" : undefined}
              />
              <FieldHint id="contact-firstName-error" error={fieldErrors.firstName} />
            </div>

            <div className={`contact-field${fieldErrors.lastName ? " contact-field--invalid" : ""}`}>
              <label htmlFor="contact-lastName">
                Last Name
                <span className="contact-field-limit">{formData.lastName.length}/{FIELD_LIMITS.lastName}</span>
              </label>
              <input
                id="contact-lastName"
                type="text"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleLastNameChange}
                onKeyDown={blockPersonNameDigitKeyDown}
                maxLength={FIELD_LIMITS.lastName}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? "contact-lastName-error" : undefined}
              />
              <FieldHint id="contact-lastName-error" error={fieldErrors.lastName} />
            </div>
          </div>

          <div className="contact-row contact-row--split">
            <div className={`contact-field${fieldErrors.email ? " contact-field--invalid" : ""}`}>
              <label htmlFor="contact-email">
                Email Address
                <span className="contact-field-limit">{formData.email.length}/{FIELD_LIMITS.email}</span>
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                placeholder="jane.doe@example.com"
                value={formData.email}
                onChange={handleEmailChange}
                maxLength={FIELD_LIMITS.email}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
              />
              <FieldHint id="contact-email-error" error={fieldErrors.email} />
            </div>

            <div className={`contact-field${fieldErrors.phone ? " contact-field--invalid" : ""}`}>
              <label htmlFor="contact-phone">Phone Number</label>
              <div className="contact-phone-row">
                <ContactCountryDialSelect
                  id="contact-phone-country"
                  value={formData.phoneCountryIso}
                  onChange={handlePhoneCountryChange}
                  disabled={submitting}
                  ariaLabel="Country code"
                />
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  className="contact-phone-input"
                  placeholder={phonePlaceholder}
                  title={phoneHint}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text");
                    handlePhoneChange({ target: { name: "phone", value: text } });
                  }}
                  inputMode="numeric"
                  maxLength={isIndiaDial(formData.phoneCountryCode) ? FIELD_LIMITS.phoneNationalIndia : FIELD_LIMITS.phoneNational}
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "contact-phone-help" : undefined}
                  autoComplete="tel-national"
                />
              </div>
              <FieldHint id="contact-phone-help" error={fieldErrors.phone} />
            </div>
          </div>

          <div className={`contact-field contact-full${fieldErrors.inquiry ? " contact-field--invalid" : ""}`}>
            <label htmlFor="contact-inquiry">Enquiry Type</label>
            <select
              id="contact-inquiry"
              name="inquiry"
              value={formData.inquiry}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.inquiry)}
              aria-describedby={fieldErrors.inquiry ? "contact-inquiry-error" : undefined}
            >
              <option value="">Select an option...</option>
              <option value="consultation">Book Consultation</option>
              <option value="program">Health Program</option>
              <option value="appointment">Appointment</option>
              <option value="general">General Enquiry</option>
            </select>
            <FieldHint id="contact-inquiry-error" error={fieldErrors.inquiry} />
          </div>

          <div className={`contact-field contact-full${fieldErrors.message ? " contact-field--invalid" : ""}`}>
            <label htmlFor="contact-message">
              Your Message
              <span className="contact-field-limit">{formData.message.length}/{FIELD_LIMITS.message}</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Please tell us a little about your health goals and how we can help..."
              value={formData.message}
              onChange={handleMessageChange}
              maxLength={FIELD_LIMITS.message}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? "contact-message-error" : "contact-message-meta"}
            />
            <FieldHint id={fieldErrors.message ? "contact-message-error" : undefined} error={fieldErrors.message} />
          </div>

          <div className="contact-footer">
            <button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send Secure Message"}
            </button>

            <p>
              We respect your privacy. Your information is confidential and will
              never be shared.
            </p>
          </div>
        </form>
      </div>
      <FinalCTA />
    </section>
  );
}
