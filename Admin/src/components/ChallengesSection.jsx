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

function ChallengeForm({ draft, setDraft, imageFiles, setImageFiles, disabled }) {
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

  return (
    <div className="ua-cfg-ch-form">
      <label className="ua-cfg-ch-field">
        <span>Title</span>
        <input
          className="ua-cfg-tc-field"
          value={draft.title}
          disabled={disabled}
          placeholder="e.g. 21-Day Metabolic Reset"
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        />
      </label>

      <label className="ua-cfg-ch-field">
        <span>Description</span>
        <textarea
          className="ua-cfg-nb-textarea"
          rows={4}
          value={draft.description}
          disabled={disabled}
          placeholder="What participants will do and achieve"
          onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
        />
      </label>

      <div className="ua-cfg-ch-grid ua-cfg-ch-grid--3">
        <label className="ua-cfg-ch-field">
          <span>Price (₹)</span>
          <input
            className="ua-cfg-tc-field"
            inputMode="decimal"
            value={draft.price}
            disabled={disabled}
            placeholder="999"
            onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value.replace(/[^\d.]/g, "") }))}
          />
        </label>
        <label className="ua-cfg-ch-field">
          <span>Start date</span>
          <input
            type="date"
            className="ua-cfg-tc-field"
            data-allow-future="true"
            value={draft.startDate}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
          />
        </label>
        <label className="ua-cfg-ch-field">
          <span>End date</span>
          <input
            type="date"
            className="ua-cfg-tc-field"
            data-allow-future="true"
            min={draft.startDate || undefined}
            value={draft.endDate}
            disabled={disabled}
            onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
          />
        </label>
      </div>

      <div className="ua-cfg-ch-grid ua-cfg-ch-grid--2">
        <label className="ua-cfg-ch-field">
          <span>Status</span>
          <CfgSelect
            className="ua-cfg-tc-select"
            value={draft.status}
            disabled={disabled}
            options={STATUS_OPTIONS}
            onChange={(status) => setDraft((p) => ({ ...p, status }))}
          />
        </label>
        <label className="ua-cfg-ch-field">
          <span>Max group size</span>
          <input
            className="ua-cfg-tc-field"
            inputMode="numeric"
            value={draft.maxGroupSize}
            disabled={disabled}
            onChange={(e) =>
              setDraft((p) => ({ ...p, maxGroupSize: Number(e.target.value.replace(/\D/g, "")) || 20 }))
            }
          />
        </label>
      </div>

      <label className="ua-cfg-ch-field">
        <span>WhatsApp message template</span>
        <textarea
          className="ua-cfg-nb-textarea"
          rows={3}
          placeholder="Use {name}, {title}, {amount}, {ref}"
          value={draft.whatsappMessageTemplate}
          disabled={disabled}
          onChange={(e) => setDraft((p) => ({ ...p, whatsappMessageTemplate: e.target.value }))}
        />
      </label>

      <div className="ua-cfg-ch-field">
        <span>Paid onboarding steps (free → temp paid only)</span>
        <div className="ua-cfg-ch-steps">
          {Object.entries(ONBOARDING_STEP_LABELS).map(([key, label]) => {
            const on = (draft.onboardingStepKeys || []).includes(key);
            return (
              <button
                key={key}
                type="button"
                className={`ua-cfg-ch-chip${on ? " is-on" : ""}`}
                disabled={disabled}
                onClick={() => toggleStep(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ua-cfg-ch-field">
        <span>Images</span>
        <div className="ua-cfg-ch-images">
          {(draft.images || []).map((url) => (
            <div key={url} className="ua-cfg-ch-thumb">
              <img src={url} alt="" />
              <button
                type="button"
                className="ua-cfg-ch-thumb__remove"
                disabled={disabled}
                aria-label="Remove image"
                onClick={() => removeExistingImage(url)}
              >
                ×
              </button>
            </div>
          ))}
          <label className={`ua-cfg-ch-uploader${disabled ? " is-disabled" : ""}`}>
            <span>+</span>
            Add images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={disabled}
              onChange={(e) => {
                setImageFiles(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {imageFiles.length ? (
          <p className="ua-cfg-panel__sub">{imageFiles.length} new file(s) ready to upload</p>
        ) : null}
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
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setImageFiles([]);
    setSelectedId(null);
    setFormOpen(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      description: item.description,
      price: String(item.price || ""),
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      onboardingStepKeys: item.onboardingStepKeys || [],
      whatsappMessageTemplate: item.whatsappMessageTemplate || "",
      maxGroupSize: item.maxGroupSize || 20,
      images: item.images || [],
    });
    setImageFiles([]);
    setFormOpen(true);
    setSelectedId(null);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      onToast?.("Title is required", "error");
      return;
    }
    if (!draft.price || !draft.startDate || !draft.endDate) {
      onToast?.("Price, start date and end date are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminUpdateChallenge(null, editingId, draft, imageFiles);
        onToast?.("Challenge updated", "success");
      } else {
        await adminCreateChallenge(null, draft, imageFiles);
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
    <div className="ua-cfg-ch">
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
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={openCreate}>
              + New challenge
            </button>
          )
        }
      >
        {formOpen ? (
          <div className="ua-cfg-ch-editor">
            <div className="ua-cfg-ch-editor__head">
              <div>
                <h4 className="ua-cfg-ch-editor__title">
                  {editingId ? "Edit challenge" : "New challenge"}
                </h4>
                <p className="ua-cfg-panel__sub">
                  Fill details, pick onboarding steps for free users, then save.
                </p>
              </div>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
            </div>

            <ChallengeForm
              draft={draft}
              setDraft={setDraft}
              imageFiles={imageFiles}
              setImageFiles={setImageFiles}
              disabled={saving}
            />

            <div className="ua-cfg-ch-editor__foot">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : editingId ? "Update challenge" : "Create challenge"}
              </button>
            </div>
          </div>
        ) : (
          <div className="ua-cfg-ch-list">
            {items.map((item) => (
              <article
                key={item.id}
                className={`ua-cfg-ch-card${selectedId === item.id ? " is-selected" : ""}`}
              >
                <div className="ua-cfg-ch-card__media">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt="" />
                  ) : (
                    <div className="ua-cfg-ch-card__ph" aria-hidden="true" />
                  )}
                </div>
                <div className="ua-cfg-ch-card__body">
                  <div className="ua-cfg-ch-card__top">
                    <h4 className="ua-cfg-ch-card__title">{item.title}</h4>
                    <span className={`ua-cfg-ch-badge ua-cfg-ch-badge--${statusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="ua-cfg-ch-card__meta">
                    ₹{Number(item.price || 0).toLocaleString("en-IN")} · {item.startDate} → {item.endDate} ·{" "}
                    {item.enrollmentCount || 0} enrolled
                  </p>
                  <div className="ua-cfg-ch-card__actions">
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-btn--outline"
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    >
                      {selectedId === item.id ? "Hide enrollments" : "View enrollments"}
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-btn--ghost"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-btn--outline"
                      onClick={() => setDeleteId(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!loading && !items.length ? (
              <div className="ua-cfg-ch-empty">
                <p>No challenges yet.</p>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={openCreate}>
                  + New challenge
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      {selected && !formOpen ? (
        <Panel
          title={`Enrollments · ${selected.title}`}
          subtitle={`${enrollments.length} enrolled · create groups of 20 and assign users to a coach`}
          actions={
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setSelectedId(null)}>
              Close
            </button>
          }
        >
          <div className="ua-cfg-ch-ops">
            <div className="ua-cfg-ch-ops__row">
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

            <div className="ua-cfg-ch-ops__block">
              <h5>Groups</h5>
              {groups.map((g) => (
                <div key={g.id} className="ua-cfg-ch-ops__line">
                  {g.label || g.id.slice(0, 8)} · {g.enrolledCount}/{g.capacity} · {g.status}
                  {g.coachId ? ` · coach ${g.coachId}` : ""}
                </div>
              ))}
              {!groups.length ? <p className="ua-cfg-panel__sub">No groups yet.</p> : null}
            </div>

            <div className="ua-cfg-ch-ops__block">
              <h5>Enrolled users ({enrollments.length})</h5>
              {enrollments.map((enr) => {
                const phone = formatPhone(enr.user);
                return (
                  <div key={enr.id} className="ua-cfg-ch-ops__enroll">
                    <div className="ua-cfg-ch-ops__enroll-copy">
                      <div className="ua-cfg-ch-ops__enroll-name">
                        {enr.userId ? (
                          <Link to={UPDATED_ADMIN_PATHS.userDetail(enr.userId)} className="ua-cfg-ch-ops__user-link">
                            {enrollmentLabel(enr)}
                          </Link>
                        ) : (
                          enrollmentLabel(enr)
                        )}
                        <span className={`ua-cfg-ch-badge ua-cfg-ch-badge--${statusTone(enr.status === "booked" ? "draft" : enr.status === "active" ? "live" : "muted")}`}>
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
                        className="ua-cfg-tc-field ua-cfg-ch-ops__assign"
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
