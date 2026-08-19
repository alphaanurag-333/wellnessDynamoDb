import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Link, useOutletContext, useParams } from "react-router-dom";
import { ConfigPreviewModal, previewHintForItem } from "../components/ConfigPreviewModal.jsx";
import { ConfigPublishModal } from "../components/ConfigPublishModal.jsx";
import { ProgramSetupModal } from "../components/ProgramSetupModal.jsx";
import {
  MeasurementVideoSection,
  MEASUREMENT_GUIDE,
  MEASUREMENT_PARAMETERS,
} from "../components/MeasurementVideoSection.jsx";
import {
  OnboardingVideoSection,
  ONBOARDING_COACHES,
} from "../components/OnboardingVideoSection.jsx";
import { HealthProgressTrackersPanel } from "../components/ConfigAppRemainingSections.jsx";
import { MedicalQuestionnairePanel } from "../components/MedicalQuestionnairePanel.jsx";
import {
  CommitmentLetterSection,
  COMMITMENT_LETTER_DEFAULT,
} from "../components/CommitmentLetterSection.jsx";
import { DietPlansSection } from "../components/DietPlansSection.jsx";
import { TestCatalogSection } from "../components/TestCatalogSection.jsx";
import { DrfBankSection } from "../components/DrfBankSection.jsx";
import { GallerySection, GALLERY_MEDIA } from "../components/GallerySection.jsx";
import { AiEnableSection } from "../components/AiEnableSection.jsx";
import { PaymentGatewaySection } from "../components/PaymentGatewaySection.jsx";
import { LanguageDisableSection } from "../components/LanguageDisableSection.jsx";
import { GstSection } from "../components/GstSection.jsx";
import { DpaSection } from "../components/DpaSection.jsx";
import { AppTosSection } from "../components/AppTosSection.jsx";
import { PrivacyPolicySection } from "../components/PrivacyPolicySection.jsx";
import { TermsAndConditionsSection } from "../components/TermsAndConditionsSection.jsx";
import { CommunityGuidelinesSection } from "../components/CommunityGuidelinesSection.jsx";
import { LegalSectionsEditor } from "../components/LegalSectionsEditor.jsx";
import { LaunchSection } from "../components/LaunchSection.jsx";
import { NutritionBankSection } from "../components/NutritionBankSection.jsx";
import { FeatureFlagsSection } from "../components/FeatureFlagsSection.jsx";
import { DynamicProgramTestimonialsSection } from "../components/DynamicProgramTestimonialsSection.jsx";
import { FooterSettingSection } from "../components/FooterSettingSection.jsx";
import { SocialLinksSection } from "../components/SocialLinksSection.jsx";
import { LegalBlocksSection } from "../components/LegalBlocksSection.jsx";
import { ContactDetailsSection } from "../components/ContactDetailsSection.jsx";
import { AppContentSection } from "../components/AppContentSection.jsx";
import { LogoSlotsSection } from "../components/LogoSlotsSection.jsx";
import { LocationsSection } from "../components/LocationsSection.jsx";
import { BannerSection } from "../components/BannerSection.jsx";
import { DynamicChampionSection } from "../components/DynamicChampionSection.jsx";
import { DynamicBirthdaySection } from "../components/DynamicBirthdaySection.jsx";
import { DynamicTransformationSection } from "../components/DynamicTransformationSection.jsx";
import { DynamicClientReviewSection } from "../components/DynamicClientReviewSection.jsx";
import { DynamicRealPeopleSection } from "../components/DynamicRealPeopleSection.jsx";
import { DynamicVoiceOfHealingSection } from "../components/DynamicVoiceOfHealingSection.jsx";
import { DynamicCofounderSection } from "../components/DynamicCofounderSection.jsx";
import { AboutSection } from "../components/AboutSection.jsx";
import { DynamicLeadershipSection } from "../components/DynamicLeadershipSection.jsx";
import { DynamicWellnessTeamSection } from "../components/DynamicWellnessTeamSection.jsx";
import { DynamicGoogleReviewSection } from "../components/DynamicGoogleReviewSection.jsx";
import { DropdownsSection } from "../components/DropdownsSection.jsx";
import { RecipesSection } from "../components/RecipesSection.jsx";
import { YogaSection } from "../components/YogaSection.jsx";
import { WellnessLibrarySection } from "../components/WellnessLibrarySection.jsx";
import { DynamicBlogsSection } from "../components/DynamicBlogsSection.jsx";
import { RxBankSection } from "../components/RxBankSection.jsx";
import { FaqConfigPanel } from "../components/FaqConfigPanel.jsx";
import { FEATURE_FLAGS } from "../data/featureFlagsData.js";
import { WEBSITE_FOOTER_LINKS } from "../data/websiteLinksConfigData.js";
import { PRIVACY_BLOCKS } from "../data/privacyConfigData.js";
import { TOS_BLOCKS } from "../data/tosConfigData.js";
import { GUIDELINE_BLOCKS } from "../data/guidelinesConfigData.js";
import { CONTACT_DETAILS, CONTACT_PAGE_BLOCKS } from "../data/contactConfigData.js";
import { FOOTER_TEXT_BLOCKS } from "../data/footerTextConfigData.js";
import { createDefaultLogoSlots } from "../data/logoConfigData.js";
import { LOCATIONS } from "../data/locationConfigData.js";
import { emptyBannerEditor } from "../data/bannerConfigData.js";
import { TRANSFORMATION_EDITOR } from "../data/transformationConfigData.js";
import { CLIENT_REVIEW_EDITOR } from "../data/clientReviewConfigData.js";
import { REAL_PEOPLE_EDITOR } from "../data/realPeopleConfigData.js";
import { VOICE_EDITOR } from "../data/voiceConfigData.js";
import {
  COFOUNDER_EDITOR,
} from "../data/cofounderConfigData.js";
import { editorFromCofounder } from "../api/cofounderMessageApi.js";
import { ABOUT_BLOCKS } from "../data/aboutConfigData.js";
import {
  RECIPES_EDITOR,
} from "../data/recipesConfigData.js";
import {
  YOGA_EDITOR,
} from "../data/yogaConfigData.js";
import {
  BLOGS_EDITOR,
} from "../data/blogsConfigData.js";
import { PageHeader } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { DEFAULT_HEALTH_PROGRESS_TRACKERS } from "../data/healthProgressData.js";
import {
  APP_HEAL_PERIODS,
  DISCOUNT_SLABS,
  PROGRAM_PRICING,
  SUBSCRIPTION_PRICING,
  VALIDITY_PERIODS,
  activePaymentGateway,
  createDefaultGateways,
  APP_TOS_BLOCKS,
  APP_DPA_BLOCKS,
} from "../data/configDetailData.js";
import { findConfigItem, getConfigStateLabel } from "../data/configsData.js";
import { formatRupee } from "../data/exchangeData.js";
import {
  getCoachCheckoutOptions,
  listCoachCheckoutStaff,
  listRecentPwc,
  lookupCoachCheckoutClient,
  saveCoachCheckoutOptions,
  triggerCoachCheckout,
} from "../api/appProgramApi.js";
import { getAppContent } from "../api/appContentApi.js";

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
        <div className="ua-cfg-panel__copy">
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ClientLookupPanel({
  onToast,
  externalCode,
  programOptions,
  programLabel = "Program",
  showAppHeal = true,
  discountSlabs,
  appHealPeriods,
  validityPeriods,
  productType = "program",
  coaches,
  assistants,
}) {
  const [code, setCode] = useState("");
  const [client, setClient] = useState(null);
  const [programId, setProgramId] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);

  async function performLookup(rawCode) {
    const key = rawCode.trim();
    if (!key) {
      setClient(null);
      setProgramId("");
      return false;
    }
    setLookingUp(true);
    try {
      const hit = await lookupCoachCheckoutClient(key);
      setClient(hit);
      setProgramId("");
      return true;
    } catch (error) {
      setClient(null);
      setProgramId("");
      throw error;
    } finally {
      setLookingUp(false);
    }
  }

  useEffect(() => {
    if (!externalCode) return undefined;
    let active = true;
    setCode(externalCode);
    lookupCoachCheckoutClient(externalCode)
      .then((hit) => {
        if (!active) return;
        setClient(hit);
        setProgramId("");
        onToast("Client loaded");
      })
      .catch((error) => {
        if (active) onToast(error.message || "No client found for that code");
      });
    return () => {
      active = false;
    };
  }, [externalCode, onToast]);

  async function lookup() {
    try {
      const found = await performLookup(code);
      onToast(found ? "Client loaded" : "Enter a referral code");
    } catch (error) {
      onToast(error.message || "No client found for that code");
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
          placeholder="Client referral code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") lookup();
          }}
        />
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={lookup} disabled={lookingUp}>
          {lookingUp ? "Looking up…" : "Look up"}
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
              <option value="">Choose a {programLabel.toLowerCase()}…</option>
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
      saving={saving}
      onSave={async (setup) => {
        setSaving(true);
        try {
          const result = await triggerCoachCheckout({
            userId: client.id,
            productType,
            itemId: setup.program.id,
            discountPercent: setup.discount.pct,
            discountLabel: setup.discount.label,
            linkValidity: setup.linkValidity,
            appHealValidity: setup.appHealValidity,
            wellnessCoachId: setup.wellnessCoachId,
            assistantCoachId: setup.assistantCoachId,
          });
          onToast(result.message || `${setup.program.name} triggered for ${client.name}`);
          setSetupOpen(false);
        } catch (error) {
          onToast(error.message || "Could not trigger checkout");
        } finally {
          setSaving(false);
        }
      }}
      program={selectedProgram}
      client={client}
      showAppHeal={showAppHeal}
      discountSlabs={discountSlabs}
      appHealPeriods={appHealPeriods}
      validityPeriods={validityPeriods}
      coaches={coaches}
      assistants={assistants}
    />
    </>
  );
}

