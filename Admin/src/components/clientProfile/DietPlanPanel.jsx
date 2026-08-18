import { useState } from "react";
import { DIET_PLAN_SECTIONS } from "../../data/foodData.js";

function cloneSections(sections) {
  return sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => ({ ...row })),
  }));
}

function DietPlanSection({ section, editing, onUpdateRow, onRemoveRow, onAddRow, onRemoveSection }) {
  return (
    <div className="ua-cp-food-diet-section">
      <div className="ua-cp-food-diet-section__head">
        <span>{section.title}</span>
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
            <span className="ua-cp-food-diet-row__label">{row.label}</span>
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

export function DietPlanPanel({ onToast, live = false, loading = false, assignment = null, sections: liveSections }) {
  const [sections, setSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [savedSections, setSavedSections] = useState(() => cloneSections(DIET_PLAN_SECTIONS));
  const [editing, setEditing] = useState(false);

  const displaySections = live
    ? (Array.isArray(liveSections) ? liveSections : [])
    : sections;
  const canEdit = !live;

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
      const optionCount = section.rows.filter((r) => r.label.startsWith("Option")).length;
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

  function startEdit() {
    setSections(cloneSections(savedSections));
    setEditing(true);
  }

  function cancelEdit() {
    setSections(cloneSections(savedSections));
    setEditing(false);
  }

  function savePlan() {
    setSavedSections(cloneSections(sections));
    setEditing(false);
    onToast("Diet plan saved & synced to client app");
  }

  const subtitle = live
    ? (assignment?.startDate
      ? `Assigned ${assignment.startDate}${assignment.note ? ` · ${assignment.note}` : ""}`
      : "Coach-assigned plan visible in the client app")
    : "Meal sections with client-choosable options & quantities";

  return (
    <div className="ua-cp-food-diet">
      <div className="ua-cp-food-diet__head">
        <div>
          <strong className="ua-cp-food-diet__title">Personalised diet plan</strong>
          <span className="ua-cp-food-diet__sub">{subtitle}</span>
        </div>
        {live && assignment?.pdfUrl ? (
          <a
            className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm"
            href={assignment.pdfUrl}
            target="_blank"
            rel="noreferrer"
          >
            ↓ Download PDF
          </a>
        ) : null}
        {!live && (editing ? (
          <div className="ua-cp-food-diet__actions">
            <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm" onClick={cancelEdit}>Cancel</button>
            <button type="button" className="ua-cp-btn ua-cp-btn--primary ua-cp-btn--sm" onClick={savePlan}>✓ Save plan</button>
          </div>
        ) : (
          <button type="button" className="ua-cp-btn ua-cp-btn--outline ua-cp-btn--sm ua-cp-food-diet__edit" onClick={startEdit}>
            ✎ Edit plan
          </button>
        ))}
      </div>
      {loading ? (
        <p className="ua-page-head__sub">Loading diet plan…</p>
      ) : displaySections.length ? (
        displaySections.map((section) => (
          <DietPlanSection
            key={section.id}
            section={section}
            editing={canEdit && editing}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
            onAddRow={addRow}
            onRemoveSection={removeSection}
          />
        ))
      ) : (
        <p className="ua-page-head__sub">No diet plan assigned to this client yet.</p>
      )}
    </div>
  );
}
