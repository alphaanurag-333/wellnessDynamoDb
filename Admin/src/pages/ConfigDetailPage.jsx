import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Link, useOutletContext, useParams } from "react-router-dom";
import { ConfigPreviewModal, previewHintForItem } from "../components/ConfigPreviewModal.jsx";
import { ConfigPublishModal } from "../components/ConfigPublishModal.jsx";
import { ProgramSetupModal } from "../components/ProgramSetupModal.jsx";
import {
  MeasurementVideoSection,
  MEASUREMENT_GALLERY,
  MEASUREMENT_GUIDE,
  MEASUREMENT_PARAMETERS,
} from "../components/MeasurementVideoSection.jsx";
import {
  OnboardingVideoSection,
  ONBOARDING_COACHES,
  ONBOARDING_GALLERY,
} from "../components/OnboardingVideoSection.jsx";
import {
  HealthProgressTrackersPanel,
  MedicalQuestionnairePanel,
} from "../components/ConfigAppRemainingSections.jsx";
import {
  CommitmentLetterSection,
  COMMITMENT_COACH_SIGNOFFS,
  COMMITMENT_LETTER_DEFAULT,
} from "../components/CommitmentLetterSection.jsx";
import { DietPlansSection, DIET_PLANS } from "../components/DietPlansSection.jsx";
import { DrfBankSection, DRF_FORM_SECTIONS } from "../components/DrfBankSection.jsx";
import { GallerySection, GALLERY_MEDIA } from "../components/GallerySection.jsx";
import {
  AiEnableSection,
  AI_ENABLE_ASSISTANTS,
  AI_ENABLE_COACHES,
} from "../components/AiEnableSection.jsx";
import {
  LaunchSection,
  LAUNCH_CONFIG_DOMAINS,
  LAUNCH_CONFIG_RATINGS,
} from "../components/LaunchSection.jsx";
import { NutritionBankSection, NUTRITION_BANK } from "../components/NutritionBankSection.jsx";
import { RxBankSection, RX_BANK_PROTOCOLS } from "../components/RxBankSection.jsx";
import { FaqConfigPanel } from "../components/FaqConfigPanel.jsx";
import { PageHeader } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { HEALTH_TRACKERS } from "../data/healthProgressData.js";
import {
  APP_HEAL_PERIODS,
  DISCOUNT_SLABS,
  PROGRAM_PRICING,
  PWC_COMPLETED,
  REFERRAL_LOOKUP,
  SUBSCRIPTION_PRICING,
  VALIDITY_PERIODS,
  PAYMENT_GATEWAY_OPTIONS,
  activePaymentGateway,
  createDefaultGateways,
  paymentMethodsForGateway,
  TOS_CONTENT,
  DPA_CONTENT,
  MEDICAL_QUESTIONNAIRE,
} from "../data/configDetailData.js";
import { findConfigItem, getConfigStateLabel } from "../data/configsData.js";
import { formatRupee } from "../data/exchangeData.js";

function surfacesLabel(item) {
  if (item.app && item.web) return "App & web";
  if (item.app) return "App only";
  if (item.web) return "Web only";
  return "None";
}

