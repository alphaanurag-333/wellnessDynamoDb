import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateDietPlan,
  adminDeleteDietPlan,
  adminListDietPlans,
  adminUpdateDietPlan,
} from "../api/dietPlanCatalogApi.js";
import { DIET_PLANS_PAGE_SIZE, dietPlanWordCount } from "../data/dietPlansData.js";
import { ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

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

function DietPlanEditModal({ plan, busy, onClose, onChange, onDelete, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan?.content || "");

  useEffect(() => {
    setDraft(plan.content);
  }, [plan.id, plan.content]);

  if (!plan) return null;

  async function saveContent() {
    const content = draft.trim();
    if (!content) {
      onToast("Plan content cannot be empty");
      setDraft(plan.content);
      setEditing(false);
      return;
    }
    if (content === plan.content) {
      setEditing(false);
      return;
    }
    const saved = await onChange({ content });
    if (saved) setEditing(false);
    else setDraft(plan.content);
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
              disabled={busy}
              onClick={() => onChange({ live: !plan.live })}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-dp-modal__delete"
              disabled={busy}
              onClick={() => onDelete(plan)}
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
              disabled={busy}
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
            <button type="button" className="ua-cfg-dp-modal__content" disabled={busy} onClick={() => setEditing(true)}>
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DIET_PLANS_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const plansRef = useRef(plans);

  const selectedPlan = plans.find((entry) => entry.id === selectedId) ?? null;

  const loadPlans = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { plans: rows, pagination: nextPagination } = await adminListDietPlans(null, {
        page: nextPage,
        limit: DIET_PLANS_PAGE_SIZE,
      });
      const next = rows || [];
      setPlans(next);
      plansRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || DIET_PLANS_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load diet plans");
      setPlans([]);
      plansRef.current = [];
      setPagination({ page: 1, limit: DIET_PLANS_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, setPlans]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  async function persistPlan(id, fields, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateDietPlan(null, id, fields);
      if (!updated) throw new Error("Failed to save diet plan");
      setPlans((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save diet plan");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addPlan() {
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) {
      onToast("Name and content are required");
      return;
    }
    if (title.length < 2) {
      onToast("Plan name must be at least 2 characters");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateDietPlan(null, { title, content, live: true });
      if (!created) throw new Error("Failed to add diet plan");
      setNewTitle("");
      setNewContent("");
      setShowAddForm(false);
      onToast(`${title} added to the book`);
      const lastPage = Math.max(1, Math.ceil((pagination.total + 1) / DIET_PLANS_PAGE_SIZE));
      setPage(lastPage);
      await loadPlans(lastPage);
    } catch (error) {
      onToast(error?.message || "Failed to add diet plan");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const plan = pendingDelete;
    setPendingDelete(null);
    if (selectedId === plan.id) setSelectedId(null);
    setBusy(true);
    try {
      await adminDeleteDietPlan(null, plan.id);
      onToast("Diet plan removed");
      const remaining = plansRef.current.filter((entry) => entry.id !== plan.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadPlans(nextPage);
      } else {
        await loadPlans(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete diet plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Diet plan book"
        subtitle={
          loading
            ? "Loading diet plans…"
            : "Add a plan, name it and write it out. Coaches can read every live plan and apply it to a client, but cannot change the book."
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-dp__count">
              {liveCount} live of {pagination.total} 
            </span>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching diet plans from the server…</p>
        ) : plans.length ? (
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
        ) : (
          <p className="ua-cfg-panel__sub">No diet plans in the book yet. Add one below.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={DIET_PLANS_PAGE_SIZE}
            onPageChange={setPage}
            label="Diet plan pagination"
          />
        ) : null}
      </Panel>

      <Panel
        title="Add a diet plan"
        subtitle="Name it, write it out, and it joins the book for every coach."
        actions={
          !showAddForm ? (
            <button style={{borderRadius: "9px",
              border: "1px dashed rgb(203, 213, 230)",
              background: "rgb(255, 255, 255)",
              color: "rgb(94, 106, 210)"}}
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline"
              disabled={busy || loading}
              onClick={() => setShowAddForm(true)}
            >
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
              disabled={busy}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <textarea
              className="ua-cfg-dp-add__content"
              rows={4}
              
              value={newContent}
              disabled={busy}
              onChange={(event) => setNewContent(event.target.value)}
            />
            <div className="ua-cfg-dp-add__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addPlan}>
                {busy ? "Adding…" : "Add to book"}
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
                disabled={busy}
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
          busy={busy}
          onClose={() => setSelectedId(null)}
          onChange={(fields) => {
            const message = fields.content !== undefined
              ? "Diet plan saved"
              : fields.live
                ? "Diet plan is live"
                : "Diet plan hidden";
            return persistPlan(selectedPlan.id, fields, message);
          }}
          onDelete={(plan) => setPendingDelete(plan)}
          onToast={onToast}
        />
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete diet plan"
        title={pendingDelete ? `Remove “${pendingDelete.title}”?` : ""}
        body="This will permanently remove the plan from the book. You can’t undo this."
        cancelLabel="Keep plan"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export { DIET_PLANS } from "../data/dietPlansData.js";
