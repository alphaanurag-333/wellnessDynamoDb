import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminAssignEnrollment,
  adminCreateChallenge,
  adminCreateChallengeGroup,
  adminDeleteChallenge,
  adminListChallengeEnrollments,
  adminListChallengeGroups,
  adminListChallenges,
  adminUpdateChallenge,
  adminRunChallengeLifecycleJob,
  ONBOARDING_STEP_LABELS,
} from "../api/challengesApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import { CfgSelect } from "./shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import "./challengesConfig.css";

const TITLE_MAX_LEN = 100;
const TITLE_MIN_LEN = 3;
const DESCRIPTION_MAX_LEN = 1000;
const DESCRIPTION_MIN_LEN = 10;
const WHATSAPP_MAX_LEN = 1024;
const PRICE_MAX = 999999;
const GROUP_SIZE_MIN = 1;
const GROUP_SIZE_MAX = 100;
const IMAGE_MAX_COUNT = 10;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const WHATSAPP_PLACEHOLDERS = ["name", "title", "amount", "ref"];
const WHATSAPP_PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g;

const EMPTY = {
  title: "",
  description: "",
  price: "",
  startDate: "",
  endDate: "",
  status: "draft",
  onboardingStepKeys: ["personalDetails", "bodyAnalytics"],
  whatsappMessageTemplate: "",
  maxGroupSize: 20,
  images: [],
};

function todayLocalISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function clampText(value, max) {
  return String(value ?? "").slice(0, max);
}

function CharHint({ value, max }) {
  const length = String(value || "").length;
  return (
    <span className={`ua-cfg-dd-char${length >= max ? " is-limit" : ""}`}>
      {length}/{max}
    </span>
  );
}

function sanitizePriceInput(raw) {
  let next = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, "")}`;
    const [whole, frac = ""] = next.split(".");
    next = `${whole}.${frac.slice(0, 2)}`;
  }
  if (next.startsWith(".")) next = `0${next}`;
  return next.slice(0, 10);
}

function sanitizeGroupSizeInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  return String(Math.min(GROUP_SIZE_MAX, Number(digits)));
}

function validateChallengeDraft(draft, { isCreate = true } = {}) {
  const errors = {};
  const title = String(draft.title || "").trim();
  if (!title) errors.title = "Title is required";
  else if (title.length < TITLE_MIN_LEN) errors.title = `Title must be at least ${TITLE_MIN_LEN} characters`;
  else if (title.length > TITLE_MAX_LEN) errors.title = `Title cannot exceed ${TITLE_MAX_LEN} characters`;

  const description = String(draft.description || "").trim();
  if (!description) errors.description = "Description is required";
  else if (description.length < DESCRIPTION_MIN_LEN) {
    errors.description = `Description must be at least ${DESCRIPTION_MIN_LEN} characters`;
  } else if (description.length > DESCRIPTION_MAX_LEN) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters`;
  }

  const price = Number(draft.price);
  if (draft.price === "" || draft.price == null) errors.price = "Price is required";
  else if (!Number.isFinite(price) || price <= 0) errors.price = "Enter a price greater than 0";
  else if (price > PRICE_MAX) errors.price = `Price cannot exceed ₹${PRICE_MAX.toLocaleString("en-IN")}`;

  const startDate = String(draft.startDate || "").trim();
  const endDate = String(draft.endDate || "").trim();
  const today = todayLocalISO();
  if (!startDate) errors.startDate = "Start date is required";
  else if (isCreate && startDate < today) errors.startDate = "Start date cannot be in the past";
  if (!endDate) errors.endDate = "End date is required";
  else if (startDate && endDate < startDate) errors.endDate = "End date must be on or after the start date";

  const groupSize = Number(draft.maxGroupSize);
  if (draft.maxGroupSize === "" || draft.maxGroupSize == null) {
    errors.maxGroupSize = "Max group size is required";
  } else if (!Number.isInteger(groupSize) || groupSize < GROUP_SIZE_MIN || groupSize > GROUP_SIZE_MAX) {
    errors.maxGroupSize = `Group size must be ${GROUP_SIZE_MIN}–${GROUP_SIZE_MAX}`;
  }

  const template = String(draft.whatsappMessageTemplate || "");
  if (template.length > WHATSAPP_MAX_LEN) {
    errors.whatsappMessageTemplate = `Template cannot exceed ${WHATSAPP_MAX_LEN} characters`;
  } else {
    const unknown = [...template.matchAll(WHATSAPP_PLACEHOLDER_RE)]
      .map((m) => m[1].toLowerCase())
      .filter((token) => !WHATSAPP_PLACEHOLDERS.includes(token));
    if (unknown.length) {
      errors.whatsappMessageTemplate = `Unknown placeholder {${unknown[0]}}. Use {name}, {title}, {amount}, {ref}`;
    }
  }

  return errors;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function statusTone(status) {
  if (status === "published") return "live";
  if (status === "draft") return "draft";
  if (status === "completed") return "done";
  return "muted";
}