function ConfigSummary({ item, groupName, on }) {
  return (
    <section className="ua-cfg-summary">
      <div className="ua-cfg-summary__head">
        <h2 className="ua-cfg-summary__title">{item.name}</h2>
        <span className="ua-cfg-summary__group">{groupName}</span>
      </div>
      <div className="ua-cfg-summary__grid">
        <div className="ua-cfg-summary__cell">
          <span className="ua-cfg-summary__label">What it is</span>
          <p className="ua-cfg-summary__value">{item.note}</p>
        </div>
        <div className="ua-cfg-summary__cell">
          <span className="ua-cfg-summary__label">Owner</span>
          <p className="ua-cfg-summary__value">{item.owner}</p>
        </div>
        <div className="ua-cfg-summary__cell">
          <span className="ua-cfg-summary__label">Surfaces</span>
          <p className="ua-cfg-summary__value">{surfacesLabel(item)}</p>
        </div>
        <div className="ua-cfg-summary__cell">
          <span className="ua-cfg-summary__label">State</span>
          <p className="ua-cfg-summary__value">{getConfigStateLabel(item, on)}</p>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function LanguagePanel({ hindiOn, onToggle, onToast }) {
  return (
    <Panel title="Languages">
      <div className="ua-cfg-lang-row">
        <div>
          <div className="ua-cfg-lang-row__name">English</div>
          <div className="ua-cfg-lang-row__note">Always on</div>
        </div>
        <div className="ua-cfg-lang-row__side">
          <span className="ua-cfg-lang-row__state">Enabled</span>
          <span className="ua-cfg-lang-row__lock" title="Locked" aria-hidden="true">🔒</span>
        </div>
      </div>
      <div className="ua-cfg-lang-row">
        <div>
          <div className="ua-cfg-lang-row__name">Hindi</div>
          <div className="ua-cfg-lang-row__note">Can be disabled</div>
        </div>
        <div className="ua-cfg-lang-row__side">
          <span className="ua-cfg-lang-row__state">{hindiOn ? "Enabled" : "Disabled"}</span>
          <button
            type="button"
            className={`ua-toggle${hindiOn ? " ua-toggle--on" : ""}`}
            aria-pressed={hindiOn}
            aria-label="Hindi language"
            onClick={() => {
              onToggle(!hindiOn);
              onToast(`Hindi ${!hindiOn ? "enabled" : "disabled"}`);
            }}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ClientLookupPanel({
  onToast,
  externalCode,
  programOptions,
  programLabel = "Program",
  showAppHeal = true,
}) {
  const [code, setCode] = useState("");
  const [client, setClient] = useState(null);
  const [programId, setProgramId] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);

  function performLookup(rawCode) {
    const key = rawCode.trim().toUpperCase();
    if (!key) {
      setClient(null);
      setProgramId("");
      return false;
    }
    const hit = REFERRAL_LOOKUP[key];
    if (hit) {
      setClient(hit);
      setProgramId("");
      return true;
    }
    setClient(null);
    setProgramId("");
    return false;
  }

  useEffect(() => {
    if (!externalCode) return;
    setCode(externalCode);
    const key = externalCode.trim().toUpperCase();
    const hit = REFERRAL_LOOKUP[key];
    if (hit) {
      setClient(hit);
      setProgramId("");
      onToast("Client loaded");
    }
  }, [externalCode, onToast]);

  function lookup() {
    if (performLookup(code)) {
      onToast("Client loaded");
    } else {
      onToast("No client found for that code");
    }
  }

  function clear() {
    setCode("");
    setClient(null);
    setProgramId("");
  }

  function setupProgram() {
    const program = programOptions.find((entry) => entry.id === programId);
    if (!program || !client) return;
    setSetupOpen(true);
  }

  const selectedProgram = programOptions.find((entry) => entry.id === programId);

  return (
    <>
    <Panel
      title="Look up a client"
      subtitle="Enter a referral code — name, email and mobile fill in from their profile."
    >
      <div className="ua-cfg-lookup">
        <input
          type="text"
          className="ua-cfg-lookup__input"
          placeholder="Referral code · e.g. IRW-WC-544"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") lookup();
          }}
        />
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={lookup}>
          Look up
        </button>
        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={clear}>
          Clear
        </button>
      </div>

      {client ? (
        <div className="ua-cfg-lookup__grid">
          <div className="ua-cfg-lookup__cell">
            <span className="ua-cfg-lookup__label">Name</span>
            <span className="ua-cfg-lookup__text">{client.name}</span>
            <span className="ua-cfg-lookup__auto">Auto</span>
          </div>
          <div className="ua-cfg-lookup__cell">
            <span className="ua-cfg-lookup__label">Email</span>
            <span className="ua-cfg-lookup__text">{client.email}</span>
            <span className="ua-cfg-lookup__auto">Auto</span>
          </div>
          <div className="ua-cfg-lookup__cell">
            <span className="ua-cfg-lookup__label">Mobile</span>
            <span className="ua-cfg-lookup__text">{client.mobile}</span>
            <span className="ua-cfg-lookup__auto">Auto</span>
          </div>
          <div className="ua-cfg-lookup__cell ua-cfg-lookup__cell--program">
            <span className="ua-cfg-lookup__label">{programLabel}</span>
            <select
              className="ua-cfg-lookup__select"
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
            >
              <option value="">Choose a program…</option>
              {programOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ua-cfg-lookup__setup"
              disabled={!programId}
              onClick={setupProgram}
            >
              Set up ›
            </button>
          </div>
        </div>
      ) : (
        <div className="ua-cfg-lookup__empty">No client loaded — enter a referral code above.</div>
      )}
    </Panel>
    <ProgramSetupModal
      open={setupOpen}
      onClose={() => setSetupOpen(false)}
      onSave={() => {
        onToast(`${selectedProgram?.name} triggered for ${client?.name}`);
      }}
      program={selectedProgram}
      client={client}
      showAppHeal={showAppHeal}
    />
    </>
  );
}

function PricingNewForm({ draft, onChange, onClose, onSubmit, formTitle, namePlaceholder, inputRef }) {
  return (
    <section className="ua-cfg-pricing-new">
      <div className="ua-cfg-pricing-new__head">
        <h4 className="ua-cfg-pricing-new__title">
          <span className="ua-cfg-pricing-new__icon" aria-hidden="true" />
          {formTitle}
        </h4>
        <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="ua-cfg-pricing-new__row">
        <input
          ref={inputRef}
          type="text"
          className="ua-cfg-pricing-new__name"
          value={draft.name}
          placeholder={namePlaceholder}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
        <label className="ua-cfg-pricing-new__amount">
          <input
            type="text"
            inputMode="numeric"
            value={draft.amount}
            placeholder=""
            aria-label="Amount"
            onChange={(event) => onChange({ ...draft, amount: event.target.value.replace(/[^\d]/g, "") })}
          />
          <span className="ua-cfg-pricing-new__amount-label">Amount</span>
        </label>
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onSubmit}>
          Add
        </button>
      </div>
    </section>
  );
}

function PricingPanel({
  title,
  rows,
  setRows,
  onToast,
  addLabel = "+ Add program",
  formTitle = "New program",
  namePlaceholder = "Program name",
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", amount: "" });
  const addFormRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!showAddForm) return undefined;
    const timer = window.setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      nameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showAddForm]);

  function closeAddForm() {
    setShowAddForm(false);
    setDraft({ name: "", amount: "" });
  }

  function submitNewRow() {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    if (!name) {
      onToast("Program name is required");
      return;
    }
    if (!amount || amount <= 0) {
      onToast("Enter a valid amount");
      return;
    }
    setRows((prev) => [...prev, { id: `program-${Date.now()}`, name, amount }]);
    closeAddForm();
    onToast(`${name} added`);
  }

  return (
    <Panel
      title={title}
      subtitle="Admin sets the amount, the discount %, and how long that discount stays valid."
      actions={(
        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={() => setShowAddForm(true)}>
          {addLabel}
        </button>
      )}
    >
      {showAddForm ? (
        <div ref={addFormRef} className="ua-cfg-pricing__new-wrap">
          <PricingNewForm
            draft={draft}
            onChange={setDraft}
            onClose={closeAddForm}
            onSubmit={submitNewRow}
            formTitle={formTitle}
            namePlaceholder={namePlaceholder}
            inputRef={nameInputRef}
          />
        </div>
      ) : null}
      <div className="ua-cfg-pricing">
        <div className="ua-cfg-pricing__head">
          <span>Program</span>
          <span>Amount (Rs.)</span>
          <span aria-hidden="true" />
        </div>
        {rows.map((row) => (
          <div key={row.id} className="ua-cfg-pricing__row">
            <span>{row.name}</span>
            <strong>{formatRupee(row.amount)}</strong>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label={`Remove ${row.name}`}
              onClick={() => {
                setRows((prev) => prev.filter((entry) => entry.id !== row.id));
                onToast(`${row.name} removed`);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TagCreatePanel({ title, subtitle, tags, placeholder, createLabel, coachesToggle, onToast }) {
  const [draft, setDraft] = useState("");
  const [coachAdd, setCoachAdd] = useState(true);
  const [items, setItems] = useState(tags);

  function createItem() {
    const value = draft.trim();
    if (!value) return;
    setItems((prev) => [...prev, value]);
    setDraft("");
    onToast(`${value} added`);
  }

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={
        coachesToggle ? (
          <label className="ua-cfg-coach-toggle">
            <span className={`ua-cfg-coach-toggle__label${coachAdd ? " is-on" : ""}`}>Coaches can add</span>
            <button
              type="button"
              className={`ua-toggle${coachAdd ? " ua-toggle--on" : ""}`}
              aria-pressed={coachAdd}
              onClick={() => setCoachAdd((prev) => !prev)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </label>
        ) : null
      }
    >
      <div className="ua-cfg-tags">
        {items.map((tag) => (
          <span key={tag} className="ua-cfg-tag">
            {typeof tag === "string" ? tag : `${tag.pct}% · ${tag.label}`}
          </span>
        ))}
        <input
          type="text"
          className="ua-cfg-tags__input"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") createItem();
          }}
        />
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={createItem}>
          {createLabel}
        </button>
      </div>
    </Panel>
  );
}

function PwcPanel({ onToast, onUseCode }) {
  return (
    <Panel
      title="PWC completed · last 24 hours"
      subtitle={(
        <>
          Clients who finished their programme-wise consult — ready to raise an <strong>exchange</strong>.
        </>
      )}
      actions={(
        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--caps">
          All coaches
        </button>
      )}
    >
      <div className="ua-cfg-pwc-list">
        {PWC_COMPLETED.map((row) => (
          <div key={row.id} className="ua-cfg-pwc">
            <span className="ua-cfg-pwc__avatar">{row.initials}</span>
            <div className="ua-cfg-pwc__main">
              <strong>{row.name}</strong>
              <span>{row.consult} · {row.code}</span>
            </div>
            <span className="ua-cfg-pwc__coach">{row.coach.toUpperCase()}</span>
            <span className="ua-cfg-pwc__ago">{row.ago}</span>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
              onClick={() => {
                onUseCode?.(row.code);
                onToast(`Loaded ${row.code}`);
              }}
            >
              Use code
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ExchangeClientSection({
  onToast,
  programOptions,
  programLabel = "Program",
  showAppHeal = true,
}) {
  const [referralCode, setReferralCode] = useState(null);

  return (
    <>
      <PwcPanel onToast={onToast} onUseCode={setReferralCode} />
      <ClientLookupPanel
        onToast={onToast}
        externalCode={referralCode}
        programOptions={programOptions}
        programLabel={programLabel}
        showAppHeal={showAppHeal}
      />
    </>
  );
}

function GstPanel({ on, onToggle, onToast }) {
  const note = on
    ? "Client pays GST at checkout"
    : "IRW absorbs GST · price shown is final";

  return (
    <Panel title="GST collection">
      <div className="ua-cfg-gst-row">
        <span className="ua-cfg-gst-row__icon" aria-hidden="true">📜</span>
        <div>
          <div className="ua-cfg-gst-row__name">GST collection</div>
          <div className="ua-cfg-gst-row__note">{note}</div>
        </div>
        <button
          type="button"
          className={`ua-toggle${on ? " ua-toggle--on" : ""}`}
          aria-pressed={on}
          onClick={() => {
            onToggle(!on);
            onToast(`GST collection ${!on ? "enabled" : "disabled"}`);
          }}
        >
          <span className="ua-toggle__knob" />
        </button>
      </div>
    </Panel>
  );
}

function LegalTextPanel({ title, copy, onChange, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draftIntro, setDraftIntro] = useState(copy.intro);
  const [draftBullets, setDraftBullets] = useState(copy.bullets.join("\n"));

  function startEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(false);
  }

  function saveEdit() {
    const intro = draftIntro.trim();
    const bullets = draftBullets
      .split("\n")
      .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
      .filter(Boolean);

    if (!intro) {
      onToast("Add an opening paragraph before saving");
      return;
    }

    onChange({ intro, bullets });
    setEditing(false);
    onToast(`${title} updated`);
  }

  return (
    <Panel
      title={title}
      subtitle="Write the copy as a paragraph or bullet points."
      actions={
        editing ? (
          <>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={saveEdit}>
              Save
            </button>
          </>
        ) : (
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost" onClick={startEdit}>
            Edit
          </button>
        )
      }
    >
      {editing ? (
        <div className="ua-cfg-legal-edit">
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Opening paragraph</span>
            <textarea
              className="ua-cfg-legal-edit__textarea"
              rows={3}
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value)}
            />
          </label>
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Bullet points · one per line</span>
            <textarea
              className="ua-cfg-legal-edit__textarea ua-cfg-legal-edit__textarea--bullets"
              rows={6}
              value={draftBullets}
              placeholder="One bullet per line"
              onChange={(event) => setDraftBullets(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="ua-cfg-legal-view">
          <p className="ua-cfg-legal-view__intro">{copy.intro}</p>
          {copy.bullets.length ? (
            <ul className="ua-cfg-legal-view__list">
              {copy.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function PaymentGatewayPanel({ gateways, setGateways, onToast }) {
  function updateGateway(id, patch) {
    setGateways((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  function toggleGateway(id) {
    const turningOn = !gateways[id].active;
    setGateways((prev) => {
      const next = { ...prev };
      PAYMENT_GATEWAY_OPTIONS.forEach((option) => {
        next[option.id] = {
          ...next[option.id],
          active: option.id === id ? turningOn : false,
        };
      });
      return next;
    });
    const option = PAYMENT_GATEWAY_OPTIONS.find((entry) => entry.id === id);
    onToast(`${option?.name ?? "Gateway"} ${turningOn ? "enabled" : "disabled"}`);
  }

  return (
    <Panel
      title="Payment gateways"
      subtitle="Turn a gateway on only when credentials are correct. One active gateway at a time."
    >
      <div className="ua-cfg-pgw-grid">
        {PAYMENT_GATEWAY_OPTIONS.map((option) => {
          const entry = gateways[option.id];
          const active = entry.active;

          return (
            <div key={option.id} className={`ua-cfg-pgw-card${active ? " ua-cfg-pgw-card--active" : ""}`}>
              <div className="ua-cfg-pgw-card__head">
                <div>
                  <div className="ua-cfg-pgw-card__name">{option.name}</div>
                  <div className="ua-cfg-pgw-card__note">{option.note}</div>
                </div>
                <button
                  type="button"
                  className={`ua-toggle${active ? " ua-toggle--on" : ""}`}
                  aria-pressed={active}
                  aria-label={`${option.name} ${active ? "on" : "off"}`}
                  onClick={() => toggleGateway(option.id)}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>

              <div className="ua-cfg-pgw-card__fields">
                <label className="ua-cfg-pgw-field">
                  <span className="ua-cfg-pgw-field__label">
                    Key ID{active ? " *" : ""}
                  </span>
                  <input
                    type="text"
                    className="ua-cfg-pgw-field__input"
                    value={entry.keyId}
                    autoComplete="off"
                    placeholder="pk_… / rzp_… / client id"
                    onChange={(event) => updateGateway(option.id, { keyId: event.target.value })}
                  />
                </label>
                <label className="ua-cfg-pgw-field">
                  <span className="ua-cfg-pgw-field__label">
                    Key secret{active ? " *" : ""}
                  </span>
                  <input
                    type="password"
                    className="ua-cfg-pgw-field__input"
                    value={entry.keySecret}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    onChange={(event) => updateGateway(option.id, { keySecret: event.target.value })}
                  />
                </label>
                <label className="ua-cfg-pgw-field ua-cfg-pgw-field--full">
                  <span className="ua-cfg-pgw-field__label">Webhook secret (optional)</span>
                  <input
                    type="password"
                    className="ua-cfg-pgw-field__input"
                    value={entry.webhookSecret}
                    autoComplete="new-password"
                    placeholder="whsec_…"
                    onChange={(event) => updateGateway(option.id, { webhookSecret: event.target.value })}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function GenericPanel({ item }) {
  return (
    <section className="ua-cfg-empty">
      <span className="ua-cfg-empty__icon" aria-hidden="true">⚙️</span>
      <h3 className="ua-cfg-empty__title">{item.name}</h3>
      <p className="ua-cfg-empty__sub">Configuration editor for this item is coming soon.</p>
    </section>
  );
}

const PREVIEW_CONFIGS = new Set([
  "app-language-disable",
  "app-faq",
  "app-program",
  "app-subscriptions",
  "app-gst",
  "app-payment-gateway",
  "app-tos",
  "app-dpa",
  "app-measurement-video",
  "app-onboarding-video",
  "app-medical-questionnaire",
  "app-health-progress",
  "app-drf-bank",
  "app-commitment-letter",
  "app-diet-plans",
  "app-nutrition-bank",
  "app-rx-bank",
  "app-gallery",
  "app-launch",
  "app-ai-enable",
]);

function PreviewActions({ item, onOpen, onPublish, canPublish }) {
  return (
    <>
      <span className="ua-cfg-preview-hint">{previewHintForItem(item)}</span>
      <button type="button" className="ua-cfg-btn ua-cfg-btn--muted" onClick={onOpen}>
        Preview
      </button>
      {canPublish ? (
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onPublish}>
          Publish
        </button>
      ) : null}
    </>
  );
}

export function ConfigDetailPage() {
  const { configId } = useParams();
  const { showToast: onToast } = useOutletContext();
  const found = useMemo(() => findConfigItem(configId), [configId]);

  const [hindiOn, setHindiOn] = useState(true);
  const [faqItems, setFaqItems] = useState([]);
  const [programRows, setProgramRows] = useState(PROGRAM_PRICING);
  const [subRows, setSubRows] = useState(SUBSCRIPTION_PRICING);
  const [gstOn, setGstOn] = useState(true);
  const [gateways, setGateways] = useState(createDefaultGateways);
  const [tosCopy, setTosCopy] = useState(TOS_CONTENT);
  const [dpaCopy, setDpaCopy] = useState(DPA_CONTENT);
  const [measurementGuide, setMeasurementGuide] = useState(MEASUREMENT_GUIDE);
  const [measurementParams, setMeasurementParams] = useState(MEASUREMENT_PARAMETERS);
  const [measurementGallery, setMeasurementGallery] = useState(MEASUREMENT_GALLERY);
  const [onboardingCoaches, setOnboardingCoaches] = useState(ONBOARDING_COACHES);
  const [onboardingSelectedCoachId, setOnboardingSelectedCoachId] = useState("wc01");
  const [onboardingGallery, setOnboardingGallery] = useState(ONBOARDING_GALLERY);
  const [medicalQuestions, setMedicalQuestions] = useState(MEDICAL_QUESTIONNAIRE);
  const [healthTrackers, setHealthTrackers] = useState(HEALTH_TRACKERS);
  const [drfFormSections, setDrfFormSections] = useState(DRF_FORM_SECTIONS);
  const [commitmentText, setCommitmentText] = useState(COMMITMENT_LETTER_DEFAULT);
  const [savedCommitmentText, setSavedCommitmentText] = useState("");
  const [commitmentCoaches] = useState(COMMITMENT_COACH_SIGNOFFS);
  const [dietPlans, setDietPlans] = useState(DIET_PLANS);
  const [nutritionBank, setNutritionBank] = useState(NUTRITION_BANK);
  const [rxProtocols, setRxProtocols] = useState(RX_BANK_PROTOCOLS);
  const [galleryMedia, setGalleryMedia] = useState(GALLERY_MEDIA);
  const [launchRatings, setLaunchRatings] = useState(LAUNCH_CONFIG_RATINGS);
  const [launchDomains, setLaunchDomains] = useState(LAUNCH_CONFIG_DOMAINS);
  const [aiCoaches, setAiCoaches] = useState(AI_ENABLE_COACHES);
  const [aiAssistants, setAiAssistants] = useState(AI_ENABLE_ASSISTANTS);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  if (!found) {
    return <Navigate to={UPDATED_ADMIN_PATHS.configs} replace />;
  }

  const { item, groupName } = found;
  const activeGateway = item.id === "app-payment-gateway" ? activePaymentGateway(gateways) : null;
  const summaryOn =
    item.id === "app-language-disable"
      ? hindiOn
      : item.id === "app-gst"
        ? gstOn
        : item.id === "app-payment-gateway"
          ? activeGateway?.name ?? false
          : item.id === "app-measurement-video"
            ? measurementGuide.live
          : item.id === "app-onboarding-video"
            ? onboardingCoaches.some((entry) => entry.live)
        : item.id === "app-faq"
          ? faqItems.some((entry) => entry.shown)
          : item.id === "app-medical-questionnaire"
            ? medicalQuestions.some((entry) => entry.shown)
            : item.id === "app-health-progress"
              ? healthTrackers.some((entry) => entry.enabled)
              : item.id === "app-drf-bank"
                ? drfFormSections.some(
                    (section) =>
                      section.live && section.questions.some((entry) => entry.enabled),
                  )
              : item.id === "app-diet-plans"
                ? dietPlans.some((entry) => entry.live)
              : item.id === "app-nutrition-bank"
                ? nutritionBank.length > 0
              : item.id === "app-rx-bank"
                ? rxProtocols.some((entry) => entry.live)
              : item.id === "app-gallery"
                ? galleryMedia.some((entry) => entry.live)
              : item.id === "app-launch"
                ? launchDomains.some(
                    (domain) =>
                      domain.live && domain.questions.some((entry) => entry.enabled),
                  )
              : item.id === "app-ai-enable"
                ? aiCoaches.some((entry) => entry.enabled)
                  || aiAssistants.some((entry) => entry.enabled)
          : item.toggleable === false
            ? Boolean(item.live)
            : Boolean(item.on);
  const showPreview = PREVIEW_CONFIGS.has(item.id);

  function renderBody() {
    switch (item.id) {
      case "app-language-disable":
        return <LanguagePanel hindiOn={hindiOn} onToggle={setHindiOn} onToast={onToast} />;
      case "app-faq":
        return <FaqConfigPanel items={faqItems} setItems={setFaqItems} onToast={onToast} />;
      case "app-program":
        return (
          <>
            <ExchangeClientSection onToast={onToast} programOptions={programRows} showAppHeal />
            <PricingPanel
              title="Program pricing & discount validity"
              rows={programRows}
              setRows={setProgramRows}
              onToast={onToast}
            />
            <TagCreatePanel
              title="App Heal feature validity"
              subtitle="These appear in the coach's App Heal validity dropdown."
              tags={APP_HEAL_PERIODS}
              placeholder="e.g. 3 years"
              createLabel="+ Create period"
              coachesToggle
              onToast={onToast}
            />
            <TagCreatePanel
              title="Validity periods available to coaches"
              subtitle="These appear in the coach's validity dropdown at checkout."
              tags={VALIDITY_PERIODS}
              placeholder="e.g. 96 hours"
              createLabel="+ Create period"
              coachesToggle
              onToast={onToast}
            />
            <TagCreatePanel
              title="Discount slabs available to coaches"
              subtitle="These appear in the coach's discount dropdown."
              tags={DISCOUNT_SLABS}
              placeholder="e.g. 30% · launch"
              createLabel="+ Create slab"
              onToast={onToast}
            />
          </>
        );
      case "app-subscriptions":
        return (
          <>
            <ExchangeClientSection
              onToast={onToast}
              programOptions={subRows}
              programLabel="Subscription"
              showAppHeal={false}
            />
            <PricingPanel
              title="Subscription pricing & discount validity"
              rows={subRows}
              setRows={setSubRows}
              onToast={onToast}
              formTitle="New subscription"
              namePlaceholder="Subscription name"
            />
            <TagCreatePanel
              title="Validity periods available to coaches"
              subtitle="These appear in the coach's validity dropdown at checkout."
              tags={VALIDITY_PERIODS}
              placeholder="e.g. 96 hours"
              createLabel="+ Create period"
              coachesToggle
              onToast={onToast}
            />
            <TagCreatePanel
              title="Discount slabs available to coaches"
              subtitle="These appear in the coach's discount dropdown."
              tags={DISCOUNT_SLABS}
              placeholder="e.g. 30% · launch"
              createLabel="+ Create slab"
              onToast={onToast}
            />
          </>
        );
      case "app-gst":
        return <GstPanel on={gstOn} onToggle={setGstOn} onToast={onToast} />;
      case "app-payment-gateway":
        return (
          <PaymentGatewayPanel
            gateways={gateways}
            setGateways={setGateways}
            onToast={onToast}
          />
        );
      case "app-tos":
        return (
          <LegalTextPanel
            title="Terms of service"
            copy={tosCopy}
            onChange={setTosCopy}
            onToast={onToast}
          />
        );
      case "app-dpa":
        return (
          <LegalTextPanel
            title="Data processing agreement"
            copy={dpaCopy}
            onChange={setDpaCopy}
            onToast={onToast}
          />
        );
      case "app-measurement-video":
        return (
          <MeasurementVideoSection
            guide={measurementGuide}
            setGuide={setMeasurementGuide}
            parameters={measurementParams}
            setParameters={setMeasurementParams}
            gallery={measurementGallery}
            setGallery={setMeasurementGallery}
            onToast={onToast}
          />
        );
      case "app-onboarding-video":
        return (
          <OnboardingVideoSection
            coaches={onboardingCoaches}
            setCoaches={setOnboardingCoaches}
            selectedCoachId={onboardingSelectedCoachId}
            setSelectedCoachId={setOnboardingSelectedCoachId}
            gallery={onboardingGallery}
            setGallery={setOnboardingGallery}
            onToast={onToast}
          />
        );
      case "app-medical-questionnaire":
        return (
          <MedicalQuestionnairePanel
            items={medicalQuestions}
            setItems={setMedicalQuestions}
            onToast={onToast}
          />
        );
      case "app-health-progress":
        return (
          <HealthProgressTrackersPanel
            items={healthTrackers}
            setItems={setHealthTrackers}
            onToast={onToast}
          />
        );
      case "app-drf-bank":
        return (
          <DrfBankSection
            sections={drfFormSections}
            setSections={setDrfFormSections}
            onToast={onToast}
          />
        );
      case "app-commitment-letter":
        return (
          <CommitmentLetterSection
            text={commitmentText}
            setText={setCommitmentText}
            savedText={savedCommitmentText}
            setSavedText={setSavedCommitmentText}
            coaches={commitmentCoaches}
            onToast={onToast}
          />
        );
      case "app-diet-plans":
        return (
          <DietPlansSection
            plans={dietPlans}
            setPlans={setDietPlans}
            onToast={onToast}
          />
        );
      case "app-nutrition-bank":
        return (
          <NutritionBankSection
            items={nutritionBank}
            setItems={setNutritionBank}
            onToast={onToast}
          />
        );
      case "app-rx-bank":
        return (
          <RxBankSection
            protocols={rxProtocols}
            setProtocols={setRxProtocols}
            onToast={onToast}
          />
        );
      case "app-gallery":
        return (
          <GallerySection
            media={galleryMedia}
            setMedia={setGalleryMedia}
            onToast={onToast}
          />
        );
      case "app-launch":
        return (
          <LaunchSection
            ratings={launchRatings}
            setRatings={setLaunchRatings}
            domains={launchDomains}
            setDomains={setLaunchDomains}
            onToast={onToast}
          />
        );
      case "app-ai-enable":
        return (
          <AiEnableSection
            coaches={aiCoaches}
            setCoaches={setAiCoaches}
            assistants={aiAssistants}
            setAssistants={setAiAssistants}
            onToast={onToast}
          />
        );
      default:
        return <GenericPanel item={item} />;
    }
  }

  return (
    <main className="content ua-page-enter ua-cfg-detail">
      <Link to={UPDATED_ADMIN_PATHS.configs} className="ua-cfg-detail__back">
        ← Configs
      </Link>
      <PageHeader
        title={item.name}
        subtitle={item.note}
        actions={showPreview ? (
          <PreviewActions
            item={item}
            onOpen={() => setPreviewOpen(true)}
            onPublish={() => setPublishOpen(true)}
            canPublish
          />
        ) : null}
      />

      <ConfigPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        item={item}
        previewState={{
          hindiOn,
          faqItems,
          programRows,
          subscriptionRows: subRows,
          gstOn,
          gateways,
          activeGateway,
          tosCopy,
          dpaCopy,
          measurementGuide,
          measurementParams,
          onboardingCoaches,
          onboardingSelectedCoachId,
          medicalQuestions,
          healthTrackers,
          dietPlans,
          nutritionBank,
          drfFormSections,
          rxProtocols,
          commitmentText,
          galleryMedia,
          launchRatings,
          launchDomains,
          aiCoaches,
          aiAssistants,
        }}
      />

      <ConfigPublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        item={item}
        onConfirm={() => onToast(`${item.name} published`)}
      />

      <div className="ua-cfg-detail__body">
        <ConfigSummary item={item} groupName={groupName} on={summaryOn} />
        {renderBody()}
      </div>
    </main>
  );
}
