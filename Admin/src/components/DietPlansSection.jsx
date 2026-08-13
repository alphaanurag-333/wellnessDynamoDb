import { useState } from "react";
import { dietPlanWordCount } from "../data/dietPlansData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function DietPlanEditModal({ plan, onClose, onChange, onDelete, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan.content);

  if (!plan) return null;

  function saveContent() {
    const content = draft.trim();
    if (!content) {
      onToast("Plan content cannot be empty");
      setDraft(plan.content);
      setEditing(false);
      return;
    }
    onChange({ ...plan, content });
    setEditing(false);
    onToast("Diet plan saved");
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-dp-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-dp-modal__head">
          <div>
            <h3 className="ua-cfg-dp-modal__title">{plan.title}</h3>
            <p className="ua-cfg-dp-modal__sub">Diet plan · master book</p>
          </div>
          <div className="ua-cfg-dp-modal__actions">
            <span className="ua-cfg-dp-modal__live-label">Live</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${plan.live ? " ua-toggle--on" : ""}`}
              aria-pressed={plan.live}
              onClick={() => onChange({ ...plan, live: !plan.live })}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-dp-modal__delete"
              onClick={() => {
                onDelete(plan.id);
                onClose();
              }}
            >
              Delete
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="ua-cfg-dp-modal__body">
          {editing ? (
            <textarea
              className="ua-cfg-dp-modal__textarea"
              rows={8}
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveContent}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraft(plan.content);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button type="button" className="ua-cfg-dp-modal__content" onClick={() => setEditing(true)}>
              {plan.content}
            </button>
          )}
        </div>

        <p className="ua-cfg-dp-modal__foot">Click the text to edit · changes save when you click away</p>
      </div>
    </div>
  );
}

export function DietPlansSection({ plans, setPlans, onToast }) {
  const liveCount = plans.filter((entry) => entry.live).length;
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const selectedPlan = plans.find((entry) => entry.id === selectedId) ?? null;

  function updatePlan(nextPlan) {
    setPlans(plans.map((entry) => (entry.id === nextPlan.id ? nextPlan : entry)));
  }

  function deletePlan(id) {
    setPlans(plans.filter((entry) => entry.id !== id));
    onToast("Diet plan removed");
  }

  function addPlan() {
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) {
      onToast("Name and content are required");
      return;
    }
    setPlans([
      ...plans,
      {
        id: `dp-${Date.now()}`,
        title,
        content,
        live: true,
      },
    ]);
    setNewTitle("");
    setNewContent("");
    setShowAddForm(false);
    onToast(`${title} added to the book`);
  }

  return (
    <>
      <Panel
        title="Diet plan book"
        subtitle="Add a plan, name it and write it out. Coaches can read every live plan and apply it to a client, but cannot change the book."
        actions={<span className="ua-cfg-dp__count">{liveCount} of {plans.length} live</span>}
      >
        <div className="ua-cfg-dp-grid">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              className={`ua-cfg-dp-card${selectedId === plan.id ? " is-selected" : ""}`}
              onClick={() => setSelectedId(plan.id)}
            >
              <div className="ua-cfg-dp-card__top">
                <strong>{plan.title}</strong>
                {plan.live ? <span className="ua-cfg-dp-card__live">Live</span> : null}
              </div>
              <p className="ua-cfg-dp-card__excerpt">{plan.content}</p>
              <span className="ua-cfg-dp-card__words">{dietPlanWordCount(plan.content)} words</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Add a diet plan"
        subtitle="Name it, write it out, and it joins the book for every coach."
        actions={
          !showAddForm ? (
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={() => setShowAddForm(true)}>
              + New diet plan
            </button>
          ) : null
        }
      >
        {showAddForm ? (
          <div className="ua-cfg-dp-add">
            <input
              type="text"
              className="ua-cfg-dp-add__title"
              placeholder="Plan name · e.g. Thyroid care · 14 day"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <textarea
              className="ua-cfg-dp-add__content"
              rows={6}
              placeholder="Write the full plan here…"
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
            />
            <div className="ua-cfg-dp-add__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addPlan}>
                Add to book
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewContent("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      {selectedPlan ? (
        <DietPlanEditModal
          plan={selectedPlan}
          onClose={() => setSelectedId(null)}
          onChange={updatePlan}
          onDelete={deletePlan}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}

export { DIET_PLANS } from "../data/dietPlansData.js";
