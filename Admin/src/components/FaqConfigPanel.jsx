import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateFaq,
  adminDeleteFaq,
  adminListFaqs,
  adminReorderFaqs,
  adminUpdateFaq,
} from "../api/faqApi.js";
import { asCopyString } from "../data/bannerConfigData.js";

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

function FaqItemControls({
  item,
  onToggleShown,
  onEdit,
  onSave,
  onMoveUp,
  onMoveDown,
  onDelete,
  isEditing,
  busy,
}) {
  return (
    <div className="ua-cfg-faq__controls">
      <span className={`ua-cfg-faq__shown${item.shown ? " is-on" : ""}`}>
        {item.shown ? "SHOWN" : "HIDDEN"}
      </span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
        aria-pressed={item.shown}
        aria-label={`Toggle ${item.question || "question"}`}
        disabled={busy}
        onClick={onToggleShown}
      >
        <span className="ua-toggle__knob" />
      </button>
      {isEditing ? (
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--primary"
          disabled={busy}
          onClick={onSave}
        >
          Save
        </button>
      ) : (
        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={onEdit}>
          Edit
        </button>
      )}
      <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={busy} onClick={onMoveUp}>
        ↑
      </button>
      <button
        type="button"
        className="ua-cfg-icon-btn"
        aria-label="Move down"
        disabled={busy}
        onClick={onMoveDown}
      >
        ↓
      </button>
      <button
        type="button"
        className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
        aria-label="Delete"
        disabled={busy}
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  );
}

function FaqNewQuestionForm({ draft, onChange, onClose, onSubmit, inputRef, busy }) {
  return (
    <section className="ua-cfg-faq-new">
      <div className="ua-cfg-faq-new__head">
        <h4 className="ua-cfg-faq-new__title">
          <span aria-hidden="true">❓</span> New question
        </h4>
        <button type="button" className="ua-cfg-icon-btn" aria-label="Close" disabled={busy} onClick={onClose}>
          ×
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        className="ua-cfg-faq-new__question"
        value={asCopyString(draft.question)}
        placeholder="Question · e.g. Can I switch my coach?"
        disabled={busy}
        onChange={(event) => onChange({ ...draft, question: event.target.value })}
      />
      <textarea
        className="ua-cfg-faq-new__answer"
        value={asCopyString(draft.answer)}
        placeholder="Answer shown in the app..."
        rows={5}
        disabled={busy}
        onChange={(event) => onChange({ ...draft, answer: event.target.value })}
      />
      <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={onSubmit}>
        {busy ? "Adding…" : "Add question"}
      </button>
    </section>
  );
}

