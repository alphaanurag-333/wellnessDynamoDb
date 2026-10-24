import { useCallback, useEffect, useMemo, useState } from "react";
import { DIET_PLAN_SECTIONS } from "../../data/foodData.js";
import {
  listUserDietPlanAssignments,
  saveUserPersonalisedDietPlan,
} from "../../api/dietPlanCatalogApi.js";
import { useClientSectionPermissions } from "./ClientProfileSectionGate.jsx";
import { DietPlanBookPanel } from "./DietPlanBookPanel.jsx";
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
  const [error, setError] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [sections, setSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [savedSections, setSavedSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [editing, setEditing] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

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
      const nextAssignmentId = String(data?.recommended?.id || "").trim();
      const fromApi = Array.isArray(data?.personalisedSections) ? data.personalisedSections : [];
      const nextSections = fromApi.length
        ? cloneSections(fromApi)
        : defaultSections();
      setAssignmentId(nextAssignmentId);
      setSections(nextSections);
      setSavedSections(cloneSections(nextSections));
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

  function startEdit() {
    setSections(cloneSections(savedSections));
    setEditing(true);
  }

  function cancelEdit() {
    setSections(cloneSections(savedSections));
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
      setSections(nextSections);
      setSavedSections(cloneSections(nextSections));
      setEditing(false);
      onToast?.("Diet plan saved & synced to client app");
    } catch (err) {
      onToast?.(err?.message || "Could not save diet plan");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <p className="ua-cp-food-diet__empty">Client is required to load a diet plan.</p>;
  }

  const showEditor = editing && canManage;

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
                <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm"
                  onClick={savePlan}
                  disabled={saving || !dirty}
                >
                  {saving ? "Saving…" : "✓ Save plan"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-food-diet__edit"
                onClick={startEdit}
                disabled={saving || loading}
              >
                ✎ Edit plan
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

      {!loading && (live ? isHealClient : true) ? (
        <>
          {sections.map((section) => (
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
          ))}
          {showEditor ? (
            <button type="button" className="ua-cp-food-diet__add-section" onClick={addSection}>
              + Add section
            </button>
          ) : null}
          {!sections.length && !showEditor ? (
            <p className="ua-cp-food-diet__empty">No diet plan yet. Click Edit plan to build one for this client.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
