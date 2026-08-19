import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateMedicalConditionQuestion,
  adminDeleteMedicalConditionQuestion,
  adminListMedicalConditionQuestions,
  adminReorderMedicalConditionQuestions,
  adminUpdateMedicalConditionQuestion,
} from "../api/medicalConditionQuestionApi.js";
import { MEDICAL_ANSWER_TYPES } from "../data/configDetailData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect } from "./shared.jsx";

const ANSWER_TYPE_OPTIONS = MEDICAL_ANSWER_TYPES.map((option) => ({
  id: option.id,
  value: option.id,
  label: option.label,
}));

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel ua-cfg-mq">
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

export function MedicalQuestionnairePanel({ items, setItems, onToast }) {
  const shownCount = items.filter((item) => item.shown).length;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswerType, setNewAnswerType] = useState("yes_no_text");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { questions } = await adminListMedicalConditionQuestions(null, { limit: 200 });
      setItems(questions);
    } catch (error) {
      onToast(error?.message || "Failed to load medical questions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setItems]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft(item.question);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function persistOrder(nextItems) {
    const orderedIds = nextItems.map((entry) => entry.id);
    const questions = await adminReorderMedicalConditionQuestions(null, orderedIds);
    setItems(questions.length ? questions : nextItems);
  }

  async function saveEdit(id) {
    const question = editDraft.trim();
    if (!question) {
      onToast("Question is required");
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdateMedicalConditionQuestion(null, id, { question });
      setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      cancelEdit();
      onToast("Question saved");
    } catch (error) {
      onToast(error?.message || "Failed to save question");
    } finally {
      setBusy(false);
    }
  }

  async function addQuestion() {
    const question = newQuestion.trim();
    if (!question) {
      onToast("Type a question first");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateMedicalConditionQuestion(null, {
        question,
        answerType: newAnswerType,
        shown: true,
      });
      setItems((prev) => [...prev, created]);
      setNewQuestion("");
      setNewAnswerType("yes_no_text");
      onToast("Question added");
    } catch (error) {
      onToast(error?.message || "Failed to add question");
    } finally {
      setBusy(false);
    }
  }

  async function changeAnswerType(item, answerType) {
    if (answerType === item.answerType) return;
    setBusy(true);
    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, answerType } : entry)),
    );
    try {
      const updated = await adminUpdateMedicalConditionQuestion(null, item.id, { answerType });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)));
      onToast("Answer type updated");
    } catch (error) {
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, answerType: item.answerType } : entry,
        ),
      );
      onToast(error?.message || "Failed to update answer type");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShown(item) {
    const nextShown = !item.shown;
    setBusy(true);
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
          : entry,
      ),
    );
    try {
      const updated = await adminUpdateMedicalConditionQuestion(null, item.id, { shown: nextShown });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)));
      onToast(nextShown ? "Question shown" : "Question hidden");
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

  async function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    if (editingId === item.id) cancelEdit();
    setBusy(true);
    const previous = itemsRef.current;
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setPendingDelete(null);
    try {
      await adminDeleteMedicalConditionQuestion(null, item.id);
      onToast("Question removed");
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Failed to delete question");
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
      onToast(error?.message || "Failed to reorder questions");
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
      onToast(error?.message || "Failed to reorder questions");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Questions"
      subtitle={
        loading
          ? "Loading medical questions…"
          : `Clients answer these during onboarding. Drag to reorder · ${shownCount} of ${items.length} live in the app`
      }
      actions={<span className="ua-cfg-mq__count">{shownCount} of {items.length} live</span>}
    >
      <div className="ua-cfg-mq-add">
        <input
          type="text"
          className="ua-cfg-mq-add__input"
          placeholder="Type a question..."
          value={newQuestion}
          disabled={busy || loading}
          onChange={(event) => setNewQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addQuestion();
          }}
        />
        <CfgSelect
          className="ua-cfg-mq-add__type"
          ariaLabel="Answer type"
          value={newAnswerType}
          disabled={busy || loading}
          options={ANSWER_TYPE_OPTIONS}
          onChange={setNewAnswerType}
        />
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-mq-add__btn"
          disabled={busy || loading}
          onClick={addQuestion}
        >
          {busy ? "Saving…" : "+ Add question"}
        </button>
      </div>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching questions from the server…</p>
      ) : (
        <div className="ua-cfg-mq-list">
          {!items.length ? (
            <p className="ua-cfg-mq-empty">No questions yet. Add one to show it in onboarding.</p>
          ) : null}
          {items.map((item, index) => {
            const isEditing = editingId === item.id;
            const isDragging = dragId === item.id;
            const isDragOver = dragOverId === item.id && dragId !== item.id;

            return (
              <article
                key={item.id}
                className={[
                  "ua-cfg-mq-row",
                  isEditing ? "ua-cfg-mq-row--editing" : "",
                  isDragging ? "ua-cfg-mq-row--dragging" : "",
                  isDragOver ? "ua-cfg-mq-row--drag-over" : "",
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
                <span className="ua-cfg-mq-row__drag" aria-hidden="true" title="Drag to reorder">
                  ⋮⋮
                </span>
                <span className="ua-cfg-mq-row__num">{index + 1}</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="ua-cfg-mq-row__input"
                    value={editDraft}
                    autoFocus
                    disabled={busy}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveEdit(item.id);
                      if (event.key === "Escape") cancelEdit();
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="ua-cfg-mq-row__question"
                    disabled={busy}
                    onClick={() => startEdit(item)}
                  >
                    {item.question}
                  </button>
                )}
                <div className="ua-cfg-mq-row__controls">
                  <CfgSelect
                    className="ua-cfg-mq-row__type"
                    value={item.answerType}
                    disabled={busy}
                    ariaLabel={`Answer type for ${item.question}`}
                    options={ANSWER_TYPE_OPTIONS}
                    onChange={(answerType) => changeAnswerType(item, answerType)}
                  />
                  <div className="ua-cfg-mq-row__shown-wrap">
                    <span className={`ua-cfg-faq__shown${item.shown ? " is-on" : ""}`}>
                      {item.shown ? "SHOWN" : "HIDDEN"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
                      aria-pressed={item.shown}
                      aria-label={`Toggle ${item.question}`}
                      disabled={busy}
                      onClick={() => toggleShown(item)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  <div className="ua-cfg-mq-row__btns">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                          disabled={busy}
                          onClick={() => saveEdit(item.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ua-cfg-icon-btn"
                          aria-label="Move up"
                          disabled={busy || index === 0}
                          onClick={() => moveItem(item.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-icon-btn"
                          aria-label="Move down"
                          disabled={busy || index === items.length - 1}
                          onClick={() => moveItem(item.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-icon-btn ua-cfg-icon-btn--danger ua-cfg-mq-row__delete"
                          aria-label="Delete question"
                          disabled={busy}
                          onClick={() => setPendingDelete(item)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Medical questionnaire"
        title={`Delete ${pendingDelete?.question || "this question"}?`}
        body="This permanently removes the onboarding question."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Panel>
  );
}
