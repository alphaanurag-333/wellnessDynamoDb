import { useCallback, useEffect, useMemo, useState } from "react";
import { DIET_PLAN_SECTIONS } from "../../data/foodData.js";
import {
  listUserDietPlanAssignments,
  publishUserPersonalisedDietPlan,
  saveUserPersonalisedDietPlan,
} from "../../api/dietPlanCatalogApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { DietPlanBookPanel } from "./DietPlanBookPanel.jsx";
import { ConfirmDialog } from "../ConfirmDialog.jsx";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

function isLiveUserId(userId) {
  return Boolean(userId) && !isMockNumericId(userId);
}

function cloneSections(sections) {
  return (Array.isArray(sections) ? sections : []).map((section) => ({
    ...section,
    rows: (section.rows || []).map((row) => ({ ...row })),
  }));
}

function sectionsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatPushedLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function historyEntrySummary(entry) {
  const sections = Array.isArray(entry?.personalisedSections) ? entry.personalisedSections : [];
  if (sections.length) {
    const rows = sections.reduce((count, section) => count + (section.rows?.length || 0), 0);
    return `Personalised diet plan · ${sections.length} section${sections.length === 1 ? "" : "s"}, ${rows} option${rows === 1 ? "" : "s"}`;
  }
  const planName = entry?.plans?.[0]?.name || "Diet plan";
  const meals = entry?.plans?.[0]?.meals?.length || 0;
  return meals ? `${planName} · ${meals} item${meals === 1 ? "" : "s"}` : planName;
}

function defaultSections() {
  const stamp = Date.now();
  return [{
    id: `section-${stamp}`,
    title: "New section",
    rows: [{
      id: `row-${stamp}`,
      label: "Option 1",
      description: "New item",
      quantity: "—",
    }],
  }];
}

