import React, { useEffect, useState } from "react";
import { Country } from "country-state-city";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import FinalCTA from "./FinalCTA";
import { fetchStaticPageBySlug, splitHtmlSections, submitContactInquiry } from "../api/publicMisc.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
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

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function isEmailDetail(label, value) {
  return /email|mail/i.test(String(label || "")) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isPhoneDetail(label) {
  return /phone|mobile|whatsapp|tel/i.test(String(label || ""));
}

function detailHref(label, value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (isEmailDetail(label, text)) return { href: `mailto:${text}` };
  if (isPhoneDetail(label)) {
    const digits = text.replace(/[^\d+]/g, "");
    if (!digits) return null;
    if (/whatsapp/i.test(String(label || ""))) {
      return { href: `https://wa.me/${digits.replace(/^\+/, "")}`, external: true };
    }
    return { href: `tel:${digits}` };
  }
  return null;
}

function DetailIcon({ label, value }) {
  if (isEmailDetail(label, value)) return <Mail size={18} />;
  if (isPhoneDetail(label)) return <Phone size={18} />;
  return <MapPin size={18} />;
}

export default function ContactUsSection() {
  const { contact } = useSiteConfig();
  const [formData, setFormData] = useState(INITIAL_CONTACT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [page, setPage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchStaticPageBySlug("contact-us")
      .then((data) => {
        if (!cancelled) setPage(data?.page || null);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      phoneCountryCode: country
        ? dialCodeFromPhonecode(country.phonecode)
        : prev.phoneCountryCode,
      phone: sanitizeContactPhone(
        prev.phone,
        country
          ? dialCodeFromPhonecode(country.phonecode)
          : prev.phoneCountryCode,
      ),
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
        text:
          result?.message || "Thank you! Our team will get back to you soon.",
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

  const phonePlaceholder = isIndiaDial(formData.phoneCountryCode)
    ? "9876543210"
    : "Phone number";

  const locations = (contact.locations || []).filter((row) => String(row.address || "").trim());
  const details = (contact.details || []).filter((row) => String(row.value || "").trim());
  const hasContactDetails = Boolean(locations.length || details.length);
  const { introHtml, sections: replySections } = splitHtmlSections(page?.content);

  return (
    <section className="wellness-toolkit wellnesspedia-page contact-section">
      {/* <div className=" contact-hero pt-3 pb-0" style={{ minHeight: "auto" }}>
        <div
          className="contact-hero-content"
          style={{ width: "100%", height: "auto" }}
        >
          

          <h1 className="wellness__title ">
            Contact Our
            <span> Wellness Team</span>
          </h1>

          <p className="contact-description" style={{ maxWidth: "99%" }}>
            Expert guidance for your wellness journey. Reach out to our
            specialists for personalized clinical support.
          </p>
        </div>
      </div> */}

      <div className="site-container">
        <div className="wellness-toolkit__content pt-2 contact-intro">
          <h2 className="wellness__title mb-0">
            {page?.title || (
              <>
                {/* Contact Our
                <span> Wellness Team</span> */}
              </>
            )}
          </h2>
          {introHtml ? (
            <div
              className="wellness-toolkit__description static-page-content"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          ) : page?.content ? null : (
            <p className="wellness-toolkit__description">
              {/* Expert guidance for your wellness journey. Reach out to our
              specialists for personalized clinical support. */}
            </p>
          )}
        </div>

        {replySections.length ? (
          <div className="contact-reply-list">
            {replySections.map((section, index) => (
              <aside key={`${section.title || "reply"}-${index}`} className="contact-reply">
                <span className="contact-reply__icon" aria-hidden="true">
                  <Clock size={18} strokeWidth={2} />
                </span>
                <div className="contact-reply__copy">
                  {section.title ? (
                    <h3 className="contact-reply__title">{section.title}</h3>
                  ) : null}
                  {section.html ? (
                    <div
                      className="contact-reply__body static-page-content"
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                  ) : null}
                </div>
              </aside>
            ))}
          </div>
        ) : null}

        <div className={`contact-layout${hasContactDetails ? "" : " contact-layout--form-only"}`}>
          {hasContactDetails ? (
          <aside className="contact-card contact-card--details">
            <h3 className="contact-office__heading">Get in touch</h3>
            <div className="contact-office" aria-label="Contact details">
              {locations.map((location) => (
                <a
                  key={location.id}
                  className="contact-office__row"
                  href={mapsUrl(location.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="contact-office__icon" aria-hidden="true">
                    <MapPin size={18} />
                  </span>
                  <span>
                    {location.name ? <strong>{location.name}</strong> : null}
                    <em>{location.address}</em>
                  </span>
                </a>
              ))}
              {details.map((row) => {
                const link = detailHref(row.label, row.value);
                const content = (
                  <>
                    <span className="contact-office__icon" aria-hidden="true">
                      <DetailIcon label={row.label} value={row.value} />
                    </span>
                    <span>
                      {row.label ? <strong>{row.label}</strong> : null}
                      <em>{row.value}</em>
                    </span>
                  </>
                );
                if (link?.href) {
                  return (
                    <a
                      key={row.id}
                      className="contact-office__row"
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <div key={row.id} className="contact-office__row contact-office__row--static">
                    {content}
                  </div>
                );
              })}
            </div>
          </aside>
          ) : null}

          <div className="contact-card contact-card--form">
            <h3 className="contact-office__heading">Send a message</h3>
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
            <div
              className={`contact-field${fieldErrors.firstName ? " contact-field--invalid" : ""}`}
            >
              <label htmlFor="contact-firstName">
                First Name
                {/* <span className="contact-field-limit">{formData.firstName.length}/{FIELD_LIMITS.firstName}</span> */}
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
                aria-describedby={
                  fieldErrors.firstName ? "contact-firstName-error" : undefined
                }
              />
              <FieldHint
                id="contact-firstName-error"
                error={fieldErrors.firstName}
              />
            </div>

            <div
              className={`contact-field${fieldErrors.lastName ? " contact-field--invalid" : ""}`}
            >
              <label htmlFor="contact-lastName">
                Last Name
                {/* <span className="contact-field-limit">{formData.lastName.length}/{FIELD_LIMITS.lastName}</span> */}
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
                aria-describedby={
                  fieldErrors.lastName ? "contact-lastName-error" : undefined
                }
              />
              <FieldHint
                id="contact-lastName-error"
                error={fieldErrors.lastName}
              />
            </div>
          </div>

          <div className="contact-row contact-row--split">
            <div
              className={`contact-field${fieldErrors.email ? " contact-field--invalid" : ""}`}
            >
              <label htmlFor="contact-email">
                Email Address
                {/* <span className="contact-field-limit">{formData.email.length}/{FIELD_LIMITS.email}</span> */}
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
                aria-describedby={
                  fieldErrors.email ? "contact-email-error" : undefined
                }
              />
              <FieldHint id="contact-email-error" error={fieldErrors.email} />
            </div>

            <div
              className={`contact-field${fieldErrors.phone ? " contact-field--invalid" : ""}`}
            >
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
                    handlePhoneChange({
                      target: { name: "phone", value: text },
                    });
                  }}
                  inputMode="numeric"
                  maxLength={
                    isIndiaDial(formData.phoneCountryCode)
                      ? FIELD_LIMITS.phoneNationalIndia
                      : FIELD_LIMITS.phoneNational
                  }
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone ? "contact-phone-help" : undefined
                  }
                  autoComplete="tel-national"
                />
              </div>
              <FieldHint id="contact-phone-help" error={fieldErrors.phone} />
            </div>
          </div>

          <div
            className={`contact-field contact-full${fieldErrors.inquiry ? " contact-field--invalid" : ""}`}
          >
            <label htmlFor="contact-inquiry">Enquiry Type</label>
            <select
              id="contact-inquiry"
              name="inquiry"
              value={formData.inquiry}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.inquiry)}
              aria-describedby={
                fieldErrors.inquiry ? "contact-inquiry-error" : undefined
              }
            >
              <option value="">Select an option...</option>
              <option value="consultation">Book Consultation</option>
              <option value="program">Health Program</option>
              <option value="appointment">Appointment</option>
              <option value="general">General Enquiry</option>
            </select>
            <FieldHint id="contact-inquiry-error" error={fieldErrors.inquiry} />
          </div>

          <div
            className={`contact-field contact-full${fieldErrors.message ? " contact-field--invalid" : ""}`}
          >
            <label htmlFor="contact-message">
              Your Message
              {/* <span className="contact-field-limit">{formData.message.length}/{FIELD_LIMITS.message}</span> */}
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
              aria-describedby={
                fieldErrors.message
                  ? "contact-message-error"
                  : "contact-message-meta"
              }
            />
            <FieldHint
              id={fieldErrors.message ? "contact-message-error" : undefined}
              error={fieldErrors.message}
            />
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
        </div>
      </div>
      <FinalCTA />
    </section>
  );
}