function applyOrder(items, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return items;
  const fromIdx = items.findIndex((entry) => entry.id === fromId);
  const toIdx = items.findIndex((entry) => entry.id === toId);
  if (fromIdx < 0 || toIdx < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
}

export function FaqConfigPanel({ items, setItems, onToast }) {
  const shownCount = items.filter((item) => item.shown).length;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState({ question: "", answer: "" });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const addFormRef = useRef(null);
  const newQuestionRef = useRef(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const { faqs } = await adminListFaqs(null, { limit: 200 });
      setItems(faqs);
    } catch (error) {
      onToast(error?.message || "Failed to load FAQs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setItems]);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  useEffect(() => {
    if (!showAddForm) return undefined;
    const timer = window.setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      newQuestionRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showAddForm]);

  function startEdit(item) {
    setShowAddForm(false);
    setEditingId(item.id);
    setDraft({ question: asCopyString(item.question), answer: asCopyString(item.answer) });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ question: "", answer: "" });
  }

  function closeAddForm() {
    setShowAddForm(false);
    setNewDraft({ question: "", answer: "" });
  }

  function openAddForm() {
    cancelEdit();
    setShowAddForm(true);
  }

  async function persistOrder(nextItems) {
    const orderedIds = nextItems.map((entry) => entry.id);
    const faqs = await adminReorderFaqs(null, orderedIds);
    setItems(faqs.length ? faqs : nextItems);
  }

  async function saveEdit(id) {
    const question = draft.question.trim();
    const answer = draft.answer.trim();
    if (!question || !answer) {
      onToast("Question and answer are required");
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdateFaq(null, id, { question, answer });
      setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      cancelEdit();
      onToast("FAQ saved");
    } catch (error) {
      onToast(error?.message || "Failed to save FAQ");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewQuestion() {
    const question = newDraft.question.trim();
    const answer = newDraft.answer.trim();
    if (!question || !answer) {
      onToast("Question and answer are required");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateFaq(null, { question, answer, shown: true });
      setItems((prev) => [...prev, created]);
      closeAddForm();
      onToast("Question added");
    } catch (error) {
      onToast(error?.message || "Failed to add FAQ");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShown(item) {
    setBusy(true);
    const nextShown = !item.shown;
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
          : entry,
      ),
    );
    try {
      const updated = await adminUpdateFaq(null, item.id, { shown: nextShown });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)));
      onToast(nextShown ? "FAQ shown" : "FAQ hidden");
    } catch (error) {
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, shown: item.shown, status: item.status }
            : entry,
        ),
      );
      onToast(error?.message || "Failed to update visibility");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete “${item.question || "this question"}”?`)) return;
    if (editingId === item.id) cancelEdit();
    setBusy(true);
    const previous = itemsRef.current;
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      await adminDeleteFaq(null, item.id);
      onToast("Question removed");
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Failed to delete FAQ");
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(id, dir) {
    const prev = itemsRef.current;
    const idx = prev.findIndex((entry) => entry.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return;
    const copy = [...prev];
    [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
    const next = copy.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    setItems(next);
    setBusy(true);
    try {
      await persistOrder(next);
    } catch (error) {
      setItems(prev);
      onToast(error?.message || "Failed to reorder FAQ");
    } finally {
      setBusy(false);
    }
  }

  async function finishDrag(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const previous = itemsRef.current;
    const next = applyOrder(previous, fromId, toId);
    setDragId(null);
    setDragOverId(null);
    if (next === previous || next.every((entry, i) => entry.id === previous[i]?.id)) return;
    setItems(next);
    setBusy(true);
    try {
      await persistOrder(next);
      onToast("Order updated");
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Failed to reorder FAQ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      className="ua-cfg-faq-shell"
      title="Questions & answers"
      subtitle={
        loading
          ? "Loading FAQs…"
          : `Drag to reorder · ${shownCount} of ${items.length} shown`
      }
      actions={(
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-faq-add"
          disabled={busy || loading}
          onClick={openAddForm}
        >
          + Add question
        </button>
      )}
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching questions from the server…</p>
      ) : (
        <div className="ua-cfg-faq-list">
          {showAddForm ? (
            <div ref={addFormRef}>
              <FaqNewQuestionForm
                draft={newDraft}
                onChange={setNewDraft}
                onClose={closeAddForm}
                onSubmit={submitNewQuestion}
                inputRef={newQuestionRef}
                busy={busy}
              />
            </div>
          ) : null}
          {!items.length && !showAddForm ? (
            <p className="ua-cfg-panel__sub">No FAQs yet. Add a question to get started.</p>
          ) : null}
          {items.map((item, index) => {
            const isEditing = editingId === item.id;
            const isDragging = dragId === item.id;
            const isDragOver = dragOverId === item.id && dragId !== item.id;

            return (
              <article
                key={item.id}
                className={[
                  "ua-cfg-faq",
                  isEditing ? "ua-cfg-faq--editing" : "",
                  isDragging ? "ua-cfg-faq--dragging" : "",
                  isDragOver ? "ua-cfg-faq--drag-over" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable={!isEditing && !busy}
                onDragStart={(event) => {
                  if (isEditing || busy) {
                    event.preventDefault();
                    return;
                  }
                  setDragId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragOver={(event) => {
                  if (!dragId || dragId === item.id) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverId !== item.id) setDragOverId(item.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === item.id) setDragOverId(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId = event.dataTransfer.getData("text/plain") || dragId;
                  finishDrag(fromId, item.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverId(null);
                }}
              >
                <span
                  className="ua-cfg-faq__drag"
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                    <circle cx="2" cy="2" r="1.25" />
                    <circle cx="8" cy="2" r="1.25" />
                    <circle cx="2" cy="8" r="1.25" />
                    <circle cx="8" cy="8" r="1.25" />
                    <circle cx="2" cy="14" r="1.25" />
                    <circle cx="8" cy="14" r="1.25" />
                  </svg>
                </span>
                <span className="ua-cfg-faq__num">Q{index + 1}</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="ua-cfg-faq__question-input"
                    value={asCopyString(draft.question)}
                    placeholder="Question"
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, question: event.target.value }))
                    }
                  />
                ) : (
                  <strong className="ua-cfg-faq__question">{asCopyString(item.question)}</strong>
                )}
                <FaqItemControls
                  item={item}
                  isEditing={isEditing}
                  busy={busy}
                  onToggleShown={() => toggleShown(item)}
                  onEdit={() => startEdit(item)}
                  onSave={() => saveEdit(item.id)}
                  onMoveUp={() => moveItem(item.id, -1)}
                  onMoveDown={() => moveItem(item.id, 1)}
                  onDelete={() => removeItem(item)}
                />
                {isEditing ? (
                  <textarea
                    className="ua-cfg-faq__answer-input"
                    value={asCopyString(draft.answer)}
                    placeholder="Answer"
                    rows={4}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, answer: event.target.value }))
                    }
                  />
                ) : (
                  <p className="ua-cfg-faq__answer">{asCopyString(item.answer)}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