function PricingNewForm({
  draft,
  onChange,
  onClose,
  onSubmit,
  formTitle,
  namePlaceholder,
  inputRef,
  includeDiscount,
  includeDays,
}) {
  return (
    <section className="ua-cfg-pricing-new">
      <div className="ua-cfg-pricing-new__head">
        <h4 className="ua-cfg-pricing-new__title">
          <span className="ua-cfg-pricing-new__icon" aria-hidden="true" />
          {formTitle}
        </h4>
        <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className={`ua-cfg-pricing-new__row${includeDiscount ? " ua-cfg-pricing-new__row--discount" : ""}${includeDays ? " ua-cfg-pricing-new__row--days" : ""}`}>
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
        {includeDiscount ? (
          <>
            <label className="ua-cfg-pricing-new__amount">
              <input
                type="text"
                inputMode="numeric"
                value={draft.discountPercent}
                aria-label="Discount percentage"
                onChange={(event) => onChange({
                  ...draft,
                  discountPercent: event.target.value.replace(/[^\d]/g, ""),
                })}
              />
              <span className="ua-cfg-pricing-new__amount-label">Discount %</span>
            </label>
            <label className="ua-cfg-pricing-new__amount">
              <input
                type="text"
                inputMode="numeric"
                value={draft.validityHours}
                aria-label="Discount validity in hours"
                onChange={(event) => onChange({
                  ...draft,
                  validityHours: event.target.value.replace(/[^\d]/g, ""),
                })}
              />
              <span className="ua-cfg-pricing-new__amount-label">Hours</span>
            </label>
          </>
        ) : null}
        {includeDays ? (
          <label className="ua-cfg-pricing-new__amount">
            <input
              type="text"
              inputMode="numeric"
              value={draft.days}
              aria-label="Number of days"
              onChange={(event) => onChange({
                ...draft,
                days: event.target.value.replace(/[^\d]/g, ""),
              })}
            />
            <span className="ua-cfg-pricing-new__amount-label">Days</span>
          </label>
        ) : null}
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onSubmit}>
          Add
        </button>
      </div>
    </section>
  );
}

function emptyPricingDraft() {
  return { name: "", amount: "", discountPercent: "", validityHours: "", days: "" };
}

function validatePricingDraft(draft, { includeDiscount, includeDays, onToast }) {
  const name = draft.name.trim();
  const amount = Number(draft.amount);
  const discountPercent = Number(draft.discountPercent);
  const validityHours = Number(draft.validityHours);
  const days = Number(draft.days);
  if (!name) {
    onToast("Program name is required");
    return null;
  }
  if (!amount || amount <= 0) {
    onToast("Enter a valid amount");
    return null;
  }
  if (includeDiscount && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)) {
    onToast("Discount must be between 0% and 100%");
    return null;
  }
  if (includeDiscount && (!Number.isInteger(validityHours) || validityHours <= 0)) {
    onToast("Enter discount validity in whole hours");
    return null;
  }
  if (includeDays && draft.days !== "" && (!Number.isInteger(days) || days <= 0)) {
    onToast("Enter a valid number of days");
    return null;
  }
  return {
    name,
    amount,
    ...(includeDiscount ? { discountPercent, validityHours } : {}),
    ...(includeDays && draft.days !== "" ? { days } : {}),
  };
}

function PricingEditableCell({
  row,
  field,
  display,
  editing,
  value,
  onStart,
  onChange,
  onSave,
  onCancel,
  inputRef,
  disabled = false,
  numeric = false,
}) {
  const classPrefix = numeric ? "ua-cfg-pricing__amount" : "ua-cfg-pricing__name";
  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        className={`${classPrefix}-input`}
        value={value}
        aria-label={`Edit ${field} for ${row.name}`}
        onChange={(event) => {
          const next = event.target.value;
          onChange(numeric ? next.replace(/[^\d]/g, "") : next);
        }}
        onBlur={onSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`${classPrefix}-btn`}
      onClick={onStart}
      disabled={disabled}
      aria-label={`Edit ${field} for ${row.name}`}
    >
      {display}
    </button>
  );
}

