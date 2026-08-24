import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateFaq,
  adminDeleteFaq,
  adminListFaqs,
  adminReorderFaqs,
  adminUpdateFaq,
} from "../api/faqApi.js";
import { adminUpdateSectionSurfaceConfig } from "../api/sectionSurfaceConfigApi.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import "./faqConfig.css";

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

function FaqItemControls({
  item,
  onToggleShown,
  onToggleSurface,
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
      <div className="ua-cfg-faq__surfaces">
        <div className="ua-cfg-faq__live">
          <span className={`ua-cfg-faq__shown${item.webVisible ? " is-on" : ""}`}>WEB</span>
          <button
            type="button"
            className={`ua-toggle ua-toggle--sm${item.webVisible ? " ua-toggle--on" : ""}`}
            aria-pressed={item.webVisible}
            aria-label={item.webVisible ? "Hide on web" : "Show on web"}
            disabled={busy}
            onClick={() => onToggleSurface("webVisible")}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
        <div className="ua-cfg-faq__live">
          <span className={`ua-cfg-faq__shown${item.appVisible ? " is-on" : ""}`}>APP</span>
          <button
            type="button"
            className={`ua-toggle ua-toggle--sm${item.appVisible ? " ua-toggle--on" : ""}`}
            aria-pressed={item.appVisible}
            aria-label={item.appVisible ? "Hide on app" : "Show on app"}
            disabled={busy}
            onClick={() => onToggleSurface("appVisible")}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
        <div className="ua-cfg-faq__live">
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
        </div>
      </div>
      <div className="ua-cfg-faq__actions">
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
        placeholder="Answer shown on app and web..."
        rows={5}
        disabled={busy}
        onChange={(event) => onChange({ ...draft, answer: event.target.value })}
      />
      <div className="ua-cfg-bn-surfaces ua-cfg-faq-new__surfaces">
        <div className={`paddingmanage ua-cfg-bn-surface ua-cfg-bn-surface--web${draft.webVisible ? " is-on" : ""}`}>
          <span>Web {draft.webVisible ? "Visible" : "Hidden"}</span>
          <button
            type="button"
            className={`ua-toggle ua-toggle--sm${draft.webVisible ? " ua-toggle--on" : ""}`}
            aria-pressed={draft.webVisible}
            disabled={busy}
            onClick={() => onChange({ ...draft, webVisible: !draft.webVisible })}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
        <div className={`paddingmanage ua-cfg-bn-surface ua-cfg-bn-surface--app${draft.appVisible ? " is-on" : ""}`}>
          <span>App {draft.appVisible ? "Visible" : "Hidden"}</span>
          <button
            type="button"
            className={`ua-toggle ua-toggle--sm${draft.appVisible ? " ua-toggle--on" : ""}`}
            aria-pressed={draft.appVisible}
            disabled={busy}
            onClick={() => onChange({ ...draft, appVisible: !draft.appVisible })}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
      </div>
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

const LOCAL_FAQ_PREFIX = "local-";

function isLocalFaqId(id) {
  return String(id || "").startsWith(LOCAL_FAQ_PREFIX);
}

function newLocalFaqId() {
  return `${LOCAL_FAQ_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function snapshotFaqs(list = []) {
  return JSON.stringify(
    list.map((entry) => ({
      id: entry.id,
      question: String(entry.question || ""),
      answer: String(entry.answer || ""),
      shown: entry.shown !== false,
      webVisible: entry.webVisible !== false,
      appVisible: entry.appVisible !== false,
    })),
  );
}

function snapshotSurface(value) {
  return JSON.stringify({
    appOn: value?.appOn !== false,
    webOn: value?.webOn !== false,
  });
}

function faqChanged(original, entry) {
  if (!original) return true;
  return (
    String(original.question || "") !== String(entry.question || "")
    || String(original.answer || "") !== String(entry.answer || "")
    || (original.shown !== false) !== (entry.shown !== false)
    || (original.webVisible !== false) !== (entry.webVisible !== false)
    || (original.appVisible !== false) !== (entry.appVisible !== false)
  );
}

export function FaqConfigPanel({
  items,
  setItems,
  editor,
  setEditor,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const deferPublish = Boolean(registerPublishHandler);
  const shownCount = items.filter((item) => item.shown).length;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState({ question: "", answer: "", webVisible: true, appVisible: true });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const addFormRef = useRef(null);
  const newQuestionRef = useRef(null);
  const itemsRef = useRef(items);
  const editorRef = useRef(editor);
  const editingIdRef = useRef(editingId);
  const draftRef = useRef(draft);
  const showAddFormRef = useRef(showAddForm);
  const newDraftRef = useRef(newDraft);
  const savedFaqsRef = useRef("[]");
  const savedSurfaceRef = useRef(snapshotSurface({ appOn: true, webOn: true }));
  const persistRef = useRef(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  useEffect(() => {
    editingIdRef.current = editingId;
    draftRef.current = draft;
    showAddFormRef.current = showAddForm;
    newDraftRef.current = newDraft;
  }, [draft, editingId, newDraft, showAddForm]);

  const markSaved = useCallback((nextItems, nextEditor) => {
    savedFaqsRef.current = snapshotFaqs(nextItems);
    savedSurfaceRef.current = snapshotSurface(nextEditor);
    setHasLocalChanges(false);
    onLocalChange?.({ hasLocalChanges: false });
  }, [onLocalChange]);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const { faqs } = await adminListFaqs(null, { limit: 200 });
      setItems(faqs);
      savedFaqsRef.current = snapshotFaqs(faqs);
      setHasLocalChanges(snapshotSurface(editorRef.current) !== savedSurfaceRef.current);
      onLocalChange?.({
        hasLocalChanges: snapshotSurface(editorRef.current) !== savedSurfaceRef.current,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load FAQs");
      setItems([]);
      savedFaqsRef.current = snapshotFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [onLocalChange, onToast, setItems]);

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
    setNewDraft({ question: "", answer: "", webVisible: true, appVisible: true });
  }

  function openAddForm() {
    cancelEdit();
    setShowAddForm(true);
  }

  function syncDirty(nextItems = itemsRef.current, nextEditor = editorRef.current) {
    if (!deferPublish) return;
    const addDraft = newDraftRef.current || {};
    const dirty =
      snapshotFaqs(nextItems) !== savedFaqsRef.current
      || snapshotSurface(nextEditor) !== savedSurfaceRef.current
      || Boolean(editingIdRef.current)
      || (
        showAddFormRef.current
        && (String(addDraft.question || "").trim() || String(addDraft.answer || "").trim())
      );
    setHasLocalChanges(dirty);
    onLocalChange?.({ hasLocalChanges: dirty });
  }

  useEffect(() => {
    if (!deferPublish) return;
    syncDirty();
  }, [deferPublish, editor, editingId, items, newDraft, showAddForm]);

  function commitOpenForms(sourceItems) {
    let nextItems = [...sourceItems];
    const openEditId = editingIdRef.current;
    if (openEditId) {
      const question = String(draftRef.current.question || "").trim();
      const answer = String(draftRef.current.answer || "").trim();
      if (!question || !answer) {
        throw new Error("Finish or cancel the question you're editing before publishing");
      }
      nextItems = nextItems.map((entry) => (
        entry.id === openEditId ? { ...entry, question, answer } : entry
      ));
    }
    if (showAddFormRef.current) {
      const question = String(newDraftRef.current.question || "").trim();
      const answer = String(newDraftRef.current.answer || "").trim();
      if (question || answer) {
        if (!question || !answer) {
          throw new Error("Finish or close the new question form before publishing");
        }
        nextItems = [
          ...nextItems,
          {
            id: newLocalFaqId(),
            question,
            answer,
            shown: true,
            status: "active",
            webVisible: newDraftRef.current.webVisible !== false,
            appVisible: newDraftRef.current.appVisible !== false,
            sortOrder: nextItems.length + 1,
          },
        ];
      }
    }
    return nextItems;
  }

  async function persistFaqs() {
    const nextEditor = {
      appOn: editorRef.current?.appOn !== false,
      webOn: editorRef.current?.webOn !== false,
    };
    const nextItems = commitOpenForms(itemsRef.current);
    setBusy(true);
    try {
      await adminUpdateSectionSurfaceConfig(null, "faq", nextEditor);
      const originalById = new Map(
        JSON.parse(savedFaqsRef.current || "[]").map((entry) => [entry.id, entry]),
      );
      const keepIds = new Set(
        nextItems.filter((entry) => !isLocalFaqId(entry.id)).map((entry) => entry.id),
      );
      for (const original of originalById.values()) {
        if (!keepIds.has(original.id)) {
          await adminDeleteFaq(null, original.id);
        }
      }
      const published = [];
      for (const entry of nextItems) {
        if (isLocalFaqId(entry.id)) {
          const created = await adminCreateFaq(null, {
            question: entry.question,
            answer: entry.answer,
            shown: entry.shown !== false,
            webVisible: entry.webVisible !== false,
            appVisible: entry.appVisible !== false,
          });
          published.push(created);
          continue;
        }
        const original = originalById.get(entry.id);
        if (faqChanged(original, entry)) {
          const updated = await adminUpdateFaq(null, entry.id, {
            question: entry.question,
            answer: entry.answer,
            shown: entry.shown !== false,
            webVisible: entry.webVisible !== false,
            appVisible: entry.appVisible !== false,
          });
          published.push({ ...entry, ...updated });
        } else {
          published.push(entry);
        }
      }
      const orderedIds = published.map((entry) => entry.id);
      const reordered = orderedIds.length ? await adminReorderFaqs(null, orderedIds) : [];
      const finalItems = reordered.length ? reordered : published;
      setItems(finalItems);
      setEditor((prev) => ({ ...(prev || {}), ...nextEditor }));
      cancelEdit();
      closeAddForm();
      markSaved(finalItems, nextEditor);
      return { items: finalItems, editor: nextEditor };
    } finally {
      setBusy(false);
    }
  }

  persistRef.current = persistFaqs;

  useEffect(() => {
    if (!deferPublish) return undefined;
    registerPublishHandler(async () => persistRef.current());
  }, [deferPublish, registerPublishHandler]);

  async function persistOrder(nextItems) {
    if (deferPublish) {
      setItems(nextItems);
      syncDirty(nextItems);
      return;
    }
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
    if (deferPublish) {
      const nextItems = itemsRef.current.map((entry) => (
        entry.id === id ? { ...entry, question, answer } : entry
      ));
      setItems(nextItems);
      cancelEdit();
      syncDirty(nextItems);
      onToast("Question updated — publish to go live");
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
    if (deferPublish) {
      const nextItems = [
        ...itemsRef.current,
        {
          id: newLocalFaqId(),
          question,
          answer,
          shown: true,
          status: "active",
          webVisible: newDraft.webVisible !== false,
          appVisible: newDraft.appVisible !== false,
          sortOrder: itemsRef.current.length + 1,
        },
      ];
      setItems(nextItems);
      closeAddForm();
      syncDirty(nextItems);
      onToast("Question added — publish to go live");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateFaq(null, {
        question,
        answer,
        shown: true,
        webVisible: newDraft.webVisible !== false,
        appVisible: newDraft.appVisible !== false,
      });
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
    const nextShown = !item.shown;
    const nextItems = itemsRef.current.map((entry) =>
      entry.id === item.id
        ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
        : entry,
    );
    setItems(nextItems);
    if (deferPublish) {
      syncDirty(nextItems);
      onToast(nextShown ? "FAQ shown — publish to go live" : "FAQ hidden — publish to go live");
      return;
    }
    setBusy(true);
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

  async function toggleSurface(item, field) {
    if (busy || (field !== "webVisible" && field !== "appVisible")) return;
    const nextValue = !item[field];
    const nextItems = itemsRef.current.map((entry) => (
      entry.id === item.id ? { ...entry, [field]: nextValue } : entry
    ));
    setItems(nextItems);
    if (deferPublish) {
      syncDirty(nextItems);
      onToast(`${field === "webVisible" ? "Web" : "App"} ${nextValue ? "visible" : "hidden"} — publish to go live`);
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdateFaq(null, item.id, { [field]: nextValue });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)));
      onToast(`${field === "webVisible" ? "Web" : "App"} ${nextValue ? "visible" : "hidden"}`);
    } catch (error) {
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, [field]: item[field] } : entry)),
      );
      onToast(error?.message || `Could not update ${field === "webVisible" ? "web" : "app"} visibility`);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete “${item.question || "this question"}”?`)) return;
    if (editingId === item.id) cancelEdit();
    const previous = itemsRef.current;
    const nextItems = previous.filter((entry) => entry.id !== item.id);
    setItems(nextItems);
    if (deferPublish) {
      syncDirty(nextItems);
      onToast("Question removed — publish to go live");
      return;
    }
    setBusy(true);
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
    if (deferPublish) {
      syncDirty(next);
      return;
    }
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
    if (deferPublish) {
      syncDirty(next);
      onToast("Order updated — publish to go live");
      return;
    }
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
    <div className="ua-faq-config">
      <SectionSurfacePanel
        sectionId="faq"
        editor={editor}
        setEditor={setEditor}
        onToast={onToast}
        persistImmediately={!deferPublish}
        onLoaded={(next) => {
          savedSurfaceRef.current = snapshotSurface(next);
          syncDirty(itemsRef.current, next);
        }}
      />
      {deferPublish && hasLocalChanges ? (
        <p className="ua-cfg-panel__sub ua-cfg-panel__sub--warn">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save, or refresh to discard.
        </p>
      ) : null}
      <Panel
      className="ua-cfg-faq-shell"
      title="Questions & answers"
      subtitle={
        loading
          ? "Loading FAQs…"
          : deferPublish
            ? `Edits stay local until you publish · Drag to reorder · ${shownCount} of ${items.length} shown`
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
                  onToggleSurface={(field) => toggleSurface(item, field)}
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
    </div>
  );
}
