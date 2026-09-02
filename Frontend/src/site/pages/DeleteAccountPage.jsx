import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Country } from "country-state-city";
import FinalCTA from "../components/FinalCTA.jsx";
import ContactCountryDialSelect from "../components/ContactCountryDialSelect.jsx";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { deleteAccountByOtp, sendDeleteAccountOtp } from "../api/accountDeletion.js";
import {
  DEFAULT_ISO,
  FIELD_LIMITS,
  blockIndianMobileFirstDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  dialCodeFromPhonecode,
  isIndiaDial,
  sanitizeContactPhone,
} from "../components/contactFormShared.js";

function validateDeletePhone(phone, countryCode) {
  const code = String(countryCode ?? "").trim();
  const value = String(phone ?? "").trim();
  if (!code || !/^\+\d{1,4}$/.test(code.replace(/\s+/g, ""))) {
    return "Select a valid country code.";
  }
  if (!value) return "Enter the mobile or WhatsApp number on your account.";
  if (!/^\d+$/.test(value)) return "Phone number should contain digits only.";
  if (isIndiaDial(code)) {
    if (value.length !== FIELD_LIMITS.phoneNationalIndia) {
      return "Enter a 10-digit Indian mobile or WhatsApp number.";
    }
  } else if (value.length < 4 || value.length > FIELD_LIMITS.phoneNational) {
    return "Enter a valid phone number (4–15 digits).";
  }
  return "";
}

