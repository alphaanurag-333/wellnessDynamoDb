import { useCallback, useEffect, useId, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { handleMediaImageError } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { getAppConfig, patchAppConfig } from "../../api/adminMisc.js";
import { fetchAppConfig } from "../../../store/appConfigSlice.js";
import { logout } from "../../../store/authSlice.js";
import { mediaUrl } from "../../../media.js";

const SCALAR_KEYS = [
  "app_name",
  "app_email",
  "app_mobile",
  "app_detail",
  "app_version",
  "address",
  "latitude",
  "longitude",
  "facebook",
  "twitter",
  "instagram",
  "linkedin",
  "app_details",
  "app_footer_text",
  "improved_user",
  "success_rate",
  "average_rating",
  "happy_clients",
  "tax_type",
  "tax_value",
  "referral_discount",
  "consultancy_amount",
];

const SETTINGS_TABS = [
  { id: "general", label: "App config" },
  { id: "pricing", label: "Pricing" },
  { id: "branding", label: "Media" },
  { id: "location", label: "Location" },
  { id: "social", label: "Social" },
  // { id: "content", label: "Content" },
  { id: "payment-methods", label: "Payment methods" },
  // { id: "payment-gateways", label: "Payment gateways" },
];

const PAYMENT_METHOD_DEFS = [
  { type: "cod", label: "Cash on delivery", hint: "Customer pays when the order is delivered" },
  { type: "online", label: "Online payment", hint: "Cards, UPI, net banking, etc." },
  { type: "wallet", label: "Wallet", hint: "Pay using in-app wallet balance" },
];

const GATEWAY_DEFS = [
  { provider: "razorpay", title: "Razorpay" },
  { provider: "stripe", title: "Stripe" },
  { provider: "paypal", title: "PayPal" },
  { provider: "paytm", title: "Paytm" },
];

const TAX_TYPES = [
  { value: "inclusive", label: "Inclusive (tax included in price)" },
  { value: "exclusive", label: "Exclusive (tax added on top)" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const INTEGER_REGEX = /^\d+$/;
const LIMITS = {
  appName: 100,
  appEmail: 120,
  appDetail: 160,
  address: 300,
  latLng: 20,
  socialUrl: 255,
  appDetails: 2000,
  footerText: 180,
  statsField: 60,
  decimalField: 3,
  amountField: 20,
  gatewayField: 180,
};

function charCount(value, max) {
  return `${String(value || "").length}/${max}`;
}

/** Max 3 chars, digits + one dot + at most one decimal digit (maxLength ignored on type=number). */
function sanitizeShortDecimalInput(value, maxLen = LIMITS.decimalField) {
  let result = "";
  let hasDot = false;
  const raw = String(value ?? "").replace(/[^\d.]/g, "");

  for (const ch of raw) {
    if (ch === ".") {
      if (hasDot || result.length >= maxLen) continue;
      hasDot = true;
      result += ch;
      continue;
    }
    if (hasDot && result.length - result.indexOf(".") > 1) continue;
    if (result.length >= maxLen) break;
    result += ch;
  }

  return result.slice(0, maxLen);
}

function normalizeShortDecimalOnBlur(value, min, max) {
  let v = String(value || "").trim();
  if (!v) return "";
  if (v.endsWith(".")) v = v.slice(0, -1);
  if (!v) return "";

  const num = Number.parseFloat(v);
  if (!Number.isFinite(num)) return v;

  const clamped = Math.min(max, Math.max(min, num));
  if (v.includes(".")) {
    return clamped.toFixed(1).slice(0, LIMITS.decimalField);
  }
  return String(Math.round(clamped)).slice(0, LIMITS.decimalField);
}

function stepShortDecimal(value, delta, min, max) {
  const current = Number.parseFloat(String(value || "").trim());
  const base = Number.isFinite(current) ? current : min;
  const next = Math.min(max, Math.max(min, Math.round((base + delta) * 10) / 10));
  const formatted = Number.isInteger(next) ? String(next) : next.toFixed(1);
  return sanitizeShortDecimalInput(formatted);
}

function handleShortDecimalKeyDown(e, field, min, max, setScalars) {
  if (["-", "e", "E", "+"].includes(e.key)) {
    e.preventDefault();
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setScalars((s) => ({
      ...s,
      [field]: stepShortDecimal(s[field], 0.1, min, max),
    }));
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setScalars((s) => ({
      ...s,
      [field]: stepShortDecimal(s[field], -0.1, min, max),
    }));
  }
}

function isValidShortDecimal(value, min, max) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > LIMITS.decimalField) return false;
  if (!/^\d+(\.\d)?$/.test(raw)) return false;
  const num = Number.parseFloat(raw);
  return Number.isFinite(num) && num >= min && num <= max;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateSettingsForm({ scalars, paymentGateways }) {
  const appName = (scalars.app_name || "").trim();
  const appEmail = (scalars.app_email || "").trim();
  const appMobile = (scalars.app_mobile || "").trim();
  const appVersion = (scalars.app_version || "").trim();
  const improvedUser = (scalars.improved_user || "").trim();
  const happyClients = (scalars.happy_clients || "").trim();
  const averageRating = (scalars.average_rating || "").trim();
  const successRate = (scalars.success_rate || "").trim();
  const taxType = (scalars.tax_type || "").trim();
  const taxValue = (scalars.tax_value || "").trim();
  const referralDiscount = (scalars.referral_discount || "").trim();
  const consultancyAmount = (scalars.consultancy_amount || "").trim();
  const latitude = (scalars.latitude || "").trim();
  const longitude = (scalars.longitude || "").trim();

  if (!appName) return { tab: "general", text: "App name is required." };
  if (!appEmail) return { tab: "general", text: "Support email is required." };
  if (!EMAIL_REGEX.test(appEmail)) return { tab: "general", text: "Support email format is invalid." };
  if (!appMobile) return { tab: "general", text: "Support mobile is required." };
  if (!PHONE_REGEX.test(appMobile)) return { tab: "general", text: "Support mobile must be exactly 10 digits." };
  if (!improvedUser) return { tab: "general", text: "Improved users is required." };
  if (!INTEGER_REGEX.test(improvedUser)) {
    return { tab: "general", text: "Improved users must be a numeric value." };
  }
  if (!happyClients) return { tab: "general", text: "Happy clients is required." };
  if (!INTEGER_REGEX.test(happyClients)) {
    return { tab: "general", text: "Happy clients must be a numeric value." };
  }
  if (!averageRating) return { tab: "general", text: "Average rating is required." };
  if (!isValidShortDecimal(averageRating, 0, 5)) {
    return { tab: "general", text: "Average rating must be between 0 and 5 (max 3 characters, e.g. 4.5)." };
  }
  if (!appVersion) return { tab: "general", text: "App version is required." };
  if (!isValidShortDecimal(appVersion, 1, 10)) {
    return { tab: "general", text: "App version must be between 1.0 and 10.0 (max 3 characters, e.g. 9.5)." };
  }
  if (!successRate) return { tab: "general", text: "Success rate is required." };
  const success = Number.parseFloat(successRate);
  if (!Number.isFinite(success) || success < 0 || success > 100) {
    return { tab: "general", text: "Success rate must be between 0 and 100 percent." };
  }

  if (!consultancyAmount) return { tab: "pricing", text: "Consultancy amount is required." };
  const consultancy = Number.parseFloat(consultancyAmount);
  if (!Number.isFinite(consultancy) || consultancy < 0) {
    return { tab: "pricing", text: "Consultancy amount must be a non-negative number." };
  }

  if (!taxType) return { tab: "pricing", text: "Tax type is required." };
  if (!TAX_TYPES.some((t) => t.value === taxType)) {
    return { tab: "pricing", text: "Tax type must be inclusive or exclusive." };
  }
  if (!taxValue) return { tab: "pricing", text: "Tax value is required." };
  const tax = Number.parseFloat(taxValue);
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
    return { tab: "pricing", text: "Tax value must be between 0 and 100 percent." };
  }

  if (!referralDiscount) return { tab: "pricing", text: "Referral discount amount is required." };
  const referral = Number.parseFloat(referralDiscount);
  if (!Number.isFinite(referral) || referral < 0) {
    return { tab: "pricing", text: "Referral discount amount must be a non-negative number." };
  }

  if (latitude || longitude) {
    if (!latitude) return { tab: "location", text: "Enter both latitude and longitude, or clear both." };
    if (!longitude) return { tab: "location", text: "Enter both latitude and longitude, or clear both." };
    const lat = Number.parseFloat(latitude);
    const lng = Number.parseFloat(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { tab: "location", text: "Latitude must be a valid number between -90 and 90." };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { tab: "location", text: "Longitude must be a valid number between -180 and 180." };
    }
  }

  const socialEntries = [
    { key: "facebook", label: "Facebook" },
    { key: "twitter", label: "Twitter / X" },
    { key: "instagram", label: "Instagram" },
    { key: "linkedin", label: "LinkedIn" },
  ];
  for (const { key, label } of socialEntries) {
    const value = (scalars[key] || "").trim();
    if (value && !isValidHttpUrl(value)) {
      return { tab: "social", text: `${label} URL must start with http:// or https://` };
    }
  }

  // for (const g of paymentGateways) {
  //   if (!g.isActive) continue;
  //   const keyId = (g.credentials?.key_id || "").trim();
  //   const keySecret = (g.credentials?.key_secret || "").trim();
  //   if (!keyId || !keySecret) {
  //     const title = GATEWAY_DEFS.find((x) => x.provider === g.provider)?.title ?? g.provider;
  //     return { tab: "payment-gateways", text: `${title}: Key ID and Key secret are required when gateway is active.` };
  //   }
  // }

  return null;
}

function emptyGateway(provider) {
  return {
    provider,
    isActive: false,
    credentials: {
      key_id: "",
      key_secret: "",
      webhook_secret: "",
      merchant_id: "",
    },
  };
}

function normalizeGateways(arr) {
  const map = Object.fromEntries(
    (Array.isArray(arr) ? arr : [])
      .filter(Boolean)
      .map((g) => [g.provider, g]),
  );
  return GATEWAY_DEFS.map(({ provider }) => {
    const g = map[provider];
    if (!g) return emptyGateway(provider);
    const c = g.credentials || {};
    return {
      provider,
      isActive: !!g.isActive,
      credentials: {
        key_id: c.key_id != null ? String(c.key_id) : "",
        key_secret: c.key_secret != null ? String(c.key_secret) : "",
        webhook_secret: c.webhook_secret != null ? String(c.webhook_secret) : "",
        merchant_id: c.merchant_id != null ? String(c.merchant_id) : "",
      },
    };
  });
}

function normalizePaymentMethods(arr) {
  const map = Object.fromEntries(
    (Array.isArray(arr) ? arr : [])
      .filter(Boolean)
      .map((m) => [m.type, m]),
  );
  return PAYMENT_METHOD_DEFS.map(({ type, label, hint }) => ({
    type,
    label,
    hint,
    isActive: map[type] != null ? !!map[type].isActive : true,
  }));
}

function methodsForApi(list) {
  return list.map(({ type, isActive }) => ({ type, isActive }));
}

function gatewaysForApi(list) {
  return list.map(({ provider, isActive, credentials }) => ({
    provider,
    isActive,
    credentials: { ...credentials },
  }));
}

function SettingsToggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      className={`settings-switch${checked ? " settings-switch--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch__knob" aria-hidden />
    </button>
  );
}

export function BusinessSetting() {
  const dispatch = useDispatch();
  const baseId = useId();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Config row exists (GET returned a document). */
  const [hasDoc, setHasDoc] = useState(false);
  /** GET succeeded with `data: null` — not an error, no row to update. */
  const [configNotFound, setConfigNotFound] = useState(false);
  const [scalars, setScalars] = useState(() =>
    Object.fromEntries(SCALAR_KEYS.map((k) => [k, ""])),
  );
  const [paymentMethods, setPaymentMethods] = useState(() => normalizePaymentMethods([]));
  const [paymentGateways, setPaymentGateways] = useState(() => normalizeGateways([]));

  const [adminLogoFile, setAdminLogoFile] = useState(null);
  const [userLogoFile, setUserLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [adminLogoPreview, setAdminLogoPreview] = useState("");
  const [userLogoPreview, setUserLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");
  const [serverMedia, setServerMedia] = useState({ admin: "", user: "", fav: "" });
  const lat = Number.parseFloat((scalars.latitude || "").trim());
  const lng = Number.parseFloat((scalars.longitude || "").trim());
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapSrc = hasValidCoords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`
    : "";

  const applyConfig = useCallback((doc) => {
    if (!doc) {
      setHasDoc(false);
      setScalars(Object.fromEntries(SCALAR_KEYS.map((k) => [k, ""])));
      setPaymentMethods(normalizePaymentMethods([]));
      setPaymentGateways(normalizeGateways([]));
      setAdminLogoPreview("");
      setUserLogoPreview("");
      setFaviconPreview("");
      setServerMedia({ admin: "", user: "", fav: "" });
      return;
    }
    setHasDoc(true);
    const next = Object.fromEntries(
      SCALAR_KEYS.map((k) => [k, doc[k] != null ? String(doc[k]) : ""]),
    );
    next.average_rating = normalizeShortDecimalOnBlur(
      sanitizeShortDecimalInput(next.average_rating),
      0,
      5
    );
    next.app_version = normalizeShortDecimalOnBlur(
      sanitizeShortDecimalInput(next.app_version),
      1,
      10
    );
    setScalars(next);
    setPaymentMethods(normalizePaymentMethods(doc.payment_methods));
    setPaymentGateways(normalizeGateways(doc.payment_gateways));
    const a = doc.admin_logo ? mediaUrl(doc.admin_logo) : "";
    const u = doc.user_logo ? mediaUrl(doc.user_logo) : "";
    const f = doc.favicon ? mediaUrl(doc.favicon) : "";
    setServerMedia({ admin: a, user: u, fav: f });
    setAdminLogoPreview(a);
    setUserLogoPreview(u);
    setFaviconPreview(f);
  }, []);

  useEffect(() => {
    if (!adminToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setConfigNotFound(false);
      try {
        const body = await getAppConfig(adminToken);
        if (cancelled) return;
        if (body.data) {
          applyConfig(body.data);
          setConfigNotFound(false);
        } else {
          applyConfig(null);
          setConfigNotFound(true);
        }
      } catch (e) {
        if (!cancelled) {
          if (e?.status === 401) {
            dispatch(logout());
            return;
          }
          await Swal.fire({
            icon: "error",
            title: "Load failed",
            text: e.message || "Failed to load app configuration.",
          });
          setConfigNotFound(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, applyConfig, dispatch]);

  const buildFormData = () => {
    const fd = new FormData();
    for (const k of SCALAR_KEYS) {
      fd.append(k, scalars[k] ?? "");
    }
    fd.append("payment_methods", JSON.stringify(methodsForApi(paymentMethods)));
    fd.append("payment_gateways", JSON.stringify(gatewaysForApi(paymentGateways)));
    if (adminLogoFile) fd.append("admin_logo", adminLogoFile);
    if (userLogoFile) fd.append("user_logo", userLogoFile);
    if (faviconFile) fd.append("favicon", faviconFile);
    return fd;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!adminToken) {
      await Swal.fire({ icon: "error", title: "Not signed in", text: "You are not signed in." });
      return;
    }
    if (!hasDoc) {
      await Swal.fire({
        icon: "error",
        title: "Config not found",
        text: "No app configuration loaded. This page only updates an existing record. Create it once via POST /api/admin/misc/app-config (or seed the database), then reload.",
      });
      return;
    }
    const validationError = validateSettingsForm({ scalars, paymentGateways });
    if (validationError) {
      setTab(validationError.tab);
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError.text });
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      await patchAppConfig(adminToken, fd);
      await Swal.fire({ icon: "success", title: "Settings saved", timer: 1500 });
      dispatch(fetchAppConfig(adminToken));
      const refreshed = await getAppConfig(adminToken);
      applyConfig(refreshed.data);
      setAdminLogoFile(null);
      setUserLogoFile(null);
      setFaviconFile(null);
    } catch (err) {
      if (err?.status === 401) {
        dispatch(logout());
        return;
      }
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  if (!adminToken) {
    return (
      <div className="page-card">
        <p className="page-card__desc">Sign in to manage app configuration.</p>
      </div>
    );
  }

  if (configNotFound) {
    return (
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Application settings</h2>
          <p className="page-card__desc">
            Settings not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-card page-card--settings-form">
      <div className="page-card__head">
        <div>
          <h2 className="page-card__title">Application settings</h2>
          {/* <p className="page-card__desc">
            Business settings
          </p> */}
        </div>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="settings-tabs" role="tablist" aria-label="Application settings sections">
          {SETTINGS_TABS.map((t) => {
            const tabId = `${baseId}-tab-${t.id}`;
            const panelId = `${baseId}-panel-${t.id}`;
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={tabId}
                className={`settings-tabs__tab${selected ? " settings-tabs__tab--active" : ""}`}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading application settings..." />
          </div>
        ) : (
          <>
            {SETTINGS_TABS.map((t) => {
              const panelId = `${baseId}-panel-${t.id}`;
              const tabId = `${baseId}-tab-${t.id}`;
              if (tab !== t.id) return null;
              return (
                <div
                  key={t.id}
                  id={panelId}
                  role="tabpanel"
                  aria-labelledby={tabId}
                  className="settings-tab-panel"
                >
                  {t.id === "general" && (
                <>
                  {/* <p className="settings-panel-hint">Core identity fields (required; cannot be left blank on save).</p> */}
                  <div className="user-form__grid">
                    <div className="user-field ">
                      <span className="user-field__label">App name <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.app_name}
                        onChange={(e) => setScalars((s) => ({ ...s, app_name: e.target.value }))}
                        required
                        maxLength={LIMITS.appName}
                        autoComplete="organization"
                      />
                      <span className="settings-char-count">{charCount(scalars.app_name, LIMITS.appName)}</span>
                    </div>
                  

                    <div className="user-field">
                      <span className="user-field__label">Support email <span className="required-dot">*</span></span>
                      <input
                        type="email"
                        className="user-field__input"
                        value={scalars.app_email}
                        onChange={(e) => setScalars((s) => ({ ...s, app_email: e.target.value }))}
                        required
                        maxLength={LIMITS.appEmail}
                        autoComplete="email"
                      />
                      <span className="settings-char-count">{charCount(scalars.app_email, LIMITS.appEmail)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Support mobile <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.app_mobile}
                        onChange={(e) =>
                          setScalars((s) => ({ ...s, app_mobile: e.target.value.replace(/\D+/g, "").slice(0, 10) }))
                        }
                        required
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Short app detail</span>
                      <input
                        className="user-field__input"
                        value={scalars.app_detail}
                        onChange={(e) => setScalars((s) => ({ ...s, app_detail: e.target.value }))}
                        maxLength={LIMITS.appDetail}
                      />
                      <span className="settings-char-count">{charCount(scalars.app_detail, LIMITS.appDetail)}</span>
                    </div>
            
                    {/* <div className="user-field user-field--full">
                      <span className="user-field__label">App details</span>
                      <textarea
                        className="user-field__input"
                        rows={4}
                        value={scalars.app_details}
                        onChange={(e) => setScalars((s) => ({ ...s, app_details: e.target.value }))}
                        maxLength={LIMITS.appDetails}
                      />
                      <span className="settings-char-count">{charCount(scalars.app_details, LIMITS.appDetails)}</span>
                    </div> */}
                    <div className="user-field">
                      <span className="user-field__label">Improved users <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.improved_user}
                        onChange={(e) =>
                          setScalars((s) => ({ ...s, improved_user: e.target.value.replace(/\D+/g, "") }))
                        }
                        maxLength={LIMITS.statsField}
                        required
                        inputMode="numeric"
                      />
                      <span className="settings-char-count">{charCount(scalars.improved_user, LIMITS.statsField)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Success rate (%) <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.success_rate}
                        onChange={(e) => setScalars((s) => ({ ...s, success_rate: e.target.value }))}
                        onKeyDown={(e) => {
                          if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
                        }}
                        maxLength={LIMITS.statsField}
                        required
                        inputMode="decimal"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="0 to 100"
                      />
                      <span className="settings-char-count">{charCount(scalars.success_rate, LIMITS.statsField)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Average rating <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.average_rating}
                        onChange={(e) =>
                          setScalars((s) => ({
                            ...s,
                            average_rating: sanitizeShortDecimalInput(e.target.value),
                          }))
                        }
                        onBlur={(e) =>
                          setScalars((s) => ({
                            ...s,
                            average_rating: normalizeShortDecimalOnBlur(e.target.value, 0, 5),
                          }))
                        }
                        onKeyDown={(e) => handleShortDecimalKeyDown(e, "average_rating", 0, 5, setScalars)}
                        required
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        inputMode="decimal"
                        placeholder="0 to 5"
                      />
                      <span className="settings-char-count">{charCount(scalars.average_rating, LIMITS.decimalField)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">App version <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.app_version}
                        onChange={(e) =>
                          setScalars((s) => ({
                            ...s,
                            app_version: sanitizeShortDecimalInput(e.target.value),
                          }))
                        }
                        onBlur={(e) =>
                          setScalars((s) => ({
                            ...s,
                            app_version: normalizeShortDecimalOnBlur(e.target.value, 1, 10),
                          }))
                        }
                        onKeyDown={(e) => handleShortDecimalKeyDown(e, "app_version", 1, 10, setScalars)}
                        required
                        type="number"
                        min={1}
                        max={10}
                        step={0.1}
                        inputMode="decimal"
                        placeholder="1.0 to 10.0"
                      />
                      <span className="settings-char-count">{charCount(scalars.app_version, LIMITS.decimalField)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Happy clients <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.happy_clients}
                        onChange={(e) =>
                          setScalars((s) => ({ ...s, happy_clients: e.target.value.replace(/\D+/g, "") }))
                        }
                        maxLength={LIMITS.statsField}
                        required
                        inputMode="numeric"
                      />
                      <span className="settings-char-count">{charCount(scalars.happy_clients, LIMITS.statsField)}</span>
                    </div>

                    <div className="user-field ">
                      <span className="user-field__label">Footer text</span>
                      <textarea
                        className="user-field__input"
                        rows={3}
                        value={scalars.app_footer_text}
                        onChange={(e) => setScalars((s) => ({ ...s, app_footer_text: e.target.value }))}
                        maxLength={LIMITS.footerText}
                      />
                      <span className="settings-char-count">{charCount(scalars.app_footer_text, LIMITS.footerText)}</span>
                    </div>
                  </div>
                </>
              )}

              {t.id === "pricing" && (
                <>
                  <p className="settings-panel-hint">
                    Consultancy fee, tax, and referral discount (fixed amount) settings. Inclusive tax is already part of the listed price; exclusive tax is calculated and added at checkout.
                  </p>
                  <div className="user-form__grid">
                    <div className="user-field">
                      <span className="user-field__label">Consultancy amount <span className="required-dot">*</span></span>
                      <input
                        className="user-field__input"
                        value={scalars.consultancy_amount}
                        onChange={(e) =>
                          setScalars((s) => ({ ...s, consultancy_amount: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
                        }}
                        maxLength={LIMITS.amountField}
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                      <span className="settings-char-count">
                        {charCount(scalars.consultancy_amount, LIMITS.amountField)}
                      </span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Tax type <span className="required-dot">*</span></span>
                      <select
                        className="user-field__input"
                        value={scalars.tax_type}
                        onChange={(e) => setScalars((s) => ({ ...s, tax_type: e.target.value }))}
                        required
                      >
                        <option value="">Select tax type</option>
                        {TAX_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">
                        Tax value (%) <span className="required-dot">*</span>
                      </span>
                      <input
                        className="user-field__input"
                        value={scalars.tax_value}
                        onChange={(e) => setScalars((s) => ({ ...s, tax_value: e.target.value }))}
                        onKeyDown={(e) => {
                          if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
                        }}
                        maxLength={LIMITS.amountField}
                        required
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        inputMode="decimal"
                        placeholder="0 to 100"
                      />
                      <span className="settings-char-count">{charCount(scalars.tax_value, LIMITS.amountField)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">
                        Referral discount amount <span className="required-dot">*</span>
                      </span>
                      <input
                        className="user-field__input"
                        value={scalars.referral_discount}
                        onChange={(e) => setScalars((s) => ({ ...s, referral_discount: e.target.value }))}
                        onKeyDown={(e) => {
                          if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
                        }}
                        maxLength={LIMITS.amountField}
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                      <span className="settings-char-count">
                        {charCount(scalars.referral_discount, LIMITS.amountField)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {t.id === "branding" && (
                <>
                  <p className="settings-panel-hint">Uploads replace existing files only when you pick a new file.</p>
                  <div className="settings-media-grid">
                    <div className="settings-media-card">
                      <label className="settings-media-card__label" htmlFor={`${baseId}-admin-logo`}>
                        Admin logo
                        <span className="settings-media-card__hint">Shown in admin UI</span>
                      </label>
                      <input
                        id={`${baseId}-admin-logo`}
                        type="file"
                        accept="image/*"
                        className="settings-media-card__input user-field__input"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setAdminLogoFile(f || null);
                          setAdminLogoPreview(f ? URL.createObjectURL(f) : serverMedia.admin);
                        }}
                      />
                      <div className="settings-media-card__preview">
                        {adminLogoPreview ? <img src={adminLogoPreview} alt="Admin logo preview" onError={handleMediaImageError} /> : null}
                      </div>
                    </div>
                    <div className="settings-media-card">
                      <label className="settings-media-card__label" htmlFor={`${baseId}-user-logo`}>
                        Storefront logo
                        <span className="settings-media-card__hint">Customer-facing app</span>
                      </label>
                      <input
                        id={`${baseId}-user-logo`}
                        type="file"
                        accept="image/*"
                        className="settings-media-card__input user-field__input"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setUserLogoFile(f || null);
                          setUserLogoPreview(f ? URL.createObjectURL(f) : serverMedia.user);
                        }}
                      />
                      <div className="settings-media-card__preview">
                        {userLogoPreview ? <img src={userLogoPreview} alt="Storefront logo preview" onError={handleMediaImageError} /> : null}
                      </div>
                    </div>
                    <div className="settings-media-card">
                      <label className="settings-media-card__label" htmlFor={`${baseId}-favicon`}>
                        Favicon
                        <span className="settings-media-card__hint">ICO or PNG</span>
                      </label>
                      <input
                        id={`${baseId}-favicon`}
                        type="file"
                        accept="image/*,.ico"
                        className="settings-media-card__input user-field__input"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setFaviconFile(f || null);
                          setFaviconPreview(f ? URL.createObjectURL(f) : serverMedia.fav);
                        }}
                      />
                      <div className="settings-media-card__preview settings-media-card__preview--favicon">
                        {faviconPreview ? <img src={faviconPreview} alt="Favicon preview" onError={handleMediaImageError} /> : null}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {t.id === "location" && (
                <>
                  <p className="settings-panel-hint">Optional address and coordinates (strings). Map preview appears when both latitude and longitude are valid.</p>
                  <div className="settings-location">
                    <div className="user-form__grid settings-location__form">
                 
                      <div className="user-field">
                        <span className="user-field__label">Latitude</span>
                        <input
                          className="user-field__input"
                          value={scalars.latitude}
                          onChange={(e) => setScalars((s) => ({ ...s, latitude: e.target.value }))}
                          maxLength={LIMITS.latLng}
                        />
                        <span className="settings-char-count">{charCount(scalars.latitude, LIMITS.latLng)}</span>
                      </div>
                      <div className="user-field">
                        <span className="user-field__label">Longitude</span>
                        <input
                          className="user-field__input"
                          value={scalars.longitude}
                          onChange={(e) => setScalars((s) => ({ ...s, longitude: e.target.value }))}
                          maxLength={LIMITS.latLng}
                        />
                        <span className="settings-char-count">{charCount(scalars.longitude, LIMITS.latLng)}</span>
                      </div>

                      <div className="user-field ">
                        <span className="user-field__label">Address</span>
                        <textarea
                          className="user-field__input"
                          rows={3}
                          value={scalars.address}
                          onChange={(e) => setScalars((s) => ({ ...s, address: e.target.value }))}
                          maxLength={LIMITS.address}
                        />
                        <span className="settings-char-count">{charCount(scalars.address, LIMITS.address)}</span>
                      </div>
                    </div>

                    <div className="settings-location__map-wrap">
                      <span className="user-field__label">Map preview</span>
                      {hasValidCoords ? (
                        <iframe
                          title="Location preview"
                          src={mapSrc}
                          className="settings-location__map"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      ) : (
                        <div className="settings-location__empty">Enter valid latitude and longitude to preview map.</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {t.id === "social" && (
                <>
                  <p className="settings-panel-hint">Full profile or page URLs.</p>
                  <div className="user-form__grid">
                    <div className="user-field ">
                      <span className="user-field__label">Facebook</span>
                      <input
                        className="user-field__input"
                        value={scalars.facebook}
                        onChange={(e) => setScalars((s) => ({ ...s, facebook: e.target.value }))}
                        placeholder="https://"
                        maxLength={LIMITS.socialUrl}
                      />
                      <span className="settings-char-count">{charCount(scalars.facebook, LIMITS.socialUrl)}</span>
                    </div>
                    <div className="user-field">
                      <span className="user-field__label">Twitter / X</span>
                      <input
                        className="user-field__input"
                        value={scalars.twitter}
                        onChange={(e) => setScalars((s) => ({ ...s, twitter: e.target.value }))}
                        placeholder="https://"
                        maxLength={LIMITS.socialUrl}
                      />
                      <span className="settings-char-count">{charCount(scalars.twitter, LIMITS.socialUrl)}</span>
                    </div>
                    <div className="user-field ">
                      <span className="user-field__label">Instagram</span>
                      <input
                        className="user-field__input"
                        value={scalars.instagram}
                        onChange={(e) => setScalars((s) => ({ ...s, instagram: e.target.value }))}
                        placeholder="https://"
                        maxLength={LIMITS.socialUrl}
                      />
                      <span className="settings-char-count">{charCount(scalars.instagram, LIMITS.socialUrl)}</span>
                    </div>
                    <div className="user-field ">
                      <span className="user-field__label">LinkedIn</span>
                      <input
                        className="user-field__input"
                        value={scalars.linkedin}
                        onChange={(e) => setScalars((s) => ({ ...s, linkedin: e.target.value }))}
                        placeholder="https://"
                        maxLength={LIMITS.socialUrl}
                      />
                      <span className="settings-char-count">{charCount(scalars.linkedin, LIMITS.socialUrl)}</span>
                    </div>
                  </div>
                </>
              )}

              {t.id === "content" && (
                <>
                  <p className="settings-panel-hint">Long-form copy (e.g. about or legal summary) for the app_details field.</p>
                  <div className="user-form__grid">
                    <div className="user-field user-field--full">
                      <span className="user-field__label">App details</span>
                      <textarea
                        className="user-field__input"
                        rows={6}
                        value={scalars.app_details}
                        onChange={(e) => setScalars((s) => ({ ...s, app_details: e.target.value }))}
                        maxLength={LIMITS.appDetails}
                      />
                      <span className="settings-char-count">{charCount(scalars.app_details, LIMITS.appDetails)}</span>
                    </div>
                  </div>
                </>
              )}

              {t.id === "payment-methods" && (
                <>
                  <p className="settings-panel-hint">
                    Choose which checkout options are available. Changes apply after you save at the bottom of the page.
                  </p>
                  <div className="settings-toggle-list">
                    {paymentMethods.map((m) => (
                      <div key={m.type} className="settings-toggle-row">
                        <div>
                          <span className="settings-toggle-row__label">{m.label}</span>
                          <span className="settings-toggle-row__hint">{m.hint}</span>
                        </div>
                        <SettingsToggle
                          id={`${baseId}-pm-${m.type}`}
                          checked={m.isActive}
                          onChange={(next) =>
                            setPaymentMethods((prev) =>
                              prev.map((x) => (x.type === m.type ? { ...x, isActive: next } : x)),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

                  {/* {t.id === "payment-gateways" && (
                <>
                  <p className="settings-panel-hint">
                    Turn a gateway on only when credentials are correct. Key ID and key secret are required for most
                    providers; webhook and merchant fields are optional depending on your integration.
                  </p>
                  <div className="settings-gateway-grid">
                    {paymentGateways.map((g) => {
                      const def = GATEWAY_DEFS.find((d) => d.provider === g.provider);
                      const title = (def?.title ?? g.provider).toUpperCase();
                      return (
                        <div key={g.provider} className="settings-gateway-card">
                          <div className="settings-gateway-card__head">
                            <h3 className="settings-gateway-card__title">{title}</h3>
                            <SettingsToggle
                              id={`${baseId}-gw-${g.provider}`}
                              checked={g.isActive}
                              onChange={(next) =>
                                setPaymentGateways((prev) =>
                                  prev.map((x) => (x.provider === g.provider ? { ...x, isActive: next } : x)),
                                )
                              }
                            />
                          </div>
                          <div className="settings-gateway-card__fields">
                            <label className="settings-gateway-card__field" htmlFor={`${baseId}-${g.provider}-keyid`}>
                              <span>Key ID {g.isActive ? <span className="required-dot">*</span> : null}</span>
                              <input
                                id={`${baseId}-${g.provider}-keyid`}
                                type="text"
                                autoComplete="off"
                                value={g.credentials.key_id}
                                onChange={(e) =>
                                  setPaymentGateways((prev) =>
                                    prev.map((x) =>
                                      x.provider === g.provider
                                        ? {
                                            ...x,
                                            credentials: { ...x.credentials, key_id: e.target.value.slice(0, LIMITS.gatewayField) },
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="pk_… / rzp_… / client id"
                              />
                              <span className="settings-char-count">{charCount(g.credentials.key_id, LIMITS.gatewayField)}</span>
                            </label>
                            <label className="settings-gateway-card__field" htmlFor={`${baseId}-${g.provider}-secret`}>
                              <span>Key secret {g.isActive ? <span className="required-dot">*</span> : null}</span>
                              <input
                                id={`${baseId}-${g.provider}-secret`}
                                type="password"
                                autoComplete="new-password"
                                value={g.credentials.key_secret}
                                onChange={(e) =>
                                  setPaymentGateways((prev) =>
                                    prev.map((x) =>
                                      x.provider === g.provider
                                        ? {
                                            ...x,
                                            credentials: { ...x.credentials, key_secret: e.target.value.slice(0, LIMITS.gatewayField) },
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="••••••••"
                              />
                              <span className="settings-char-count">{charCount(g.credentials.key_secret, LIMITS.gatewayField)}</span>
                            </label>
                          </div>
                          <div className="settings-gateway-card__extras">
                            <label className="settings-gateway-card__field" htmlFor={`${baseId}-${g.provider}-wh`}>
                              <span>Webhook secret (optional)</span>
                              <input
                                id={`${baseId}-${g.provider}-wh`}
                                type="password"
                                autoComplete="new-password"
                                value={g.credentials.webhook_secret}
                                onChange={(e) =>
                                  setPaymentGateways((prev) =>
                                    prev.map((x) =>
                                      x.provider === g.provider
                                        ? {
                                            ...x,
                                            credentials: { ...x.credentials, webhook_secret: e.target.value.slice(0, LIMITS.gatewayField) },
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="whsec_…"
                              />
                              <span className="settings-char-count">{charCount(g.credentials.webhook_secret, LIMITS.gatewayField)}</span>
                            </label>
                            <label className="settings-gateway-card__field" htmlFor={`${baseId}-${g.provider}-mid`}>
                              <span>Merchant ID (optional)</span>
                              <input
                                id={`${baseId}-${g.provider}-mid`}
                                type="text"
                                autoComplete="off"
                                value={g.credentials.merchant_id}
                                onChange={(e) =>
                                  setPaymentGateways((prev) =>
                                    prev.map((x) =>
                                      x.provider === g.provider
                                        ? {
                                            ...x,
                                            credentials: { ...x.credentials, merchant_id: e.target.value.slice(0, LIMITS.gatewayField) },
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="Paytm / PayPal merchant id"
                              />
                              <span className="settings-char-count">{charCount(g.credentials.merchant_id, LIMITS.gatewayField)}</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
                  )} */}

                </div>
              );
            })}

            <div className="settings-form-footer settings-form-footer--centered">
              <button type="submit" className="btn--settings-save" disabled={saving || !hasDoc}>
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