function DietPlanSection({
  section,
  editing,
  onUpdateSectionTitle,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  onRemoveSection,
}) {
  return (
    <div className="ua-cp-food-diet-section">
      <div className="ua-cp-food-diet-section__head">
        {editing ? (
          <input
            type="text"
            className="ua-cp-food-diet-row__input ua-cp-food-diet-section__title-input"
            value={section.title}
            onChange={(e) => onUpdateSectionTitle(section.id, e.target.value)}
            aria-label="Section title"
          />
        ) : (
          <span>{section.title}</span>
        )}
        <span className="ua-cp-food-diet-section__qty-label">Quantity</span>
        {editing ? (
          <button
            type="button"
            className="ua-cp-food-diet-section__remove"
            onClick={() => onRemoveSection(section.id)}
            aria-label={`Remove ${section.title}`}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="ua-cp-food-diet-section__body">
        {section.rows.map((row) => (
          <div key={row.id} className="ua-cp-food-diet-row">
            {editing ? (
              <input
                type="text"
                className="ua-cp-food-diet-row__input ua-cp-food-diet-row__input--label"
                value={row.label}
                onChange={(e) => onUpdateRow(section.id, row.id, "label", e.target.value)}
              />
            ) : (
              <span className="ua-cp-food-diet-row__label">{row.label}</span>
            )}
            {editing ? (
              <textarea
                className="ua-cp-food-diet-row__input ua-cp-food-diet-row__input--desc"
                value={row.description}
                rows={2}
                onChange={(e) => onUpdateRow(section.id, row.id, "description", e.target.value)}
              />
            ) : (
              <span className="ua-cp-food-diet-row__desc">{row.description}</span>
            )}
            {editing ? (
              <input
                type="text"
                className="ua-cp-food-diet-row__input ua-cp-food-diet-row__input--qty"
                value={row.quantity}
                onChange={(e) => onUpdateRow(section.id, row.id, "quantity", e.target.value)}
              />
            ) : (
              <span className="ua-cp-food-diet-row__qty">{row.quantity}</span>
            )}
            {editing ? (
              <button
                type="button"
                className="ua-cp-food-diet-row__remove"
                onClick={() => onRemoveRow(section.id, row.id)}
                aria-label="Remove row"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {editing ? (
          <button type="button" className="ua-cp-food-diet-section__add" onClick={() => onAddRow(section.id)}>
            + Add row
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DietPlanPanel({ user, onToast, appVisible = true }) {
  const userId = String(user?.id || "").trim();
  const live = isLiveUserId(userId);
  const isHealClient = String(user?.userTier || "").toLowerCase() === "heal" || user?.tier === "Seek to Heal";
  const { canEdit } = useClientSectionPermissions("food");

  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [error, setError] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [pushedAt, setPushedAt] = useState(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [sections, setSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [savedSections, setSavedSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [editing, setEditing] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState("");

  const dirty = useMemo(() => !sectionsEqual(sections, savedSections), [sections, savedSections]);
  const canManage = canEdit && (!live || isHealClient);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      if (!live) {
        const seed = cloneSections(DIET_PLAN_SECTIONS);
        setSections(seed);
        setSavedSections(cloneSections(seed));
        setAssignmentId("");
        return;
      }
      if (!isHealClient) {
        setSections(defaultSections());
        setSavedSections(defaultSections());
        setAssignmentId("");
        return;
      }
      const data = await listUserDietPlanAssignments(userId);
      const recommended = data?.recommended || null;
      const nextAssignmentId = String(recommended?.id || "").trim();
      const fromApi = Array.isArray(data?.personalisedSections) ? data.personalisedSections : [];
      const nextSections = fromApi.length ? cloneSections(fromApi) : [];
      setAssignmentId(nextAssignmentId);
      setPushedAt(recommended?.pushedAt || null);
      setHasUnpublishedChanges(recommended?.hasUnpublishedChanges === true);
      setHistory(Array.isArray(data?.history) ? data.history : []);
      setSections(nextSections);
      setSavedSections(cloneSections(nextSections));
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Failed to load diet plan");
      onToast?.(err?.message || "Failed to load diet plan");
    } finally {
      setLoading(false);
    }
  }, [isHealClient, live, onToast, userId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateSectionTitle(sectionId, value) {
    setSections((list) => list.map((section) => (
      section.id === sectionId ? { ...section, title: value } : section
    )));
  }

  function updateRow(sectionId, rowId, field, value) {
    setSections((list) => list.map((section) => (
      section.id !== sectionId
        ? section
        : {
          ...section,
          rows: section.rows.map((row) => (
            row.id === rowId ? { ...row, [field]: value } : row
          )),
        }
    )));
  }

  function removeRow(sectionId, rowId) {
    setSections((list) => list.map((section) => (
      section.id !== sectionId
        ? section
        : { ...section, rows: section.rows.filter((row) => row.id !== rowId) }
    )));
  }

  function addRow(sectionId) {
    setSections((list) => list.map((section) => {
      if (section.id !== sectionId) return section;
      const optionCount = section.rows.filter((r) => String(r.label || "").startsWith("Option")).length;
      const label = optionCount > 0 ? `Option ${optionCount + 1}` : `Option ${section.rows.length + 1}`;
      return {
        ...section,
        rows: [
          ...section.rows,
          {
            id: `${sectionId}-${Date.now()}`,
            label,
            description: "New item",
            quantity: "—",
          },
        ],
      };
    }));
  }

  function removeSection(sectionId) {
    setSections((list) => list.filter((section) => section.id !== sectionId));
  }

  function addSection() {
    const stamp = Date.now();
    setSections((list) => [
      ...list,
      {
        id: `section-${stamp}`,
        title: "New section",
        rows: [{
          id: `row-${stamp}`,
          label: "Option 1",
          description: "New item",
          quantity: "—",
        }],
      },
    ]);
  }

  function startCreate() {
    setSections(defaultSections());
    setEditing(true);
  }

  function startEdit() {
    setSections(cloneSections(savedSections));
    setEditing(true);
  }

  function cancelEdit() {
    if (live && isHealClient && !assignmentId) {
      setSections([]);
    } else {
      setSections(cloneSections(savedSections));
    }
    setEditing(false);
  }

  async function savePlan() {
    if (!sections.length) {
      onToast?.("Add at least one section");
      return;
    }
    const hasRow = sections.some((section) => section.rows.length > 0);
    if (!hasRow) {
      onToast?.("Add at least one row before saving");
      return;
    }

    setSaving(true);
    try {
      if (!live) {
        setSavedSections(cloneSections(sections));
        setEditing(false);
        onToast?.("Diet plan saved (demo client)");
        return;
      }
      const assignment = await saveUserPersonalisedDietPlan(userId, {
        sections,
        assignmentId: assignmentId || undefined,
      });
      const nextId = String(assignment?.id || "").trim();
      const nextSections = assignment?.personalisedSections?.length
        ? cloneSections(assignment.personalisedSections)
        : cloneSections(sections);
      setAssignmentId(nextId);
      setPushedAt(assignment?.pushedAt || pushedAt);
      setHasUnpublishedChanges(assignment?.hasUnpublishedChanges === true);
      setSections(nextSections);
      setSavedSections(cloneSections(nextSections));
      setEditing(false);
      onToast?.("Diet plan saved (draft only — use Push to App to publish)");
    } catch (err) {
      onToast?.(err?.message || "Could not save diet plan");
    } finally {
      setSaving(false);
    }
  }

  async function pushPlanToApp() {
    if (!live) {
      onToast?.("Push to App is available for live clients only");
      setPushOpen(false);
      return;
    }
    if (!sections.length) {
      onToast?.("Add at least one section before pushing");
      setPushOpen(false);
      return;
    }

    setPushing(true);
    try {
      let nextAssignmentId = assignmentId;
      let lastPushedAt = pushedAt;
      let unpublished = hasUnpublishedChanges || dirty || !pushedAt;

      if (dirty || !nextAssignmentId) {
        const saved = await saveUserPersonalisedDietPlan(userId, {
          sections,
          assignmentId: nextAssignmentId || undefined,
        });
        nextAssignmentId = String(saved?.id || "").trim();
        const nextSections = saved?.personalisedSections?.length
          ? cloneSections(saved.personalisedSections)
          : cloneSections(sections);
        setAssignmentId(nextAssignmentId);
        setSections(nextSections);
        setSavedSections(cloneSections(nextSections));
        setEditing(false);
        lastPushedAt = saved?.pushedAt || null;
        unpublished = saved?.hasUnpublishedChanges === true || !lastPushedAt;
      }
      if (!nextAssignmentId) {
        onToast?.("Save the diet plan first, then push to app");
        return;
      }
      if (lastPushedAt && !unpublished) {
        onToast?.("Diet plan already matches what's in the client app");
        return;
      }
      const result = await publishUserPersonalisedDietPlan(userId, nextAssignmentId);
      const published = result?.assignment;
      if (!published?.pushedAt) {
        onToast?.("Push did not complete — try again");
        return;
      }
      setPushedAt(published.pushedAt);
      setHasUnpublishedChanges(false);
      onToast?.(result?.message || "Diet plan pushed to client app");
      await load();
    } catch (err) {
      onToast?.(err?.message || "Could not push diet plan to app");
    } finally {
      setPushing(false);
      setPushOpen(false);
    }
  }

  if (!userId) {
    return <p className="ua-cp-food-diet__empty">Client is required to load a diet plan.</p>;
  }

  const showEditor = editing && canManage;
  const hasSavedPlan = live && isHealClient
    ? Boolean(assignmentId)
    : savedSections.some((section) => (section.rows?.length || 0) > 0);
  const clientFirstName = String(user?.name || "Client").trim().split(/\s+/)[0] || "Client";
  const pushPending = dirty || hasUnpublishedChanges || !pushedAt;
  const pushDisabled = saving || pushing || loading || !sections.length || !pushPending;
  const saveLabel = hasSavedPlan
    ? (saving ? "Saving…" : "✓ Save plan")
    : (saving ? "Saving…" : "✓ Create plan");

  return (
    <div className="ua-cp-food-diet">
      {!appVisible ? (
        <p className="ua-cp-food-diet__empty">Diet plan is hidden from the client app. Turn the toggle on to show it again.</p>
      ) : null}
      <div className="ua-cp-food-diet__head">
        <div>
          <strong className="ua-cp-food-diet__title">Personalised diet plan</strong>
          <span className="ua-cp-food-diet__sub">Meal sections with client-choosable options &amp; quantities</span>
        </div>
        <div className="ua-cp-food-diet__actions">
          <button
            type="button"
            className={`ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-food-diet__book${bookOpen ? " ua-cp-food-diet__book--open" : ""}`}
            aria-expanded={bookOpen}
            disabled={loading}
            onClick={() => setBookOpen((open) => !open)}
          >
            Diet plan book
          </button>
          {canManage ? (
            showEditor ? (
              <>
                <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={cancelEdit} disabled={saving || pushing}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                  onClick={savePlan}
                  disabled={saving || pushing || !dirty}
                >
                  {saveLabel}
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--orange ua-cp-btn--sm"
                  disabled={pushDisabled}
                  onClick={() => setPushOpen(true)}
                >
                  {pushing ? "Pushing…" : "Push to App"}
                </button>
              </>
            ) : hasSavedPlan ? (
              <>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-food-diet__edit"
                  onClick={startEdit}
                  disabled={saving || pushing || loading}
                >
                  ✎ Edit plan
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--orange ua-cp-btn--sm"
                  disabled={pushDisabled}
                  onClick={() => setPushOpen(true)}
                >
                  {pushing ? "Pushing…" : "Push to App"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                onClick={startCreate}
                disabled={saving || pushing || loading}
              >
                + Create diet plan
              </button>
            )
          ) : null}
        </div>
      </div>

      <DietPlanBookPanel userId={userId} open={bookOpen} onToast={onToast} />

      {loading ? <p className="ua-cp-food-diet__empty">Loading diet plan…</p> : null}
      {error && !loading ? <p className="ua-cp-food-diet__empty">{error}</p> : null}

      {!isHealClient && live && !loading ? (
        <p className="ua-cp-food-diet__empty">Diet plans can only be managed for Heal (paid) clients.</p>
      ) : null}

      {canManage && !loading && (live ? isHealClient : true) ? (
        <p className="ua-cp-food-diet__sub ua-cp-food-diet__draft-note">
          {pushPending
            ? (pushedAt
              ? "Unpublished edits — the app still shows the last pushed version until you Push to App again."
              : "Saved as draft only — the mobile app will not show this until you Push to App.")
            : (pushedAt
              ? `Live in the client app (last pushed ${new Date(pushedAt).toLocaleString()}).`
              : null)}
        </p>
      ) : null}

      {!loading && (live ? isHealClient : true) ? (
        <>
          {!hasSavedPlan && !showEditor ? (
            <div className="ua-cp-food-diet__empty ua-cp-food-diet__empty--create">
              <p>No personalised diet plan for this client yet.</p>
              {canManage ? (
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                  onClick={startCreate}
                  disabled={saving || pushing}
                >
                  + Create diet plan
                </button>
              ) : (
                <p className="ua-cp-food-diet__sub">A coach can create a plan from the actions above.</p>
              )}
            </div>
          ) : null}
          {(hasSavedPlan || showEditor) ? sections.map((section) => (
            <DietPlanSection
              key={section.id}
              section={section}
              editing={showEditor}
              onUpdateSectionTitle={updateSectionTitle}
              onUpdateRow={updateRow}
              onRemoveRow={removeRow}
              onAddRow={addRow}
              onRemoveSection={removeSection}
            />
          )) : null}
          {showEditor ? (
            <button type="button" className="ua-cp-food-diet__add-section" onClick={addSection}>
              + Add section
            </button>
          ) : null}
        </>
      ) : null}

      {!loading && (live ? isHealClient : true) && (hasSavedPlan || history.length > 0) ? (
        <div className="ua-cp-food-diet-history">
          <strong>Push history</strong>
          <span className="ua-cp-food-diet__sub">Previous versions saved when you push an updated plan to the app.</span>
          {!history.length ? (
            <p className="ua-cp-food-diet__empty">No previous pushed diet plans yet. Push an updated plan to archive the current version here and in the mobile app.</p>
          ) : null}
          {history.map((entry) => {
            const expanded = expandedHistoryId === entry.id;
            const historySections = Array.isArray(entry.personalisedSections) ? entry.personalisedSections : [];
            const pdfUrl = entry.publishedPdfUrl || entry.pdfUrl || "";
            return (
              <div key={entry.id} className="ua-cp-food-diet-history__block">
                <div className="ua-cp-food-diet-history__row">
                  <span>{formatPushedLabel(entry.pushedAt) || "—"}</span>
                  <span>{historyEntrySummary(entry)}</span>
                  <span className="ua-cp-food-diet-history__actions">
                    {pdfUrl ? (
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="ua-cp-food-diet-history__link">
                        PDF
                      </a>
                    ) : null}
                    {historySections.length ? (
                      <button
                        type="button"
                        className="ua-cp-food-diet-history__link ua-cp-food-diet-history__link--btn"
                        onClick={() => setExpandedHistoryId(expanded ? "" : entry.id)}
                      >
                        {expanded ? "Hide" : "View"}
                      </button>
                    ) : null}
                  </span>
                </div>
                {expanded && historySections.length ? (
                  <div className="ua-cp-food-diet-history__preview">
                    {historySections.map((section) => (
                      <DietPlanSection
                        key={`${entry.id}-${section.id}`}
                        section={section}
                        editing={false}
                        onUpdateSectionTitle={() => {}}
                        onUpdateRow={() => {}}
                        onRemoveRow={() => {}}
                        onAddRow={() => {}}
                        onRemoveSection={() => {}}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <ConfirmDialog
        open={pushOpen}
        tag="Diet plan"
        title={`Push diet plan to ${clientFirstName}'s app?`}
        body={`This publishes the personalised diet plan and PDF for ${clientFirstName} in the mobile app. Unsaved edits are saved first.`}
        cancelLabel="Cancel"
        confirmLabel={pushing ? "Pushing…" : "Push to App"}
        onCancel={() => {
          if (!pushing) setPushOpen(false);
        }}
        onConfirm={pushPlanToApp}
      />
    </div>
  );
}
