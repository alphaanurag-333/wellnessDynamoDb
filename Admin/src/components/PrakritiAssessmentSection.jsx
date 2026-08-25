import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PRAKRUTI_CATEGORIES,
  PRAKRUTI_TYPE_OPTIONS,
  adminCreatePrakrutiQuestion,
  adminCreatePrakrutiRecommendation,
  adminCreatePrakrutiThingToAvoid,
  adminDeletePrakrutiQuestion,
  adminDeletePrakrutiRecommendation,
  adminDeletePrakrutiThingToAvoid,
  adminListPrakrutiQuestions,
  adminListPrakrutiRecommendations,
  adminListPrakrutiThingsToAvoid,
  adminUpdatePrakrutiQuestion,
  adminUpdatePrakrutiRecommendation,
  adminUpdatePrakrutiThingToAvoid,
} from "../api/prakrutiAssessmentApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect } from "./shared.jsx";

const DOSHA_UI = {
  Vata: { letter: "V", name: "Vāta", sub: "AIR + SPACE", tone: "blue" },
  Pitta: { letter: "P", name: "Pitta", sub: "FIRE + WATER", tone: "orange" },
  Kapha: { letter: "K", name: "Kapha", sub: "EARTH + WATER", tone: "green" },
};

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel ua-cfg-mq ua-cfg-prakriti${className ? ` ${className}` : ""}`}>
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

function typeLabel(value) {
  return PRAKRUTI_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || value || "—";
}

export function PrakritiAssessmentSection({
  questions,
  setQuestions,
  thingsToAvoid,
  setThingsToAvoid,
  recommendations,
  setRecommendations,
  onToast,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [drafts, setDrafts] = useState({ Vata: "", Pitta: "", Kapha: "" });
  const [newRec, setNewRec] = useState("");
  const [newRecType, setNewRecType] = useState("vata");
  const [recFilter, setRecFilter] = useState("vata");
  const [newAvoid, setNewAvoid] = useState("");

  const questionsRef = useRef(questions);
  const avoidRef = useRef(thingsToAvoid);
  const recRef = useRef(recommendations);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  useEffect(() => {
    avoidRef.current = thingsToAvoid;
  }, [thingsToAvoid]);
  useEffect(() => {
    recRef.current = recommendations;
  }, [recommendations]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, aRes, rRes] = await Promise.all([
        adminListPrakrutiQuestions(null, { limit: 200 }),
        adminListPrakrutiThingsToAvoid(null, { limit: 200 }),
        adminListPrakrutiRecommendations(null, { limit: 200 }),
      ]);
      const doshaOnly = (qRes.questions || []).filter((row) =>
        ["vata", "pitta", "kapha"].includes(String(row.category || "").toLowerCase()),
      );
      setQuestions(doshaOnly);
      setThingsToAvoid(aRes.thingsToAvoid || []);
      setRecommendations(rRes.recommendations || []);
    } catch (error) {
      onToast(error?.message || "Failed to load Prakriti catalog");
      setQuestions([]);
      setThingsToAvoid([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setQuestions, setThingsToAvoid, setRecommendations]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const columns = useMemo(
    () =>
      PRAKRUTI_CATEGORIES.map((cat) => {
        const rows = questions
          .filter((q) => String(q.category || "").toLowerCase() === cat.value.toLowerCase())
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const live = rows.filter((row) => row.shown).length;
        return {
          ...cat,
          ...DOSHA_UI[cat.value],
          rows,
          live,
          max: Math.max(rows.length, 10),
        };
      }),
    [questions],
  );

  const liveTotal = useMemo(
    () => questions.filter((row) => row.shown).length,
    [questions],
  );

  const filteredRecs = useMemo(() => {
    return recommendations
      .filter((row) => row.prakrutiType === recFilter)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [recommendations, recFilter]);

  const liveRecForType = useMemo(
    () => filteredRecs.filter((row) => row.shown).length,
    [filteredRecs],
  );

  const liveAvoid = useMemo(
    () => thingsToAvoid.filter((row) => row.shown).length,
    [thingsToAvoid],
  );

  const sortedAvoid = useMemo(
    () => [...thingsToAvoid].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [thingsToAvoid],
  );

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function addStatement(category) {
    const question = String(drafts[category] || "").trim();
    if (!question) {
      onToast("Type a statement first");
      return;
    }
    const inCategory = questions.filter(
      (q) => String(q.category || "").toLowerCase() === category.toLowerCase(),
    );
    setBusy(true);
    try {
      const created = await adminCreatePrakrutiQuestion(null, {
        category,
        question,
        shown: true,
        sortOrder: inCategory.length + 1,
      });
      setQuestions((prev) => [...prev, created]);
      setDrafts((prev) => ({ ...prev, [category]: "" }));
      onToast(`${DOSHA_UI[category]?.name || category} statement added`);
    } catch (error) {
      onToast(error?.message || "Failed to add statement");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestionEdit(id) {
    const question = editDraft.trim();
    if (!question) {
      onToast("Statement is required");
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdatePrakrutiQuestion(null, id, { question });
      setQuestions((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      cancelEdit();
      onToast("Statement saved");
    } catch (error) {
      onToast(error?.message || "Failed to save statement");
    } finally {
      setBusy(false);
    }
  }

  async function toggleQuestion(item) {
    const nextShown = !item.shown;
    setBusy(true);
    setQuestions((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
          : entry,
      ),
    );
    try {
      const updated = await adminUpdatePrakrutiQuestion(null, item.id, { shown: nextShown });
      setQuestions((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)));
      onToast(nextShown ? "Statement live on client page" : "Statement hidden from client page");
    } catch (error) {
      setQuestions((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, shown: item.shown, status: item.status } : entry,
        ),
      );
      onToast(error?.message || "Failed to update visibility");
    } finally {
      setBusy(false);
    }
  }

  async function moveInCategory(item, dir) {
    const category = item.category;
    const prev = questionsRef.current;
    const group = prev
      .filter((q) => String(q.category || "").toLowerCase() === String(category || "").toLowerCase())
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = group.findIndex((entry) => entry.id === item.id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= group.length) return;

    const reordered = [...group];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    const withOrder = reordered.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    const byId = new Map(withOrder.map((entry) => [entry.id, entry]));
    const next = prev.map((entry) => byId.get(entry.id) || entry);
    setQuestions(next);
    setBusy(true);
    try {
      await Promise.all(
        withOrder.map((entry) =>
          adminUpdatePrakrutiQuestion(null, entry.id, { sortOrder: entry.sortOrder }),
        ),
      );
    } catch (error) {
      setQuestions(prev);
      onToast(error?.message || "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  async function addRecommendation() {
    const title = newRec.trim();
    if (!title) {
      onToast("Type a recommendation first");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreatePrakrutiRecommendation(null, {
        prakrutiType: newRecType,
        title,
        shown: true,
        sortOrder: recommendations.filter((r) => r.prakrutiType === newRecType).length + 1,
      });
      setRecommendations((prev) => [...prev, created]);
      setRecFilter(newRecType);
      setNewRec("");
      onToast(`Recommendation added for ${typeLabel(newRecType)}`);
    } catch (error) {
      onToast(error?.message || "Failed to add recommendation");
    } finally {
      setBusy(false);
    }
  }

  async function saveRecEdit(id) {
    const title = editDraft.trim();
    if (!title) {
      onToast("Recommendation is required");
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdatePrakrutiRecommendation(null, id, { title });
      setRecommendations((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)),
      );
      cancelEdit();
      onToast("Recommendation saved");
    } catch (error) {
      onToast(error?.message || "Failed to save recommendation");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRec(item) {
    const nextShown = !item.shown;
    setBusy(true);
    setRecommendations((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
          : entry,
      ),
    );
    try {
      const updated = await adminUpdatePrakrutiRecommendation(null, item.id, { shown: nextShown });
      setRecommendations((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)),
      );
      onToast(nextShown ? "Recommendation live" : "Recommendation hidden");
    } catch (error) {
      setRecommendations((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, shown: item.shown, status: item.status } : entry,
        ),
      );
      onToast(error?.message || "Failed to update visibility");
    } finally {
      setBusy(false);
    }
  }

  async function changeRecType(item, prakrutiType) {
    if (prakrutiType === item.prakrutiType) return;
    setBusy(true);
    setRecommendations((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, prakrutiType } : entry)),
    );
    try {
      const updated = await adminUpdatePrakrutiRecommendation(null, item.id, { prakrutiType });
      setRecommendations((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)),
      );
      onToast("Prakriti type updated");
    } catch (error) {
      setRecommendations((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, prakrutiType: item.prakrutiType } : entry,
        ),
      );
      onToast(error?.message || "Failed to update type");
    } finally {
      setBusy(false);
    }
  }

  async function moveRec(item, dir) {
    const prev = recRef.current;
    const group = prev
      .filter((row) => row.prakrutiType === item.prakrutiType)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = group.findIndex((entry) => entry.id === item.id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= group.length) return;
    const reordered = [...group];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    const withOrder = reordered.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    const byId = new Map(withOrder.map((entry) => [entry.id, entry]));
    const next = prev.map((entry) => byId.get(entry.id) || entry);
    setRecommendations(next);
    setBusy(true);
    try {
      await Promise.all(
        withOrder.map((entry) =>
          adminUpdatePrakrutiRecommendation(null, entry.id, { sortOrder: entry.sortOrder }),
        ),
      );
    } catch (error) {
      setRecommendations(prev);
      onToast(error?.message || "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  async function addAvoid() {
    const title = newAvoid.trim();
    if (!title) {
      onToast("Type an item first");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreatePrakrutiThingToAvoid(null, {
        title,
        shown: true,
        sortOrder: thingsToAvoid.length + 1,
      });
      setThingsToAvoid((prev) => [...prev, created]);
      setNewAvoid("");
      onToast("Thing to avoid added");
    } catch (error) {
      onToast(error?.message || "Failed to add item");
    } finally {
      setBusy(false);
    }
  }

  async function saveAvoidEdit(id) {
    const title = editDraft.trim();
    if (!title) {
      onToast("Item is required");
      return;
    }
    setBusy(true);
    try {
      const updated = await adminUpdatePrakrutiThingToAvoid(null, id, { title });
      setThingsToAvoid((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      cancelEdit();
      onToast("Item saved");
    } catch (error) {
      onToast(error?.message || "Failed to save item");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvoid(item) {
    const nextShown = !item.shown;
    setBusy(true);
    setThingsToAvoid((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, shown: nextShown, status: nextShown ? "active" : "inactive" }
          : entry,
      ),
    );
    try {
      const updated = await adminUpdatePrakrutiThingToAvoid(null, item.id, { shown: nextShown });
      setThingsToAvoid((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)),
      );
      onToast(nextShown ? "Item live" : "Item hidden");
    } catch (error) {
      setThingsToAvoid((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, shown: item.shown, status: item.status } : entry,
        ),
      );
      onToast(error?.message || "Failed to update visibility");
    } finally {
      setBusy(false);
    }
  }

  async function moveAvoid(item, dir) {
    const prev = avoidRef.current;
    const group = [...prev].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = group.findIndex((entry) => entry.id === item.id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= group.length) return;
    const reordered = [...group];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    const next = reordered.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    setThingsToAvoid(next);
    setBusy(true);
    try {
      await Promise.all(
        next.map((entry) =>
          adminUpdatePrakrutiThingToAvoid(null, entry.id, { sortOrder: entry.sortOrder }),
        ),
      );
    } catch (error) {
      setThingsToAvoid(prev);
      onToast(error?.message || "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    if (editingId === item.id) cancelEdit();
    setBusy(true);
    setPendingDelete(null);
    try {
      if (item.kind === "question") {
        const previous = questionsRef.current;
        setQuestions((prev) => prev.filter((entry) => entry.id !== item.id));
        try {
          await adminDeletePrakrutiQuestion(null, item.id);
          onToast("Statement removed");
        } catch (error) {
          setQuestions(previous);
          throw error;
        }
      } else if (item.kind === "avoid") {
        const previous = avoidRef.current;
        setThingsToAvoid((prev) => prev.filter((entry) => entry.id !== item.id));
        try {
          await adminDeletePrakrutiThingToAvoid(null, item.id);
          onToast("Item removed");
        } catch (error) {
          setThingsToAvoid(previous);
          throw error;
        }
      } else {
        const previous = recRef.current;
        setRecommendations((prev) => prev.filter((entry) => entry.id !== item.id));
        try {
          await adminDeletePrakrutiRecommendation(null, item.id);
          onToast("Recommendation removed");
        } catch (error) {
          setRecommendations(previous);
          throw error;
        }
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Prakriti statements"
        subtitle={
          loading
            ? "Loading catalog…"
            : "Vāta · Pitta · Kapha checklist for the client LAUNCH · Prakriti tab. Scores come from these ticks."
        }
        actions={
          <span className="ua-cfg-mq__count">
            {liveTotal} of {questions.length} live
          </span>
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching Vāta · Pitta · Kapha statements…</p>
        ) : (
          <div className="ua-cfg-prakriti-grid">
            {columns.map((col) => (
              <div
                key={col.value}
                className={`ua-cfg-prakriti-col ua-cfg-prakriti-col--${col.tone}`}
              >
                <div className="ua-cfg-prakriti-col__head">
                  <span className="ua-cfg-prakriti-col__letter">{col.letter}</span>
                  <div className="ua-cfg-prakriti-col__meta">
                    <strong>{col.name}</strong>
                    <span>{col.sub}</span>
                  </div>
                  <span className="ua-cfg-prakriti-col__score">
                    <strong>{col.live}</strong>
                    <span>/ {col.max}</span>
                  </span>
                </div>

                <div className="ua-cfg-prakriti-col__add">
                  <input
                    type="text"
                    className="ua-cfg-mq-add__input"
                    placeholder={`Add ${col.name} statement…`}
                    value={drafts[col.value]}
                    disabled={busy}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [col.value]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addStatement(col.value);
                    }}
                  />
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--sm"
                    style={{
                      border: 0,
                      color: "#fff",
                      background: "rgb(94, 106, 210)",
                      whiteSpace: "nowrap",
                    }}
                    disabled={busy}
                    onClick={() => addStatement(col.value)}
                  >
                    + Add
                  </button>
                </div>

                <div className="ua-cfg-prakriti-col__list">
                  {!col.rows.length ? (
                    <p className="ua-cfg-mq-empty">No {col.name} statements yet.</p>
                  ) : null}
                  {col.rows.map((item, index) => {
                    const isEditing = editingId === item.id;
                    return (
                      <article
                        key={item.id}
                        className={`ua-cfg-prakriti-col__row${item.shown ? "" : " is-hidden"}${isEditing ? " is-editing" : ""}`}
                      >
                        <span className="ua-cfg-prakriti-col__num">{index + 1}</span>
                        {isEditing ? (
                          <input
                            type="text"
                            className="ua-cfg-mq-row__input"
                            value={editDraft}
                            autoFocus
                            disabled={busy}
                            onChange={(event) => setEditDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveQuestionEdit(item.id);
                              if (event.key === "Escape") cancelEdit();
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="ua-cfg-prakriti-col__text"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditDraft(item.question);
                            }}
                          >
                            {item.question}
                          </button>
                        )}
                        <div className="ua-cfg-prakriti-col__actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={() => saveQuestionEdit(item.id)}
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
                                className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
                                aria-pressed={item.shown}
                                aria-label={`Toggle ${item.question}`}
                                disabled={busy}
                                title={item.shown ? "Live on client page" : "Hidden"}
                                onClick={() => toggleQuestion(item)}
                              >
                                <span className="ua-toggle__knob" />
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-icon-btn"
                                aria-label="Move up"
                                disabled={busy || index === 0}
                                onClick={() => moveInCategory(item, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-icon-btn"
                                aria-label="Move down"
                                disabled={busy || index === col.rows.length - 1}
                                onClick={() => moveInCategory(item, 1)}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                                aria-label="Delete"
                                disabled={busy}
                                onClick={() =>
                                  setPendingDelete({
                                    kind: "question",
                                    id: item.id,
                                    label: item.question,
                                  })
                                }
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="ua-cfg-prakriti-guide-grid">
        <section className="ua-cfg-prakriti-guide ua-cfg-prakriti-guide--rec">
          <div className="ua-cfg-prakriti-guide__head">
            <div>
              <strong>Recommendations</strong>
              <span>Diet &amp; lifestyle guidance by Prakṛti type — shown on the client tab after scoring.</span>
            </div>
            <span className="ua-cfg-prakriti-guide__tag">For {typeLabel(recFilter)}</span>
          </div>

          <div className="ua-cfg-prakriti-guide__toolbar">
            <CfgSelect
              className="ua-cfg-mq-row__type"
              ariaLabel="Filter recommendations by type"
              value={recFilter}
              disabled={busy || loading}
              options={PRAKRUTI_TYPE_OPTIONS}
              onChange={(value) => {
                setRecFilter(value);
                setNewRecType(value);
                cancelEdit();
              }}
            />
            <span className="ua-cfg-mq__count">
              {liveRecForType} of {filteredRecs.length} live
            </span>
          </div>

          <div className="ua-cfg-prakriti-guide__add">
            <CfgSelect
              className="ua-cfg-mq-row__type"
              ariaLabel="Prakriti type for new recommendation"
              value={newRecType}
              disabled={busy || loading}
              options={PRAKRUTI_TYPE_OPTIONS}
              onChange={setNewRecType}
            />
            <input
              type="text"
              className="ua-cfg-mq-add__input"
              placeholder="Add recommendation…"
              value={newRec}
              disabled={busy || loading}
              onChange={(event) => setNewRec(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addRecommendation();
              }}
            />
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--sm"
              style={{ border: 0, color: "#fff", background: "#2f8b53", whiteSpace: "nowrap" }}
              disabled={busy || loading}
              onClick={addRecommendation}
            >
              + Add
            </button>
          </div>

          <div className="ua-cfg-prakriti-guide__list">
            {loading ? (
              <p className="ua-cfg-mq-empty">Loading recommendations…</p>
            ) : !filteredRecs.length ? (
              <p className="ua-cfg-mq-empty">No recommendations for {typeLabel(recFilter)} yet.</p>
            ) : (
              filteredRecs.map((item, index) => {
                const isEditing = editingId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`ua-cfg-prakriti-guide__item${item.shown ? "" : " is-hidden"}`}
                  >
                    <span className="ua-cfg-prakriti-guide__bullet ua-cfg-prakriti-guide__bullet--rec" />
                    {isEditing ? (
                      <input
                        type="text"
                        className="ua-cfg-mq-row__input"
                        value={editDraft}
                        autoFocus
                        disabled={busy}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRecEdit(item.id);
                          if (event.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="ua-cfg-prakriti-guide__text"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(item.id);
                          setEditDraft(item.title);
                        }}
                      >
                        {item.title}
                      </button>
                    )}
                    <div className="ua-cfg-prakriti-guide__actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => saveRecEdit(item.id)}
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
                          <CfgSelect
                            className="ua-cfg-mq-row__type"
                            value={item.prakrutiType}
                            disabled={busy}
                            ariaLabel={`Type for ${item.title}`}
                            options={PRAKRUTI_TYPE_OPTIONS}
                            onChange={(prakrutiType) => changeRecType(item, prakrutiType)}
                          />
                          <button
                            type="button"
                            className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
                            aria-pressed={item.shown}
                            disabled={busy}
                            onClick={() => toggleRec(item)}
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Move up"
                            disabled={busy || index === 0}
                            onClick={() => moveRec(item, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Move down"
                            disabled={busy || index === filteredRecs.length - 1}
                            onClick={() => moveRec(item, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                            aria-label="Delete"
                            disabled={busy}
                            onClick={() =>
                              setPendingDelete({ kind: "rec", id: item.id, label: item.title })
                            }
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="ua-cfg-prakriti-guide ua-cfg-prakriti-guide--avoid">
          <div className="ua-cfg-prakriti-guide__head">
            <div>
              <strong>Things to avoid</strong>
              <span>Foods &amp; habits that aggravate Prakṛti — default list on the client tab.</span>
            </div>
            <span className="ua-cfg-mq__count">
              {liveAvoid} of {thingsToAvoid.length} live
            </span>
          </div>

          <div className="ua-cfg-prakriti-guide__add">
            <input
              type="text"
              className="ua-cfg-mq-add__input"
              placeholder="Add thing to avoid…"
              value={newAvoid}
              disabled={busy || loading}
              onChange={(event) => setNewAvoid(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addAvoid();
              }}
            />
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--sm"
              style={{ border: 0, color: "#fff", background: "#c2661d", whiteSpace: "nowrap" }}
              disabled={busy || loading}
              onClick={addAvoid}
            >
              + Add
            </button>
          </div>

          <div className="ua-cfg-prakriti-guide__list">
            {loading ? (
              <p className="ua-cfg-mq-empty">Loading items…</p>
            ) : !sortedAvoid.length ? (
              <p className="ua-cfg-mq-empty">No things-to-avoid items yet.</p>
            ) : (
              sortedAvoid.map((item, index) => {
                const isEditing = editingId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`ua-cfg-prakriti-guide__item${item.shown ? "" : " is-hidden"}`}
                  >
                    <span className="ua-cfg-prakriti-guide__bullet ua-cfg-prakriti-guide__bullet--avoid" />
                    {isEditing ? (
                      <input
                        type="text"
                        className="ua-cfg-mq-row__input"
                        value={editDraft}
                        autoFocus
                        disabled={busy}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveAvoidEdit(item.id);
                          if (event.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="ua-cfg-prakriti-guide__text"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(item.id);
                          setEditDraft(item.title);
                        }}
                      >
                        {item.title}
                      </button>
                    )}
                    <div className="ua-cfg-prakriti-guide__actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => saveAvoidEdit(item.id)}
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
                            className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
                            aria-pressed={item.shown}
                            disabled={busy}
                            onClick={() => toggleAvoid(item)}
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Move up"
                            disabled={busy || index === 0}
                            onClick={() => moveAvoid(item, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Move down"
                            disabled={busy || index === sortedAvoid.length - 1}
                            onClick={() => moveAvoid(item, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                            aria-label="Delete"
                            disabled={busy}
                            onClick={() =>
                              setPendingDelete({ kind: "avoid", id: item.id, label: item.title })
                            }
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove from catalog?"
        body={
          pendingDelete
            ? `Delete “${pendingDelete.label}”? It will no longer appear on the client Prakriti tab.`
            : ""
        }
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