function PricingPanel({
  title,
  rows,
  setRows,
  onToast,
  onPersist,
  addLabel = "+ Add program",
  formTitle = "New program",
  namePlaceholder = "Program name",
  includeDiscount = false,
  includeDays = false,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState(emptyPricingDraft);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const addFormRef = useRef(null);
  const nameInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const skipSaveRef = useRef(false);

  useEffect(() => {
    if (!showAddForm) return undefined;
    const timer = window.setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      nameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showAddForm]);

  useEffect(() => {
    if (!editingCell) return undefined;
    const timer = window.setTimeout(() => {
      const input = amountInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editingCell]);

  function closeAddForm() {
    setShowAddForm(false);
    setDraft(emptyPricingDraft());
  }

  function cancelEdit() {
    skipSaveRef.current = true;
    setEditingCell(null);
    setEditValue("");
  }

  function startEdit(row, field) {
    if (saving) return;
    skipSaveRef.current = false;
    setShowAddForm(false);
    setDraft(emptyPricingDraft());
    setEditingCell({ id: row.id, field });
    setEditValue(String(row[field] ?? ""));
  }

  async function commitRows(nextRows, successMessage) {
    const previousRows = rows;
    setRows(nextRows);
    if (!onPersist) {
      onToast(successMessage);
      return;
    }
    setSaving(true);
    try {
      const saved = await onPersist(nextRows);
      if (Array.isArray(saved)) setRows(saved);
      onToast(successMessage);
    } catch (error) {
      setRows(previousRows);
      onToast(error.message || "Could not save pricing");
    } finally {
      setSaving(false);
    }
  }

  function submitNewRow() {
    const next = validatePricingDraft(draft, { includeDiscount, includeDays, onToast });
    if (!next) return;
    const nextRows = [
      ...rows,
      {
        id: `program-${Date.now()}`,
        ...next,
      },
    ];
    closeAddForm();
    commitRows(nextRows, `${next.name} added`);
  }

  function saveEdit() {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (!editingCell) return;
    const { id, field } = editingCell;
    const row = rows.find((entry) => entry.id === id);
    if (!row) {
      cancelEdit();
      return;
    }

    let nextValue;
    if (field === "name") {
      nextValue = editValue.trim();
      if (!nextValue) {
        onToast("Program name is required");
        cancelEdit();
        return;
      }
      const duplicate = rows.some(
        (entry) => entry.id !== id && entry.name.trim().toLowerCase() === nextValue.toLowerCase(),
      );
      if (duplicate) {
        onToast(`${nextValue} already exists`);
        cancelEdit();
        return;
      }
    } else {
      nextValue = Number(editValue);
      if (field === "amount") {
        if (!nextValue || nextValue <= 0) {
          onToast("Enter a valid amount");
          cancelEdit();
          return;
        }
      } else if (field === "discountPercent") {
        if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > 100) {
          onToast("Discount must be between 0% and 100%");
          cancelEdit();
          return;
        }
      } else if (field === "validityHours") {
        if (!Number.isInteger(nextValue) || nextValue <= 0) {
          onToast("Enter discount validity in whole hours");
          cancelEdit();
          return;
        }
      } else if (field === "days") {
        if (!Number.isInteger(nextValue) || nextValue <= 0) {
          onToast("Enter a valid number of days");
          cancelEdit();
          return;
        }
      }
    }

    if (row[field] === nextValue || (field !== "name" && Number(row[field]) === nextValue)) {
      cancelEdit();
      return;
    }

    const nextRows = rows.map((entry) => (
      entry.id === id ? { ...entry, [field]: nextValue } : entry
    ));
    cancelEdit();
    commitRows(nextRows, `${field === "name" ? nextValue : row.name} updated`);
  }

  return (
    <Panel
      title={title}
      subtitle="Admin sets the amount, the discount %, and how long that discount stays valid."
      actions={(
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline"
          disabled={saving}
          onClick={() => {
            cancelEdit();
            setShowAddForm(true);
          }}
        >
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
            includeDiscount={includeDiscount}
            includeDays={includeDays}
          />
        </div>
      ) : null}
      <div className="ua-cfg-pricing bordercss">
        <div className={`ua-cfg-pricing__head${includeDiscount ? " ua-cfg-pricing__head--discount" : ""}${includeDays ? " ua-cfg-pricing__head--days" : ""}`}>
          <span>Program</span>
          <span>Amount (Rs.)</span>
          {includeDiscount ? <span>Discount</span> : null}
          {includeDiscount ? <span>Valid for</span> : null}
          {includeDays ? <span>Days</span> : null}
          <span aria-hidden="true" />
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={`ua-cfg-pricing__row${includeDiscount ? " ua-cfg-pricing__row--discount" : ""}${includeDays ? " ua-cfg-pricing__row--days" : ""}`}
          >
            <PricingEditableCell
              row={row}
              field="name"
              display={row.name}
              editing={editingCell?.id === row.id && editingCell?.field === "name"}
              value={editValue}
              onStart={() => startEdit(row, "name")}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              inputRef={editingCell?.id === row.id && editingCell?.field === "name" ? amountInputRef : null}
              disabled={saving}
            />
            <PricingEditableCell
              row={row}
              field="amount"
              display={formatRupee(row.amount)}
              editing={editingCell?.id === row.id && editingCell?.field === "amount"}
              value={editValue}
              onStart={() => startEdit(row, "amount")}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              inputRef={editingCell?.id === row.id && editingCell?.field === "amount" ? amountInputRef : null}
              disabled={saving}
              numeric
            />
            {includeDiscount ? (
              <PricingEditableCell
                row={row}
                field="discountPercent"
                display={`${row.discountPercent}%`}
                editing={editingCell?.id === row.id && editingCell?.field === "discountPercent"}
                value={editValue}
                onStart={() => startEdit(row, "discountPercent")}
                onChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                inputRef={editingCell?.id === row.id && editingCell?.field === "discountPercent" ? amountInputRef : null}
                disabled={saving}
                numeric
              />
            ) : null}
            {includeDiscount ? (
              <PricingEditableCell
                row={row}
                field="validityHours"
                display={`${row.validityHours} hours`}
                editing={editingCell?.id === row.id && editingCell?.field === "validityHours"}
                value={editValue}
                onStart={() => startEdit(row, "validityHours")}
                onChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                inputRef={editingCell?.id === row.id && editingCell?.field === "validityHours" ? amountInputRef : null}
                disabled={saving}
                numeric
              />
            ) : null}
            {includeDays ? (
              <PricingEditableCell
                row={row}
                field="days"
                display={row.days ? `${row.days} days` : "—"}
                editing={editingCell?.id === row.id && editingCell?.field === "days"}
                value={editValue}
                onStart={() => startEdit(row, "days")}
                onChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                inputRef={editingCell?.id === row.id && editingCell?.field === "days" ? amountInputRef : null}
                disabled={saving}
                numeric
              />
            ) : null}
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label={`Remove ${row.name}`}
              disabled={saving}
              onClick={() => {
                if (editingCell?.id === row.id) cancelEdit();
                commitRows(
                  rows.filter((entry) => entry.id !== row.id),
                  `${row.name} removed`,
                );
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

function itemLabel(item) {
  return typeof item === "string" ? item : `${item.pct}% · ${item.label}`;
}

function parseDiscountSlab(value) {
  const match = value.match(/^(\d+(?:\.\d+)?)\s*%?\s*(?:[·:—–-]\s*)?(.+)$/);
  if (!match) return null;
  const pct = Number(match[1]);
  const label = match[2].trim();
  if (!Number.isFinite(pct) || pct < 0 || pct > 100 || !label) return null;
  return { pct, label };
}

function TagCreatePanel({
  title,
  subtitle,
  items,
  setItems,
  placeholder,
  createLabel,
  coachesToggle,
  coachAdd,
  setCoachAdd,
  parseItem,
  onToast,
}) {
  const [draft, setDraft] = useState("");

  function createItem() {
    const value = draft.trim();
    if (!value) return;
    const nextItem = parseItem ? parseItem(value) : value;
    if (!nextItem) {
      onToast("Use a percentage and label, for example 30% · launch");
      return;
    }
    const label = itemLabel(nextItem);
    if (items.some((item) => itemLabel(item).toLowerCase() === label.toLowerCase())) {
      onToast(`${label} already exists`);
      return;
    }
    if (
      typeof nextItem !== "string"
      && items.some((item) => typeof item !== "string" && item.pct === nextItem.pct)
    ) {
      onToast(`${nextItem.pct}% already has a discount slab`);
      return;
    }
    setItems((prev) => [...prev, nextItem]);
    setDraft("");
    onToast(`${label} added`);
  }

  function removeItem(item) {
    const label = itemLabel(item);
    if (items.length === 1) {
      onToast(`${title} must keep at least one option`);
      return;
    }
    setItems((prev) => prev.filter((entry) => itemLabel(entry) !== label));
    onToast(`${label} removed`);
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
          <span key={itemLabel(tag)} className="ua-cfg-tag">
            {itemLabel(tag)}
            <button
              type="button"
              className="ua-cfg-tag__remove"
              aria-label={`Remove ${itemLabel(tag)}`}
              onClick={() => removeItem(tag)}
            >
              ×
            </button>
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

function PwcPanel({ onToast, onUseCode, coaches }) {
  const [coachId, setCoachId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listRecentPwc(coachId)
      .then((items) => {
        if (active) setRows(items);
      })
      .catch((error) => {
        if (active) onToast(error.message || "Could not load recent PWC completions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [coachId, onToast]);

  return (
    <Panel
      title="PWC completed · last 24 hours"
      subtitle={(
        <>
          Clients who finished their programme-wise consult — ready to raise an <strong>exchange</strong>.
        </>
      )}
      actions={(
        <select
          className="ua-cfg-lookup__select"
          value={coachId}
          onChange={(event) => setCoachId(event.target.value)}
          aria-label="Filter by coach"
        >
          <option value="">All coaches</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name}
            </option>
          ))}
        </select>
      )}
    >
      <div className="ua-cfg-pwc-list">
        {loading ? (
          <div className="ua-cfg-lookup__empty">Loading recent completions…</div>
        ) : rows.length === 0 ? (
          <div className="ua-cfg-lookup__empty">No programme-wise consults completed in the last 24 hours.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="ua-cfg-pwc">
            <span className="ua-cfg-pwc__avatar">{row.initials}</span>
            <div className="ua-cfg-pwc__main">
              <strong>{row.name}</strong>
              <span>{row.consult} · {row.code}</span>
            </div>
            <span className="ua-cfg-pwc__coach">{row.coach || "Unassigned"}</span>
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
  discountSlabs,
  appHealPeriods,
  validityPeriods,
  productType = "program",
}) {
  const [referralCode, setReferralCode] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [assistants, setAssistants] = useState([]);

  useEffect(() => {
    let active = true;
    listCoachCheckoutStaff()
      .then((staff) => {
        if (!active) return;
        setCoaches(staff.coaches);
        setAssistants(staff.assistants);
      })
      .catch((error) => {
        if (active) onToast(error.message || "Could not load coaches");
      });
    return () => {
      active = false;
    };
  }, [onToast]);

  return (
    <>
      <PwcPanel onToast={onToast} onUseCode={setReferralCode} coaches={coaches} />
      <ClientLookupPanel
        onToast={onToast}
        externalCode={referralCode}
        programOptions={programOptions}
        programLabel={programLabel}
        showAppHeal={showAppHeal}
        discountSlabs={discountSlabs}
        appHealPeriods={appHealPeriods}
        validityPeriods={validityPeriods}
        productType={productType}
        coaches={coaches}
        assistants={assistants}
      />
    </>
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
  "app-test-catalog",
  "app-nutrition-bank",
  "app-rx-bank",
  "app-gallery",
  "app-launch",
  "app-ai-enable",
  "feature-flags",
  "web-program-testimonials",
  "web-footer",
  "web-fs-social",
  "web-fs-links",
  "web-fs-privacy",
  "web-fs-tos",
  "web-fs-guidelines",
  "web-fs-contact",
  "web-fs-text",
  "web-logo",
  "web-location",
  "common-banner",
  "common-champion",
  "common-birthday",
  "common-transformation",
  "common-client-review",
  "common-real-people",
  "common-voice",
  "common-cofounder",
  "common-leadership",
  "common-wellness-team",
  "common-about",
  "common-google-review",
  "common-dropdowns",
  "common-recipes",
  "common-yoga",
  "common-blogs",
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

function configPermissionPrefix(configId) {
  if (configId === "common-banner") return "bn";
  if (
    configId === "web-program-testimonials" ||
    configId === "common-champion" ||
    configId === "common-birthday" ||
    configId === "common-transformation" ||
    configId === "common-client-review" ||
    configId === "common-real-people" ||
    configId === "common-voice" ||
    configId === "common-cofounder" ||
    configId === "common-leadership" ||
    configId === "common-wellness-team" ||
    configId === "common-about" ||
    configId === "common-google-review" ||
    configId === "common-recipes" ||
    configId === "common-yoga" ||
    configId === "common-blogs"
  ) {
    return "ct";
  }
  return "cf";
}

export function ConfigDetailPage() {
  const { configId } = useParams();
  const { showToast: onToast } = useOutletContext();
  const { can } = useViewAs();
  const found = useMemo(() => findConfigItem(configId), [configId]);

  const [hindiOn, setHindiOn] = useState(false);
  const [faqItems, setFaqItems] = useState([]);
  const [programRows, setProgramRows] = useState(PROGRAM_PRICING);
  const [subRows, setSubRows] = useState(SUBSCRIPTION_PRICING);
  const [programValidityPeriods, setProgramValidityPeriods] = useState(VALIDITY_PERIODS);
  const [programDiscountSlabs, setProgramDiscountSlabs] = useState(DISCOUNT_SLABS);
  const [subscriptionValidityPeriods, setSubscriptionValidityPeriods] = useState(VALIDITY_PERIODS);
  const [subscriptionDiscountSlabs, setSubscriptionDiscountSlabs] = useState(DISCOUNT_SLABS);
  const [appHealPeriods, setAppHealPeriods] = useState(APP_HEAL_PERIODS);
  const [coachesCanAddProgramValidity, setCoachesCanAddProgramValidity] = useState(true);
  const [coachesCanAddSubscriptionValidity, setCoachesCanAddSubscriptionValidity] = useState(true);
  const [coachesCanAddAppHeal, setCoachesCanAddAppHeal] = useState(true);
  const [gstOn, setGstOn] = useState(false);
  const [gstPercent, setGstPercent] = useState("18");
  const [gateways, setGateways] = useState(createDefaultGateways);
  const [appTosBlocks, setAppTosBlocks] = useState(APP_TOS_BLOCKS);
  const [dpaBlocks, setDpaBlocks] = useState(APP_DPA_BLOCKS);
  const [measurementGuide, setMeasurementGuide] = useState(MEASUREMENT_GUIDE);
  const [measurementParams, setMeasurementParams] = useState(MEASUREMENT_PARAMETERS);
  const [onboardingCoaches, setOnboardingCoaches] = useState(ONBOARDING_COACHES);
  const [onboardingSelectedCoachId, setOnboardingSelectedCoachId] = useState("");
  const [medicalQuestions, setMedicalQuestions] = useState([]);
  const [healthTrackers, setHealthTrackers] = useState(DEFAULT_HEALTH_PROGRESS_TRACKERS);
  const [drfFormSections, setDrfFormSections] = useState([]);
  const [commitmentText, setCommitmentText] = useState(COMMITMENT_LETTER_DEFAULT);
  const [savedCommitmentText, setSavedCommitmentText] = useState("");
  const [commitmentCoaches, setCommitmentCoaches] = useState([]);
  const [commitmentVersion, setCommitmentVersion] = useState(1);
  const [dietPlans, setDietPlans] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [nutritionBank, setNutritionBank] = useState([]);
  const [rxProtocols, setRxProtocols] = useState([]);
  const [galleryMedia, setGalleryMedia] = useState(GALLERY_MEDIA);
  const [launchRatings, setLaunchRatings] = useState([]);
  const [launchDomains, setLaunchDomains] = useState([]);
  const [aiCoaches, setAiCoaches] = useState([]);
  const [aiAssistants, setAiAssistants] = useState([]);
  const [programStories, setProgramStories] = useState([]);
  const [footerBottomLine, setFooterBottomLine] = useState("");
  const [socialLinks, setSocialLinks] = useState([]);
  const [websiteLinks, setWebsiteLinks] = useState(WEBSITE_FOOTER_LINKS);
  const [privacyBlocks, setPrivacyBlocks] = useState(PRIVACY_BLOCKS);
  const [tosBlocks, setTosBlocks] = useState(TOS_BLOCKS);
  const [guidelineBlocks, setGuidelineBlocks] = useState(GUIDELINE_BLOCKS);
  const [contactDetails, setContactDetails] = useState(CONTACT_DETAILS);
  const [contactPageBlocks, setContactPageBlocks] = useState(CONTACT_PAGE_BLOCKS);
  const [footerTextBlocks, setFooterTextBlocks] = useState(FOOTER_TEXT_BLOCKS);
  const [logoSlots, setLogoSlots] = useState(createDefaultLogoSlots);
  const [locations, setLocations] = useState(LOCATIONS);
  const [bannerEditor, setBannerEditor] = useState(() => emptyBannerEditor());
  const [bannerItems, setBannerItems] = useState([]);
  const [championItems, setChampionItems] = useState([]);
  const [birthdayPosts, setBirthdayPosts] = useState([]);
  const [birthdayQueue, setBirthdayQueue] = useState([]);
  const [tfEditor] = useState(TRANSFORMATION_EDITOR);
  const [tfItems, setTfItems] = useState([]);
  const [crEditor] = useState(CLIENT_REVIEW_EDITOR);
  const [crQueue, setCrQueue] = useState([]);
  const [crPublished, setCrPublished] = useState([]);
  const [rpEditor] = useState(REAL_PEOPLE_EDITOR);
  const [rpItems, setRpItems] = useState([]);
  const [voiceEditor] = useState(VOICE_EDITOR);
  const [voiceItems, setVoiceItems] = useState([]);
  const [cfRecord, setCfRecord] = useState(null);
  const cfEditor = useMemo(() => editorFromCofounder(cfRecord, COFOUNDER_EDITOR), [cfRecord]);
  const [ldItems, setLdItems] = useState([]);
  const [wtItems, setWtItems] = useState([]);
  const [aboutBlocks, setAboutBlocks] = useState(ABOUT_BLOCKS);
  const [grStats, setGrStats] = useState([]);
  const [dropdownLists, setDropdownLists] = useState([]);
  const [rcEditor, setRcEditor] = useState(RECIPES_EDITOR);
  const [rcItems, setRcItems] = useState([]);
  const [ygEditor, setYgEditor] = useState(YOGA_EDITOR);
  const [ygItems, setYgItems] = useState([]);
  const [blEditor, setBlEditor] = useState(BLOGS_EDITOR);
  const [blPosts, setBlPosts] = useState([]);
  const [blGallery, setBlGallery] = useState([]);
  const [featureFlags, setFeatureFlags] = useState(FEATURE_FLAGS);
  const [appContent, setAppContent] = useState({
    appName: "",
    appEmail: "",
    appMobile: "",
    address: "",
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(() => {
    if (configId !== "app-program" && configId !== "app-subscriptions") return undefined;
    let active = true;

    getCoachCheckoutOptions({
      validityPeriods: VALIDITY_PERIODS,
      discountSlabs: DISCOUNT_SLABS,
      appHealPeriods: APP_HEAL_PERIODS,
    })
      .then((options) => {
        if (!active) return;
        if (options.programPricing !== null) setProgramRows(options.programPricing);
        if (options.subscriptionPricing !== null) setSubRows(options.subscriptionPricing);
        setProgramValidityPeriods(options.programValidityPeriods);
        setProgramDiscountSlabs(options.programDiscountSlabs);
        setSubscriptionValidityPeriods(options.subscriptionValidityPeriods);
        setSubscriptionDiscountSlabs(options.subscriptionDiscountSlabs);
        setAppHealPeriods(options.appHealPeriods);
        setCoachesCanAddProgramValidity(options.coachesCanAddProgramValidity);
        setCoachesCanAddSubscriptionValidity(options.coachesCanAddSubscriptionValidity);
        setCoachesCanAddAppHeal(options.coachesCanAddAppHeal);
      })
      .catch((error) => {
        if (active) onToast(error.message || "Could not load coach checkout options");
      });

    return () => {
      active = false;
    };
  }, [configId]);

  useEffect(() => {
    if (configId !== "web-app-content") return undefined;
    let active = true;
    getAppContent()
      .then((next) => {
        if (active && next) setAppContent(next);
      })
      .catch(() => {
        /* section handles load failures itself */
      });
    return () => {
      active = false;
    };
  }, [configId]);

  async function persistPricingRows(kind, nextRows) {
    const programOptions = {
      programValidityPeriods,
      programDiscountSlabs,
      appHealPeriods,
      coachesCanAddProgramValidity,
      coachesCanAddAppHeal,
    };
    const subscriptionOptions = {
      subscriptionValidityPeriods,
      subscriptionDiscountSlabs,
      coachesCanAddSubscriptionValidity,
    };
    const saved = await saveCoachCheckoutOptions(
      kind === "program" ? programOptions : subscriptionOptions,
      {
        programPricing: kind === "program" ? nextRows : null,
        subscriptionPricing: kind === "subscription" ? nextRows : null,
      },
    );
    return kind === "program" ? saved.programPricing : saved.subscriptionPricing;
  }

  async function publishConfig() {
    if (item.id !== "app-program" && item.id !== "app-subscriptions") {
      onToast(`${item.name} published`);
      return;
    }

    try {
      const isProgram = item.id === "app-program";
      const saved = await saveCoachCheckoutOptions(
        isProgram
          ? {
              programValidityPeriods,
              programDiscountSlabs,
              appHealPeriods,
              coachesCanAddProgramValidity,
              coachesCanAddAppHeal,
            }
          : {
              subscriptionValidityPeriods,
              subscriptionDiscountSlabs,
              coachesCanAddSubscriptionValidity,
            },
        {
          programPricing: isProgram ? programRows : null,
          subscriptionPricing: isProgram ? null : subRows,
        },
      );
      if (isProgram) {
        setProgramRows(saved.programPricing);
        setProgramValidityPeriods(saved.programValidityPeriods);
        setProgramDiscountSlabs(saved.programDiscountSlabs);
        setAppHealPeriods(saved.appHealPeriods);
        setCoachesCanAddProgramValidity(saved.coachesCanAddProgramValidity);
        setCoachesCanAddAppHeal(saved.coachesCanAddAppHeal);
      } else {
        setSubRows(saved.subscriptionPricing);
        setSubscriptionValidityPeriods(saved.subscriptionValidityPeriods);
        setSubscriptionDiscountSlabs(saved.subscriptionDiscountSlabs);
        setCoachesCanAddSubscriptionValidity(saved.coachesCanAddSubscriptionValidity);
      }
      onToast(isProgram ? "Program config published" : "Subscription config published");
    } catch (error) {
      onToast(error.message || "Could not publish coach checkout options");
    }
  }

  if (!found) {
    return <Navigate to={UPDATED_ADMIN_PATHS.configs} replace />;
  }

  const { item, groupName } = found;
  const permissionPrefix = configPermissionPrefix(item.id);
  const canViewConfig = can(`console.${permissionPrefix}.view`);
  const canEditConfig =
    can(`console.${permissionPrefix}.edit`) ||
    can(`console.${permissionPrefix}.create`) ||
    can(`console.${permissionPrefix}.delete`) ||
    can(`console.${permissionPrefix}.upload`) ||
    can(`console.${permissionPrefix}.toggle`);
  const activeGateway = item.id === "app-payment-gateway" ? activePaymentGateway(gateways) : null;
  const summaryOn =
    item.id === "app-language-disable"
      ? hindiOn
      : item.id === "app-gst"
        ? gstOn
        : item.id === "app-payment-gateway"
          ? activeGateway?.name ?? false
          : item.id === "app-tos"
            ? appTosBlocks.some((entry) => entry.shown)
          : item.id === "app-dpa"
            ? dpaBlocks.some((entry) => entry.shown)
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
              : item.id === "app-test-catalog"
                ? testCatalog.some((entry) => entry.live)
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
              : item.id === "web-program-testimonials"
                ? programStories.some((entry) => entry.live)
              : item.id === "web-footer"
                ? Boolean(String(footerBottomLine || "").trim())
              : item.id === "web-app-content"
                ? Boolean(
                    String(appContent.appName || "").trim()
                    || String(appContent.appEmail || "").trim()
                    || String(appContent.appMobile || "").trim()
                    || String(appContent.address || "").trim(),
                  )
              : item.id === "web-fs-social"
                ? socialLinks.some((entry) => String(entry.url || "").trim())
              : item.id === "web-fs-links"
                ? websiteLinks.length > 0
              : item.id === "web-fs-privacy"
                ? privacyBlocks.some((entry) => entry.shown)
              : item.id === "web-fs-tos"
                ? tosBlocks.some((entry) => entry.shown)
              : item.id === "web-fs-guidelines"
                ? guidelineBlocks.some((entry) => entry.shown)
              : item.id === "web-fs-contact"
                ? contactDetails.some((entry) => entry.live)
                  || contactPageBlocks.some((entry) => entry.shown)
              : item.id === "web-fs-text"
                ? footerTextBlocks.some((entry) => entry.shown)
              : item.id === "web-logo"
                ? logoSlots.some((entry) => entry.uploaded)
              : item.id === "web-location"
                ? locations.some((entry) => entry.live)
              : item.id === "common-banner"
                ? bannerItems.some((entry) => entry.shown && (entry.appOn || entry.webOn))
              : item.id === "common-champion"
                ? championItems.some((entry) => entry.live)
              : item.id === "common-birthday"
                ? birthdayPosts.some((entry) => entry.live)
                  || birthdayQueue.some((entry) => entry.status === "sent")
              : item.id === "common-transformation"
                ? tfItems.some((entry) => entry.live)
              : item.id === "common-client-review"
                ? crPublished.some((entry) => entry.live)
              : item.id === "common-real-people"
                ? rpItems.some((entry) => entry.live)
              : item.id === "common-voice"
                ? voiceItems.some((entry) => entry.live)
              : item.id === "common-cofounder"
                ? Boolean(cfRecord?.live)
              : item.id === "common-leadership"
                ? ldItems.some((entry) => entry.live)
              : item.id === "common-wellness-team"
                ? wtItems.some((entry) => entry.live)
              : item.id === "common-about"
                ? aboutBlocks.some((entry) => entry.shown)
              : item.id === "common-google-review"
                ? (grStats ?? []).some((entry) => String(entry.value || "").trim())
              : item.id === "common-dropdowns"
                ? dropdownLists.some((list) => list.options.some((entry) => entry.on))
              : item.id === "common-recipes"
                ? rcItems.some((entry) => entry.live)
              : item.id === "common-yoga"
                ? ygItems.some((entry) => entry.live)
              : item.id === "common-blogs"
                ? blEditor.appOn || blEditor.webOn || blPosts.some((entry) => entry.live)
              : item.id === "feature-flags"
                ? featureFlags.some((entry) => entry.on)
          : item.toggleable === false
            ? Boolean(item.live)
            : Boolean(item.on);
  const showPreview = PREVIEW_CONFIGS.has(item.id);

  function renderBody() {
    switch (item.id) {
      case "app-language-disable":
        return (
          <LanguageDisableSection
            hindiOn={hindiOn}
            setHindiOn={setHindiOn}
            onToast={onToast}
          />
        );
      case "app-faq":
        return <FaqConfigPanel items={faqItems} setItems={setFaqItems} onToast={onToast} />;
      case "app-program":
        return (
          <>
            <ExchangeClientSection
              onToast={onToast}
              programOptions={programRows}
              showAppHeal
              discountSlabs={programDiscountSlabs}
              appHealPeriods={appHealPeriods}
              validityPeriods={programValidityPeriods}
            />
            <PricingPanel
              title="Program pricing & discount validity"
              rows={programRows}
              setRows={setProgramRows}
              onToast={onToast}
              onPersist={(nextRows) => persistPricingRows("program", nextRows)}
              includeDiscount
            />
            <TagCreatePanel
              title="App Heal feature validity"
              subtitle="These appear in the coach's App Heal validity dropdown."
              items={appHealPeriods}
              setItems={setAppHealPeriods}
              placeholder="e.g. 3 years"
              createLabel="+ Create period"
              coachesToggle
              coachAdd={coachesCanAddAppHeal}
              setCoachAdd={setCoachesCanAddAppHeal}
              onToast={onToast}
            />
            <TagCreatePanel
              title="Validity periods available to coaches"
              subtitle="These appear in the coach's validity dropdown at checkout."
              items={programValidityPeriods}
              setItems={setProgramValidityPeriods}
              placeholder="e.g. 96 hours"
              createLabel="+ Create period"
              coachesToggle
              coachAdd={coachesCanAddProgramValidity}
              setCoachAdd={setCoachesCanAddProgramValidity}
              onToast={onToast}
            />
            <TagCreatePanel
              title="Discount slabs available to coaches"
              subtitle="These appear in the coach's discount dropdown."
              items={programDiscountSlabs}
              setItems={setProgramDiscountSlabs}
              placeholder="e.g. 30% · launch"
              createLabel="+ Create slab"
              parseItem={parseDiscountSlab}
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
              productType="subscription"
              discountSlabs={subscriptionDiscountSlabs}
              appHealPeriods={appHealPeriods}
              validityPeriods={subscriptionValidityPeriods}
            />
            <PricingPanel
              title="Subscription pricing & discount validity"
              rows={subRows}
              setRows={setSubRows}
              onToast={onToast}
              onPersist={(nextRows) => persistPricingRows("subscription", nextRows)}
              addLabel="+ Add subscription"
              formTitle="New subscription"
              namePlaceholder="Subscription name"
              includeDays
            />
            <TagCreatePanel
              title="Validity periods available to coaches"
              subtitle="These appear in the coach's validity dropdown at checkout."
              items={subscriptionValidityPeriods}
              setItems={setSubscriptionValidityPeriods}
              placeholder="e.g. 96 hours"
              createLabel="+ Create period"
              coachesToggle
              coachAdd={coachesCanAddSubscriptionValidity}
              setCoachAdd={setCoachesCanAddSubscriptionValidity}
              onToast={onToast}
            />
            <TagCreatePanel
              title="Discount slabs available to coaches"
              subtitle="These appear in the coach's discount dropdown."
              items={subscriptionDiscountSlabs}
              setItems={setSubscriptionDiscountSlabs}
              placeholder="e.g. 30% · launch"
              createLabel="+ Create slab"
              parseItem={parseDiscountSlab}
              onToast={onToast}
            />
          </>
        );
      case "app-gst":
        return (
          <GstSection
            gstOn={gstOn}
            setGstOn={setGstOn}
            gstPercent={gstPercent}
            setGstPercent={setGstPercent}
            onToast={onToast}
          />
        );
      case "app-payment-gateway":
        return (
          <PaymentGatewaySection
            gateways={gateways}
            setGateways={setGateways}
            onToast={onToast}
          />
        );
      case "app-tos":
        return (
          <AppTosSection
            blocks={appTosBlocks}
            setBlocks={setAppTosBlocks}
            onToast={onToast}
          />
        );
      case "app-dpa":
        return (
          <DpaSection
            blocks={dpaBlocks}
            setBlocks={setDpaBlocks}
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
            setCoaches={setCommitmentCoaches}
            version={commitmentVersion}
            setVersion={setCommitmentVersion}
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
      case "app-test-catalog":
        return (
          <TestCatalogSection
            tests={testCatalog}
            setTests={setTestCatalog}
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
      case "feature-flags":
        return (
          <FeatureFlagsSection
            flags={featureFlags}
            setFlags={setFeatureFlags}
            onToast={onToast}
          />
        );
      case "web-program-testimonials":
        return (
          <DynamicProgramTestimonialsSection
            stories={programStories}
            setStories={setProgramStories}
            onToast={onToast}
          />
        );
      case "web-footer":
        return (
          <FooterSettingSection
            bottomLine={footerBottomLine}
            setBottomLine={setFooterBottomLine}
            onToast={onToast}
          />
        );
      case "web-app-content":
        return (
          <AppContentSection
            content={appContent}
            setContent={setAppContent}
            onToast={onToast}
          />
        );
      case "web-fs-social":
        return (
          <SocialLinksSection
            links={socialLinks}
            setLinks={setSocialLinks}
            onToast={onToast}
            persistToAppConfig
          />
        );
      case "web-fs-links":
        return (
          <SocialLinksSection
            links={websiteLinks}
            setLinks={setWebsiteLinks}
            onToast={onToast}
            defaultIcon="globe"
          />
        );
      case "web-fs-privacy":
        return (
          <PrivacyPolicySection
            blocks={privacyBlocks}
            setBlocks={setPrivacyBlocks}
            onToast={onToast}
          />
        );
      case "web-fs-tos":
        return (
          <TermsAndConditionsSection
            blocks={tosBlocks}
            setBlocks={setTosBlocks}
            onToast={onToast}
          />
        );
      case "web-fs-guidelines":
        return (
          <CommunityGuidelinesSection
            blocks={guidelineBlocks}
            setBlocks={setGuidelineBlocks}
            onToast={onToast}
          />
        );
      case "web-fs-contact":
        return (
          <>
            <LegalSectionsEditor
              slug="contact-us"
              defaultTitle="Contact Us"
              sitePath="irwellness.in/contact-us"
              noun="contact section"
              fallbackBlocks={CONTACT_PAGE_BLOCKS}
              blocks={contactPageBlocks}
              setBlocks={setContactPageBlocks}
              onToast={onToast}
            />
            <ContactDetailsSection
              details={contactDetails}
              setDetails={setContactDetails}
              onToast={onToast}
            />
          </>
        );
      case "web-fs-text":
        return (
          <LegalBlocksSection
            blocks={footerTextBlocks}
            setBlocks={setFooterTextBlocks}
            onToast={onToast}
          />
        );
      case "web-logo":
        return (
          <LogoSlotsSection
            slots={logoSlots}
            setSlots={setLogoSlots}
            onToast={onToast}
          />
        );
      case "web-location":
        return (
          <LocationsSection
            locations={locations}
            setLocations={setLocations}
            onToast={onToast}
          />
        );
      case "common-banner":
        return (
          <BannerSection
            editor={bannerEditor}
            setEditor={setBannerEditor}
            items={bannerItems}
            setItems={setBannerItems}
            onToast={onToast}
          />
        );
      case "common-champion":
        return (
          <DynamicChampionSection
            items={championItems}
            setItems={setChampionItems}
            onToast={onToast}
          />
        );
      case "common-birthday":
        return (
          <DynamicBirthdaySection
            posts={birthdayPosts}
            setPosts={setBirthdayPosts}
            queue={birthdayQueue}
            setQueue={setBirthdayQueue}
            onToast={onToast}
          />
        );
      case "common-transformation":
        return (
          <DynamicTransformationSection
            items={tfItems}
            setItems={setTfItems}
            onToast={onToast}
          />
        );
      case "common-client-review":
        return (
          <DynamicClientReviewSection
            queue={crQueue}
            setQueue={setCrQueue}
            published={crPublished}
            setPublished={setCrPublished}
            onToast={onToast}
          />
        );
      case "common-real-people":
        return (
          <DynamicRealPeopleSection
            items={rpItems}
            setItems={setRpItems}
            onToast={onToast}
          />
        );
      case "common-voice":
        return (
          <DynamicVoiceOfHealingSection
            items={voiceItems}
            setItems={setVoiceItems}
            onToast={onToast}
          />
        );
      case "common-cofounder":
        return (
          <DynamicCofounderSection
            record={cfRecord}
            setRecord={setCfRecord}
            onToast={onToast}
            onOpenPreview={() => setPreviewOpen(true)}
          />
        );
      case "common-leadership":
        return (
          <DynamicLeadershipSection
            items={ldItems}
            setItems={setLdItems}
            onToast={onToast}
            onOpenPreview={() => setPreviewOpen(true)}
          />
        );
      case "common-wellness-team":
        return (
          <DynamicWellnessTeamSection
            items={wtItems}
            setItems={setWtItems}
            onToast={onToast}
          />
        );
      case "common-about":
        return (
          <AboutSection
            blocks={aboutBlocks}
            setBlocks={setAboutBlocks}
            onToast={onToast}
          />
        );
      case "common-google-review":
        return (
          <DynamicGoogleReviewSection
            stats={grStats}
            setStats={setGrStats}
            onToast={onToast}
          />
        );
      case "common-dropdowns":
        return (
          <DropdownsSection
            lists={dropdownLists}
            setLists={setDropdownLists}
            onToast={onToast}
          />
        );
      case "common-recipes":
        return (
          <RecipesSection
            editor={rcEditor}
            setEditor={setRcEditor}
            items={rcItems}
            setItems={setRcItems}
            persistToHealthRecipes
            hideGallery
            onToast={onToast}
          />
        );
      case "common-yoga":
        return (
          <YogaSection
            editor={ygEditor}
            setEditor={setYgEditor}
            items={ygItems}
            setItems={setYgItems}
            onToast={onToast}
          />
        );
      case "common-mental-wellbeing":
        return <WellnessLibrarySection kind="mental" onToast={onToast} />;
      case "common-wellness-yoga":
        return <WellnessLibrarySection kind="yoga" onToast={onToast} />;
      case "common-physical-exercise":
        return <WellnessLibrarySection kind="exercise" onToast={onToast} />;
      case "common-blogs":
        return (
          <DynamicBlogsSection
            editor={blEditor}
            setEditor={setBlEditor}
            posts={blPosts}
            setPosts={setBlPosts}
            gallery={blGallery}
            setGallery={setBlGallery}
            summary={<ConfigSummary item={item} groupName={groupName} on={summaryOn} />}
            onToast={onToast}
          />
        );
      default:
        return <GenericPanel item={item} />;
    }
  }

  return (
    <main className={`content ua-page-enter ua-cfg-detail${item.id === "app-faq" || item.id === "app-nutrition-bank" || item.id === "app-launch" || item.id === "common-banner" || item.id === "common-champion" || item.id === "common-birthday" || item.id === "common-transformation" || item.id === "common-client-review" || item.id === "common-real-people" || item.id === "common-voice" || item.id === "common-cofounder" || item.id === "common-leadership" || item.id === "common-wellness-team" || item.id === "common-about" || item.id === "common-google-review" || item.id === "common-dropdowns" || item.id === "common-recipes" || item.id === "common-yoga" || item.id === "common-blogs" || item.id === "common-mental-wellbeing" || item.id === "common-wellness-yoga" || item.id === "common-physical-exercise" || item.id === "web-program-testimonials" || item.id === "web-footer" || item.id === "web-fs-social" || item.id === "web-fs-links" || item.id === "web-location" || item.id === "feature-flags" ? " ua-cfg-detail--wide" : ""}`}>
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
            canPublish={canEditConfig}
          />
        ) : null}
      />

      {!canViewConfig ? (
        <div className="ua-section-bar">
          <span>You do not have access to view this config.</span>
        </div>
      ) : null}

      {canViewConfig && !canEditConfig ? (
        <div className="ua-section-bar">
          <span>Read-only access. Edit, upload, delete, toggle, and publish actions are disabled for this role.</span>
        </div>
      ) : null}

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
          gstPercent,
          gateways,
          activeGateway,
          appTosBlocks,
          dpaBlocks,
          measurementGuide,
          measurementParams,
          onboardingCoaches,
          onboardingSelectedCoachId,
          medicalQuestions,
          healthTrackers,
          dietPlans,
          testCatalog,
          nutritionBank,
          drfFormSections,
          rxProtocols,
          commitmentText,
          galleryMedia,
          launchRatings,
          launchDomains,
          aiCoaches,
          aiAssistants,
          programStories,
          footerBottomLine,
          socialLinks,
          websiteLinks,
          privacyBlocks,
          tosBlocks,
          guidelineBlocks,
          contactDetails,
          contactPageBlocks,
          footerTextBlocks,
          logoSlots,
          locations,
          bannerEditor,
          bannerItems,
          championItems,
          birthdayPosts,
          birthdayQueue,
          tfEditor,
          tfItems,
          crEditor,
          crPublished,
          rpEditor,
          rpItems,
          voiceEditor,
          voiceItems,
          cfEditor,
          cfRecord,
          ldItems,
          wtItems,
          aboutBlocks,
          grStats,
          dropdownLists,
          rcEditor,
          rcItems,
          ygEditor,
          ygItems,
          blEditor,
          blPosts,
          featureFlags,
        }}
      />

      <ConfigPublishModal
        open={publishOpen && canEditConfig}
        onClose={() => setPublishOpen(false)}
        item={item}
        onConfirm={publishConfig}
      />

      {canViewConfig ? (
        <div className="ua-cfg-detail__body">
          {item.id === "common-blogs" ? null : (
            <ConfigSummary item={item} groupName={groupName} on={summaryOn} />
          )}
          <div
            aria-disabled={!canEditConfig}
            style={
              canEditConfig
                ? undefined
                : { pointerEvents: "none", opacity: 0.72, userSelect: "none" }
            }
          >
            {renderBody()}
          </div>
        </div>
      ) : null}
    </main>
  );
}