function formatPhone(user) {
  if (!user?.phone) return "";
  const code = String(user.phoneCountryCode || "").trim();
  const phone = String(user.phone || "").trim();
  return code ? `${code} ${phone}` : phone;
}

function enrollmentLabel(enr) {
  const name = String(enr?.user?.name || "").trim();
  if (name) return name;
  const phone = formatPhone(enr?.user);
  if (phone) return phone;
  return enr?.userId ? `User ${enr.userId.slice(0, 8)}…` : "Unknown user";
}

function ChallengeForm({
  draft,
  setDraft,
  imageFiles,
  setImageFiles,
  disabled,
  errors = {},
  isCreate = true,
  onClearError,
}) {
  const today = todayLocalISO();
  const patch = (next) => {
    setDraft((prev) => ({ ...prev, ...next }));
    onClearError?.(Object.keys(next));
  };

  const toggleStep = (key) => {
    setDraft((prev) => {
      const set = new Set(prev.onboardingStepKeys || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, onboardingStepKeys: Array.from(set) };
    });
  };

  const removeExistingImage = (url) => {
    setDraft((prev) => ({
      ...prev,
      images: (prev.images || []).filter((entry) => entry !== url),
    }));
  };

  const pickImages = (fileList) => {
    const picked = Array.from(fileList || []);
    const remaining = IMAGE_MAX_COUNT - (draft.images?.length || 0) - (imageFiles?.length || 0);
    if (remaining <= 0) {
      return { error: `You can attach up to ${IMAGE_MAX_COUNT} images` };
    }
    const accepted = [];
    for (const file of picked.slice(0, remaining)) {
      if (!String(file.type || "").startsWith("image/")) {
        return { error: "Only image files are allowed" };
      }
      if (file.size > IMAGE_MAX_BYTES) {
        return { error: "Each image must be 5 MB or smaller" };
      }
      accepted.push(file);
    }
    setImageFiles(accepted);
    return { error: null };
  };

  return (
    <div className="ua-cfg-chal-form">
      <label className={`ua-cfg-chal-field${errors.title ? " is-invalid" : ""}`}>
        <span className="ua-cfg-chal-field__label">
          <span>Title *</span>
          <CharHint value={draft.title} max={TITLE_MAX_LEN} />
        </span>
        <input
          className="ua-cfg-tc-field"
          value={draft.title}
          disabled={disabled}
          maxLength={TITLE_MAX_LEN}
          placeholder="e.g. 21-Day Metabolic Reset"
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => patch({ title: clampText(e.target.value, TITLE_MAX_LEN) })}
        />
        {errors.title ? <span className="ua-cfg-chal-field__error">{errors.title}</span> : (
          <span className="ua-cfg-chal-field__hint">{TITLE_MIN_LEN}–{TITLE_MAX_LEN} characters</span>
        )}
      </label>

      <label className={`ua-cfg-chal-field${errors.description ? " is-invalid" : ""}`}>
        <span className="ua-cfg-chal-field__label">
          <span>Description *</span>
          <CharHint value={draft.description} max={DESCRIPTION_MAX_LEN} />
        </span>
        <textarea
          className="ua-cfg-nb-textarea"
          rows={4}
          value={draft.description}
          disabled={disabled}
          maxLength={DESCRIPTION_MAX_LEN}
          placeholder="What participants will do and achieve"
          aria-invalid={Boolean(errors.description)}
          onChange={(e) => patch({ description: clampText(e.target.value, DESCRIPTION_MAX_LEN) })}
        />
        {errors.description ? (
          <span className="ua-cfg-chal-field__error">{errors.description}</span>
        ) : (
          <span className="ua-cfg-chal-field__hint">{DESCRIPTION_MIN_LEN}–{DESCRIPTION_MAX_LEN} characters</span>
        )}
      </label>

      <div className="ua-cfg-chal-grid ua-cfg-chal-grid--3">
        <label className={`ua-cfg-chal-field${errors.price ? " is-invalid" : ""}`}>
          <span>Price (₹) *</span>
          <input
            className="ua-cfg-tc-field"
            inputMode="decimal"
            value={draft.price}
            disabled={disabled}
            placeholder="999"
            aria-invalid={Boolean(errors.price)}
            onChange={(e) => patch({ price: sanitizePriceInput(e.target.value) })}
          />
          {errors.price ? <span className="ua-cfg-chal-field__error">{errors.price}</span> : (
            <span className="ua-cfg-chal-field__hint">Greater than 0, up to ₹{PRICE_MAX.toLocaleString("en-IN")}</span>
          )}
        </label>
        <label className={`ua-cfg-chal-field${errors.startDate ? " is-invalid" : ""}`}>
          <span>Start date *</span>
          <input
            type="date"
            className="ua-cfg-tc-field"
            data-allow-future="true"
            min={isCreate ? today : undefined}
            value={draft.startDate}
            disabled={disabled}
            aria-invalid={Boolean(errors.startDate)}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
          {errors.startDate ? <span className="ua-cfg-chal-field__error">{errors.startDate}</span> : null}
        </label>
        <label className={`ua-cfg-chal-field${errors.endDate ? " is-invalid" : ""}`}>
          <span>End date *</span>
          <input
            type="date"
            className="ua-cfg-tc-field"
            data-allow-future="true"
            min={draft.startDate || (isCreate ? today : undefined)}
            value={draft.endDate}
            disabled={disabled}
            aria-invalid={Boolean(errors.endDate)}
            onChange={(e) => patch({ endDate: e.target.value })}
          />
          {errors.endDate ? <span className="ua-cfg-chal-field__error">{errors.endDate}</span> : null}
        </label>
      </div>

      <div className="ua-cfg-chal-grid ua-cfg-chal-grid--2">
        <label className="ua-cfg-chal-field">
          <span>Status</span>
          <CfgSelect
            className="ua-cfg-tc-select"
            value={draft.status}
            disabled={disabled}
            options={STATUS_OPTIONS}
            onChange={(status) => patch({ status })}
          />
        </label>
        <label className={`ua-cfg-chal-field${errors.maxGroupSize ? " is-invalid" : ""}`}>
          <span>Max group size *</span>
          <input
            className="ua-cfg-tc-field"
            inputMode="numeric"
            value={draft.maxGroupSize}
            disabled={disabled}
            placeholder="20"
            aria-invalid={Boolean(errors.maxGroupSize)}
            onChange={(e) => patch({ maxGroupSize: sanitizeGroupSizeInput(e.target.value) })}
          />
          {errors.maxGroupSize ? (
            <span className="ua-cfg-chal-field__error">{errors.maxGroupSize}</span>
          ) : (
            <span className="ua-cfg-chal-field__hint">{GROUP_SIZE_MIN}–{GROUP_SIZE_MAX} people</span>
          )}
        </label>
      </div>

      <label className={`ua-cfg-chal-field${errors.whatsappMessageTemplate ? " is-invalid" : ""}`}>
        <span className="ua-cfg-chal-field__label">
          <span>WhatsApp message template</span>
          <CharHint value={draft.whatsappMessageTemplate} max={WHATSAPP_MAX_LEN} />
        </span>
        <textarea
          className="ua-cfg-nb-textarea"
          rows={3}
          placeholder="Use {name}, {title}, {amount}, {ref}"
          value={draft.whatsappMessageTemplate}
          disabled={disabled}
          maxLength={WHATSAPP_MAX_LEN}
          aria-invalid={Boolean(errors.whatsappMessageTemplate)}
          onChange={(e) => patch({ whatsappMessageTemplate: clampText(e.target.value, WHATSAPP_MAX_LEN) })}
        />
        {errors.whatsappMessageTemplate ? (
          <span className="ua-cfg-chal-field__error">{errors.whatsappMessageTemplate}</span>
        ) : (
          <span className="ua-cfg-chal-field__hint">Optional · placeholders {`{name}, {title}, {amount}, {ref}`} · max {WHATSAPP_MAX_LEN}</span>
        )}
      </label>

      <div className="ua-cfg-chal-field">
        <span>Paid onboarding steps (free → temp paid only)</span>
        <div className="ua-cfg-chal-steps">
          {Object.entries(ONBOARDING_STEP_LABELS).map(([key, label]) => {
            const on = (draft.onboardingStepKeys || []).includes(key);
            return (
              <button
                key={key}
                type="button"
                className={`ua-cfg-chal-chip${on ? " is-on" : ""}`}
                disabled={disabled}
                onClick={() => toggleStep(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`ua-cfg-chal-field${errors.images ? " is-invalid" : ""}`}>
        <span>Images</span>
        <div className="ua-cfg-chal-images">
          {(draft.images || []).map((url) => (
            <div key={url} className="ua-cfg-chal-thumb">
              <img src={url} alt="" />
              <button
                type="button"
                className="ua-cfg-chal-thumb__remove"
                disabled={disabled}
                aria-label="Remove image"
                onClick={() => removeExistingImage(url)}
              >
                ×
              </button>
            </div>
          ))}
          <label className={`ua-cfg-chal-uploader${disabled ? " is-disabled" : ""}`}>
            <span>+</span>
            Add images
            <input
              type="file"
              className="ua-cfg-chal-uploader__input"
              accept="image/*"
              multiple
              hidden
              disabled={disabled}
              onChange={(e) => {
                const result = pickImages(e.target.files);
                if (result.error) onClearError?.(["images"], result.error);
                else onClearError?.(["images"]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {errors.images ? (
          <span className="ua-cfg-chal-field__error">{errors.images}</span>
        ) : imageFiles.length ? (
          <p className="ua-cfg-panel__sub">{imageFiles.length} new file(s) ready to upload</p>
        ) : (
          <span className="ua-cfg-chal-field__hint">Optional · up to {IMAGE_MAX_COUNT} images · 5 MB each</span>
        )}
      </div>
    </div>
  );
}

export function ChallengesSection({ onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [imageFiles, setImageFiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [coachId, setCoachId] = useState("");
  const [jobBusy, setJobBusy] = useState(false);
  const [lastJob, setLastJob] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListChallenges(null, { limit: 100 });
      setItems(result?.items || []);
    } catch (err) {
      onToast?.(err.message || "Failed to load challenges", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((row) => row.id === selectedId) || null,
    [items, selectedId]
  );

  const loadOps = useCallback(async (challengeId) => {
    if (!challengeId) {
      setEnrollments([]);
      setGroups([]);
      return;
    }
    try {
      const [enr, grp] = await Promise.all([
        adminListChallengeEnrollments(null, challengeId),
        adminListChallengeGroups(null, challengeId),
      ]);
      setEnrollments(enr?.enrollments || []);
      setGroups(grp || []);
    } catch (err) {
      onToast?.(err.message || "Failed to load enrollments", "error");
    }
  }, [onToast]);

  useEffect(() => {
    void loadOps(selectedId);
  }, [selectedId, loadOps]);

  const closeForm = () => {
    setFormOpen(false);
    setDraft(EMPTY);
    setImageFiles([]);
    setEditingId(null);
    setFormErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setImageFiles([]);
    setFormErrors({});
    setSelectedId(null);
    setFormOpen(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFormErrors({});
    setDraft({
      title: clampText(item.title, TITLE_MAX_LEN),
      description: clampText(item.description, DESCRIPTION_MAX_LEN),
      price: String(item.price || ""),
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      onboardingStepKeys: item.onboardingStepKeys || [],
      whatsappMessageTemplate: clampText(item.whatsappMessageTemplate || "", WHATSAPP_MAX_LEN),
      maxGroupSize: item.maxGroupSize || 20,
      images: item.images || [],
    });
    setImageFiles([]);
    setFormOpen(true);
    setSelectedId(null);
  };

  const clearFieldErrors = (keys = [], imageError) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      if (imageError) next.images = imageError;
      return next;
    });
  };

  const save = async () => {
    const errors = validateChallengeDraft(draft, { isCreate: !editingId });
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      onToast?.(Object.values(errors)[0], "error");
      return;
    }
    const payload = {
      ...draft,
      title: String(draft.title || "").trim(),
      description: String(draft.description || "").trim(),
      price: Number(draft.price),
      maxGroupSize: Number(draft.maxGroupSize),
      whatsappMessageTemplate: String(draft.whatsappMessageTemplate || "").trim(),
    };
    setFormErrors({});
    setSaving(true);
    try {
      if (editingId) {
        await adminUpdateChallenge(null, editingId, payload, imageFiles);
        onToast?.("Challenge updated", "success");
      } else {
        await adminCreateChallenge(null, payload, imageFiles);
        onToast?.("Challenge created", "success");
      }
      closeForm();
      await load();
    } catch (err) {
      onToast?.(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adminDeleteChallenge(null, deleteId);
      onToast?.("Challenge deleted", "success");
      if (selectedId === deleteId) setSelectedId(null);
      if (editingId === deleteId) closeForm();
      setDeleteId(null);
      await load();
    } catch (err) {
      onToast?.(err.message || "Delete failed", "error");
    }
  };

  const createGroup = async () => {
    if (!selectedId) return;
    try {
      await adminCreateChallengeGroup(null, selectedId, {
        coachId: coachId || undefined,
        capacity: selected?.maxGroupSize || 20,
        label: `Group ${(groups.length || 0) + 1}`,
      });
      onToast?.("Group created", "success");
      setCoachId("");
      await loadOps(selectedId);
    } catch (err) {
      onToast?.(err.message || "Could not create group", "error");
    }
  };

  const assignToGroup = async (enrollmentId, groupId) => {
    try {
      await adminAssignEnrollment(null, selectedId, enrollmentId, { groupId });
      onToast?.("Enrollment assigned", "success");
      await loadOps(selectedId);
    } catch (err) {
      onToast?.(err.message || "Assign failed", "error");
    }
  };

  const runLifecycleJob = async () => {
    setJobBusy(true);
    try {
      const data = await adminRunChallengeLifecycleJob(null);
      setLastJob(data?.result || null);
      onToast?.(data?.message || "Lifecycle job completed", "success");
      await load();
      if (selectedId) await loadOps(selectedId);
    } catch (err) {
      onToast?.(err.message || "Could not run lifecycle job", "error");
    } finally {
      setJobBusy(false);
    }
  };

  return (
    <div className="ua-cfg-chal">
      <SectionSurfacePanel
        sectionId="challenges"
        onToast={onToast}
        title="Show in app"
        subtitle="Turn challenges on or off for the mobile app home screen."
        showApp
        showWeb={false}
      />

      <Panel
        title="Lifecycle job"
        subtitle="Grants temporary Heal on start date and restores free users after end date. Cron runs hourly at :15 IST when enabled."
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={jobBusy}
            onClick={runLifecycleJob}
          >
            {jobBusy ? "Running…" : "Run job now"}
          </button>
        }
      >
        {lastJob ? (
          <p className="ua-cfg-panel__sub" style={{ margin: 0 }}>
            Last run ({lastJob.today}): granted {lastJob.granted}, completed {lastJob.completed}, failed{" "}
            {lastJob.failed}
          </p>
        ) : (
          <p className="ua-cfg-panel__sub" style={{ margin: 0 }}>
            Use this after payment when the challenge start date is today or earlier.
          </p>
        )}
      </Panel>

      <Panel
        title="Challenges"
        subtitle={
          loading
            ? "Loading…"
            : `${items.length} challenge${items.length === 1 ? "" : "s"} · create, publish, and manage enrollments`
        }
        actions={
          formOpen ? null : (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
              disabled={saving || loading}
              onClick={openCreate}
            >
              + Add challenge
            </button>
          )
        }
      >
        {formOpen ? (
          <div className="ua-cfg-chal-editor">
            <div className="ua-cfg-chal-editor__head">
              <div className="ua-cfg-chal-editor__copy">
                <h4 className="ua-cfg-chal-editor__title">
                  {editingId ? "Edit challenge" : "New challenge"}
                </h4>
                <p className="ua-cfg-chal-editor__sub">
                  Fill details, pick onboarding steps for free users, then save.
                </p>
              </div>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close form"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <ChallengeForm
              draft={draft}
              setDraft={setDraft}
              imageFiles={imageFiles}
              setImageFiles={setImageFiles}
              disabled={saving}
              errors={formErrors}
              isCreate={!editingId}
              onClearError={clearFieldErrors}
            />

            <div className="ua-cfg-chal-editor__foot">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : editingId ? "Update challenge" : "Create challenge"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="ua-cfg-chal-list">
          {items.map((item) => (
            <article
              key={item.id}
              className={`ua-cfg-chal-card${selectedId === item.id ? " is-selected" : ""}${editingId === item.id ? " is-editing" : ""}`}
            >
              <div className="ua-cfg-chal-card__media">
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt="" />
                ) : (
                  <div className="ua-cfg-chal-card__ph" aria-hidden="true" />
                )}
              </div>
              <div className="ua-cfg-chal-card__body">
                <div className="ua-cfg-chal-card__head">
                  <div className="ua-cfg-chal-card__identity">
                    <div className="ua-cfg-chal-card__top">
                      <h4 className="ua-cfg-chal-card__title">{item.title}</h4>
                      <span className={`ua-cfg-chal-badge ua-cfg-chal-badge--${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="ua-cfg-chal-card__meta">
                      ₹{Number(item.price || 0).toLocaleString("en-IN")} · {item.startDate} → {item.endDate} ·{" "}
                      {item.enrollmentCount || 0} enrolled
                    </p>
                  </div>
                  <div className="ua-cfg-chal-card__actions">
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm colorbs"
                      disabled={saving}
                      onClick={() => {
                        if (formOpen) closeForm();
                        setSelectedId(selectedId === item.id ? null : item.id);
                      }}
                    >
                      View
                    </button>
                    {editingId === item.id ? (
                      <>
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                          disabled={saving}
                          onClick={save}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                          disabled={saving}
                          onClick={closeForm}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm colorbs"
                        disabled={saving}
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                      aria-label={`Delete ${item.title}`}
                      disabled={saving}
                      onClick={() => setDeleteId(item.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!loading && !items.length && !formOpen ? (
            <div className="ua-cfg-chal-empty">
              <p>No challenges yet.</p>
            </div>
          ) : null}
        </div>
      </Panel>

      {selected && !formOpen ? (
        <Panel
          title={`Enrollments · ${selected.title}`}
          subtitle={`${enrollments.length} enrolled · create groups of 20 and assign users to a coach`}
          actions={
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          }
        >
          <div className="ua-cfg-chal-ops">
            <div className="ua-cfg-chal-ops__row">
              <input
                className="ua-cfg-tc-field"
                placeholder="Coach account id (optional)"
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
              />
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={createGroup}>
                New group
              </button>
            </div>

            <div className="ua-cfg-chal-ops__block">
              <h5>Groups</h5>
              {groups.map((g) => (
                <div key={g.id} className="ua-cfg-chal-ops__line">
                  {g.label || g.id.slice(0, 8)} · {g.enrolledCount}/{g.capacity} · {g.status}
                  {g.coachId ? ` · coach ${g.coachId}` : ""}
                </div>
              ))}
              {!groups.length ? <p className="ua-cfg-panel__sub">No groups yet.</p> : null}
            </div>

            <div className="ua-cfg-chal-ops__block">
              <h5>Enrolled users ({enrollments.length})</h5>
              {enrollments.map((enr) => {
                const phone = formatPhone(enr.user);
                return (
                  <div key={enr.id} className="ua-cfg-chal-ops__enroll">
                    <div className="ua-cfg-chal-ops__enroll-copy">
                      <div className="ua-cfg-chal-ops__enroll-name">
                        {enr.userId ? (
                          <Link to={UPDATED_ADMIN_PATHS.userDetail(enr.userId)} className="ua-cfg-chal-ops__user-link">
                            {enrollmentLabel(enr)}
                          </Link>
                        ) : (
                          enrollmentLabel(enr)
                        )}
                        <span className={`ua-cfg-chal-badge ua-cfg-chal-badge--${statusTone(enr.status === "booked" ? "draft" : enr.status === "active" ? "live" : "muted")}`}>
                          {enr.status}
                        </span>
                      </div>
                      <p className="ua-cfg-panel__sub">
                        {[phone, enr.user?.email, `₹${Number(enr.amountPaid || 0).toLocaleString("en-IN")}`, enr.groupId ? `group ${enr.groupId.slice(0, 8)}` : "unassigned"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {groups.length ? (
                      <select
                        className="ua-cfg-tc-field ua-cfg-chal-ops__assign"
                        value={enr.groupId || ""}
                        onChange={(e) => assignToGroup(enr.id, e.target.value)}
                      >
                        <option value="">Assign group…</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label || g.id.slice(0, 8)} ({g.enrolledCount}/{g.capacity})
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
              {!enrollments.length ? <p className="ua-cfg-panel__sub">No enrollments yet.</p> : null}
            </div>
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete challenge?"
        body="This cannot be undone if there are no enrollments."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