export function DeleteAccountPage() {
  const { appName, contact } = useSiteConfig();
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState("phone");
  const [otpHint, setOtpHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const supportEmail = contact?.email || "";
  const brand = appName || "IR Wellness";
  const phonePlaceholder = isIndiaDial(countryCode) ? "9876543210" : "Phone number";

  const otpSentCopy = useMemo(() => {
    if (otpHint) {
      return `OTP sent to your registered WhatsApp number ending in ${otpHint}.`;
    }
    return "OTP sent to your registered WhatsApp number.";
  }, [otpHint]);

  const handlePhoneChange = (value) => {
    setFeedback(null);
    setPhoneError("");
    setPhone(sanitizeContactPhone(value, countryCode));
  };

  const handleCountryChange = (iso) => {
    const nextIso = iso || DEFAULT_ISO;
    const country = Country.getCountryByCode(nextIso);
    const nextCode = country ? dialCodeFromPhonecode(country.phonecode) : countryCode;
    setFeedback(null);
    setPhoneError("");
    setCountryIso(nextIso);
    setCountryCode(nextCode);
    setPhone(sanitizeContactPhone(phone, nextCode));
  };

  const handlePhoneKeyDown = (event) => {
    if (isIndiaDial(countryCode)) {
      blockIndianMobileFirstDigitKeyDown(event);
    } else {
      blockPhoneNonDigitKeyDown(event);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const error = validateDeletePhone(phone, countryCode);
    if (error) {
      setPhoneError(error);
      setFeedback({ type: "error", text: error });
      return;
    }

    setSubmitting(true);
    try {
      const data = await sendDeleteAccountOtp({ phone, phoneCountryCode: countryCode });
      setOtp("");
      setConfirmed(false);
      setOtpError("");
      setOtpHint(String(data?.otpHint || "").trim());
      setStep("otp");
      setFeedback({
        type: "success",
        text: data?.message || otpSentCopy,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.message || "Unable to send OTP. Check the number and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const phoneCheck = validateDeletePhone(phone, countryCode);
    if (phoneCheck) {
      setPhoneError(phoneCheck);
      setFeedback({ type: "error", text: phoneCheck });
      return;
    }
    const code = String(otp ?? "").trim();
    if (!/^\d{4,8}$/.test(code)) {
      setOtpError("Enter the OTP sent to your WhatsApp.");
      setFeedback({ type: "error", text: "Enter the OTP sent to your WhatsApp." });
      return;
    }
    if (!confirmed) {
      setFeedback({
        type: "error",
        text: "Please confirm that you want to permanently delete this account.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const data = await deleteAccountByOtp({
        phone,
        phoneCountryCode: countryCode,
        otp: code,
      });
      setStep("done");
      setFeedback({
        type: "success",
        text: data?.message || "Your account has been deleted.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.message || "Could not delete the account. Request a new OTP and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="static-page-section delete-account-section">
      <div className="site-container">
        <div className="static-page-hero">
          <div className="site-container static-page-hero__inner paddingmanages">
            <h1 className="static-page-title">Delete your account</h1>
          </div>
        </div>

        <div className="site-container static-page-body">
          <div className="contact-layout delete-account-layout">
            <aside className="contact-card contact-card--details">
              <h3 className="contact-office__heading">How account deletion works</h3>
              <div className="static-page-content delete-account-copy">
                <p>
                  Use this page to delete your {brand} app account without opening the app.
                  Google Play and the App Store require a working web URL for this.
                </p>
                <ol>
                  <li>Enter the mobile or WhatsApp number registered on your account.</li>
                  <li>We send a one-time password to your registered WhatsApp number.</li>
                  <li>Enter that OTP to permanently delete the account and its personal data.</li>
                </ol>
                <p>
                  Deletion removes your profile, login, meal logs, progress, and in-app history.
                  This cannot be undone. Active subscriptions or payments may still be billed by
                  the store until you cancel them there.
                </p>
                <p>
                  You can also delete from the {brand} app after signing in. Read our{" "}
                  <Link to="/privacy-policy">Privacy Policy</Link> and{" "}
                  <Link to="/terms-and-conditions">Terms and Conditions</Link>
                  {supportEmail ? (
                    <>
                      {" "}
                      or write to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </aside>

            <div className="contact-card contact-card--form">
              {step === "done" ? (
                <div className="delete-account-done">
                  <h3 className="contact-office__heading">Account deleted</h3>
                  <p className="contact-form-feedback contact-form-feedback--success" role="status">
                    Your {brand} account has been permanently deleted. You can close this page.
                  </p>
                  <Link className="site-btn site-btn--primary" to="/">
                    Back to home
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="contact-office__heading">
                    {step === "otp" ? "Confirm with WhatsApp OTP" : "Request deletion OTP"}
                  </h3>
                  <form onSubmit={step === "otp" ? handleDelete : handleSendOtp} noValidate>
                    {feedback ? (
                      <div
                        className={`contact-form-feedback contact-form-feedback--${feedback.type}`}
                        role={feedback.type === "error" ? "alert" : "status"}
                      >
                        {feedback.text}
                      </div>
                    ) : null}

                    <div className={`contact-field${phoneError ? " contact-field--invalid" : ""}`}>
                      <label htmlFor="delete-account-phone">Mobile or WhatsApp number</label>
                      <div className="contact-phone-row">
                        <ContactCountryDialSelect
                          id="delete-account-phone-country"
                          value={countryIso}
                          onChange={handleCountryChange}
                          disabled={submitting || step === "otp"}
                          ariaLabel="Country code"
                        />
                        <input
                          id="delete-account-phone"
                          type="tel"
                          name="phone"
                          className="contact-phone-input"
                          placeholder={phonePlaceholder}
                          value={phone}
                          onChange={(event) => handlePhoneChange(event.target.value)}
                          onKeyDown={handlePhoneKeyDown}
                          onPaste={(event) => {
                            event.preventDefault();
                            handlePhoneChange(event.clipboardData.getData("text"));
                          }}
                          inputMode="numeric"
                          maxLength={
                            isIndiaDial(countryCode)
                              ? FIELD_LIMITS.phoneNationalIndia
                              : FIELD_LIMITS.phoneNational
                          }
                          disabled={submitting || step === "otp"}
                          aria-invalid={Boolean(phoneError)}
                          autoComplete="tel-national"
                        />
                      </div>
                      {phoneError ? (
                        <p className="contact-field-error" role="alert">
                          {phoneError}
                        </p>
                      ) : (
                        <p className="contact-field-hint">
                          OTP is always sent to the WhatsApp number saved on the account.
                        </p>
                      )}
                    </div>

                    {step === "otp" ? (
                      <>
                        <div className={`contact-field${otpError ? " contact-field--invalid" : ""}`}>
                          <label htmlFor="delete-account-otp">WhatsApp OTP</label>
                          <input
                            id="delete-account-otp"
                            type="text"
                            name="otp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(event) => {
                              setOtpError("");
                              setFeedback(null);
                              setOtp(event.target.value.replace(/\D/g, "").slice(0, 8));
                            }}
                            maxLength={8}
                            disabled={submitting}
                            aria-invalid={Boolean(otpError)}
                          />
                          {otpError ? (
                            <p className="contact-field-error" role="alert">
                              {otpError}
                            </p>
                          ) : (
                            <p className="contact-field-hint">{otpSentCopy}</p>
                          )}
                        </div>

                        <label className="delete-account-confirm">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(event) => {
                              setFeedback(null);
                              setConfirmed(event.target.checked);
                            }}
                            disabled={submitting}
                          />
                          <span>
                            I understand this permanently deletes my {brand} account and data.
                          </span>
                        </label>
                      </>
                    ) : null}

                    <div className="contact-footer">
                      <button type="submit" disabled={submitting}>
                        {submitting
                          ? step === "otp"
                            ? "Deleting…"
                            : "Sending OTP…"
                          : step === "otp"
                            ? "Delete my account"
                            : "Send WhatsApp OTP"}
                      </button>
                      {step === "otp" ? (
                        <button
                          type="button"
                          className="delete-account-secondary"
                          disabled={submitting}
                          onClick={() => {
                            setStep("phone");
                            setOtp("");
                            setConfirmed(false);
                            setOtpError("");
                            setFeedback(null);
                          }}
                        >
                          Use a different number
                        </button>
                      ) : (
                        <p>
                          Need help instead?{" "}
                          <Link to="/contact-us">Contact support</Link>
                          {supportEmail ? <> or email {supportEmail}.</> : "."}
                        </p>
                      )}
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <FinalCTA />
    </section>
  );
}
