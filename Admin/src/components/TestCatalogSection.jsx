import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CfgSelect } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import {
  adminDeleteTestCatalog,
  adminListTestGoals,
  adminSaveTestGoal,
  fetchTestCategories,
} from "../api/testCatalogApi.js";

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function goalCounts(sections) {
  const tests = (sections || []).reduce((sum, section) => sum + (section.tests || []).length, 0);
  const selected = (sections || []).reduce(
    (sum, section) => sum + (section.tests || []).filter((test) => test.selected).length,
    0,
  );
  return { sections: (sections || []).length, tests, selected };
}

function emptyTest() {
  return { id: newId(), name: "", code: "FBS", hours: 12, selected: true };
}

function mergeSections(saved, dismissed, master) {
  const hidden = new Set((dismissed || []).map((name) => String(name || "").trim().toLowerCase()).filter(Boolean));
  const seen = new Set();
  const sections = [];

  (saved || []).forEach((section) => {
    const category = String(section?.category || "").trim();
    const key = category.toLowerCase();
    if (!category || hidden.has(key) || seen.has(key)) return;
    seen.add(key);
    sections.push({
      id: section.id || newId(),
      category,
      tests: (section.tests || []).map((test) => ({
        id: test.id || newId(),
        name: test.name || "",
        code: test.code || "FBS",
        hours: Number.isFinite(Number(test.hours)) ? Number(test.hours) : 12,
        selected: test.selected !== false,
      })),
    });
  });

  (master || []).forEach((category) => {
    const name = String(category || "").trim();
    const key = name.toLowerCase();
    if (!name || hidden.has(key) || seen.has(key)) return;
    seen.add(key);
    sections.push({ id: newId(), category: name, tests: [] });
  });

  return sections;
}

function prepareGoal(draft) {
  const name = String(draft.name || "").trim();
  if (name.length < 2) return { error: "Goal name must be at least 2 characters" };

  const sections = [];
  for (const section of draft.sections || []) {
    const tests = [];
    for (const test of section.tests || []) {
      const testName = String(test.name || "").trim();
      if (!testName) continue;
      if (testName.length < 2) return { error: `Test names need at least 2 characters (${section.category})` };
      tests.push({
        id: test.id,
        name: testName,
        code: String(test.code || "").trim(),
        hours: Math.max(0, Math.min(168, Math.round(Number(test.hours) || 0))),
        selected: test.selected !== false,
      });
    }
    sections.push({ id: section.id, category: section.category, tests });
  }

  return {
    payload: {
      id: draft.id || undefined,
      name,
      status: draft.status === "inactive" ? "inactive" : "active",
      sections,
      dismissedCategories: draft.dismissedCategories || [],
    },
  };
}

function snapshotOf(draft) {
  return JSON.stringify({
    name: String(draft?.name || "").trim(),
    status: draft?.status === "inactive" ? "inactive" : "active",
    sections: draft?.sections || [],
    dismissed: draft?.dismissedCategories || [],
  });
}

function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="4" cy="3" r="1.15" fill="currentColor" />
      <circle cx="10" cy="3" r="1.15" fill="currentColor" />
      <circle cx="4" cy="7" r="1.15" fill="currentColor" />
      <circle cx="10" cy="7" r="1.15" fill="currentColor" />
      <circle cx="4" cy="11" r="1.15" fill="currentColor" />
      <circle cx="10" cy="11" r="1.15" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

function CodeField({ value, disabled, onChange }) {
  return (
    <input
      className="ua-cfg-goals-field ua-cfg-goals-field--code"
      value={value}
      disabled={disabled}
      placeholder="Code"
      aria-label="Code"
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      onBlur={() => {
        if (!String(value || "").trim()) onChange("FBS");
      }}
    />
  );
}

export function TestCatalogSection({ setTests, onToast }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [masterCategories, setMasterCategories] = useState([]);
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(false);
  const [drag, setDrag] = useState(null);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminListTestGoals(null);
      const next = rows || [];
      setGoals(next);
      setTests(next);
    } catch (error) {
      onToast(error?.message || "Failed to load goals");
      setGoals([]);
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setTests]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    let cancelled = false;
    fetchTestCategories()
      .then((labels) => {
        if (!cancelled && labels.length) setMasterCategories(labels);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const draftRef = useRef(draft);
  const snapshotRef = useRef(savedSnapshot);
  draftRef.current = draft;
  snapshotRef.current = savedSnapshot;

  useEffect(() => {
    if (mode !== "edit" || !masterCategories.length) return;
    const current = draftRef.current;
    if (!current) return;
    const merged = mergeSections(current.sections, current.dismissedCategories, masterCategories);
    const same = merged.length === current.sections.length
      && merged.every((section, index) => (
        section.id === current.sections[index]?.id && section.category === current.sections[index]?.category
      ));
    if (same) return;
    const next = { ...current, sections: merged };
    if (snapshotRef.current === snapshotOf(current)) setSavedSnapshot(snapshotOf(next));
    setDraft(next);
  }, [masterCategories, mode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return goals;
    return goals.filter((goal) => goal.name.toLowerCase().includes(query));
  }, [goals, search]);

  const counts = goalCounts(draft?.sections);
  const unusedCategories = useMemo(() => {
    const used = new Set((draft?.sections || []).map((section) => section.category.toLowerCase()));
    return masterCategories.filter((category) => !used.has(String(category).trim().toLowerCase()));
  }, [draft, masterCategories]);

  const dirty = mode === "edit" && draft ? snapshotOf(draft) !== savedSnapshot : false;

  function openNew() {
    const sections = mergeSections([], [], masterCategories);
    const next = { id: null, name: "", status: "active", sections, dismissedCategories: [] };
    setDraft(next);
    setSavedSnapshot(snapshotOf(next));
    setMode("edit");
  }

  function openEdit(goal) {
    const next = {
      id: goal.id,
      name: goal.name,
      status: goal.status,
      sections: mergeSections(goal.sections, goal.dismissedCategories, masterCategories),
      dismissedCategories: [...(goal.dismissedCategories || [])],
    };
    setDraft(next);
    setSavedSnapshot(snapshotOf(next));
    setMode("edit");
  }

  function leaveEditor() {
    if (dirty && !window.confirm("Leave without saving this goal?")) return;
    setMode("list");
    setDraft(null);
  }

  function updateSectionTests(sectionId, tests) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, tests } : section)),
    }));
  }

  function addTest(sectionId) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (
        section.id === sectionId ? { ...section, tests: [...section.tests, emptyTest()] } : section
      )),
    }));
  }

  function addCategory(category) {
    if (!category) return;
    setDraft((current) => ({
      ...current,
      dismissedCategories: (current.dismissedCategories || []).filter(
        (name) => name.toLowerCase() !== category.toLowerCase(),
      ),
      sections: [...current.sections, { id: newId(), category, tests: [] }],
    }));
  }

  function removeSection(section) {
    if (!section || busy) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((entry) => entry.id !== section.id),
      dismissedCategories: [...new Set([...(current.dismissedCategories || []), section.category])],
    }));
    onToast(`${section.category} removed from this goal. It is still in the admin master.`);
  }

  async function saveGoal() {
    if (!draft || busy) return;
    const { error, payload } = prepareGoal(draft);
    if (error) {
      onToast(error);
      return;
    }
    setBusy(true);
    try {
      const saved = await adminSaveTestGoal(null, payload);
      if (!saved) throw new Error("Failed to save goal");
      setMode("list");
      setDraft(null);
      setSearch("");
      onToast(`${saved.name} saved`);
      await loadGoals();
    } catch (error) {
      onToast(error?.message || "Failed to save goal");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteGoal() {
    if (!draft?.id || busy) return;
    const id = draft.id;
    setPendingDeleteGoal(false);
    setBusy(true);
    try {
      await adminDeleteTestCatalog(null, id);
      const list = goals.filter((goal) => goal.id !== id);
      setGoals(list);
      setTests(list);
      setMode("list");
      setDraft(null);
      onToast("Goal removed");
    } catch (error) {
      onToast(error?.message || "Failed to delete goal");
    } finally {
      setBusy(false);
    }
  }

  function onSectionDrop(index) {
    if (!drag || drag.type !== "section") return;
    setDraft((current) => ({ ...current, sections: moveItem(current.sections, drag.index, index) }));
    setDrag(null);
  }

  function onTestDrop(sectionId, index) {
    if (!drag || drag.type !== "test" || drag.sectionId !== sectionId) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (
        section.id === sectionId ? { ...section, tests: moveItem(section.tests, drag.index, index) } : section
      )),
    }));
    setDrag(null);
  }

  return (
    <div className="ua-cfg-goals">
      {mode === "list" ? (
        <>
          <header className="ua-cfg-goals__head">
            <div>
              <h1 className="ua-cfg-goals__title">Goals &amp; Tests</h1>
              <p className="ua-cfg-goals__sub">Each goal has its own set of test sections, with fasting or prep time per test.</p>
            </div>
            <button type="button" className="ua-cfg-goals__new" disabled={loading} onClick={openNew}>
              + New goal
            </button>
          </header>

          <section className="ua-cfg-goals-card">
            <div className="ua-cfg-goals-card__search">
              <input
                type="search"
                className="ua-cfg-goals-field"
                placeholder="Search goals"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="ua-cfg-goals-table-wrap">
              <table className="ua-cfg-goals-table">
                <thead>
                  <tr>
                    <th>Goal</th>
                    <th>Sections</th>
                    <th>Tests</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="ua-cfg-goals-table__empty">Loading goals…</td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map((goal) => {
                      const rowCounts = goalCounts(goal.sections);
                      const active = goal.status !== "inactive";
                      return (
                        <tr key={goal.id}>
                          <td className="ua-cfg-goals-table__goal">{goal.name}</td>
                          <td>{rowCounts.sections}</td>
                          <td>{rowCounts.tests}</td>
                          <td>
                            <span className={`ua-cfg-goals-status${active ? "" : " is-inactive"}`}>
                              {active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="ua-cfg-goals-edit" onClick={() => openEdit(goal)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="ua-cfg-goals-table__empty">
                        {goals.length ? "No goals match that search." : "No goals yet. Create one to attach tests from the admin categories."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : draft ? (
        <>
          <p className="ua-cfg-goals-crumb-row">
            <button type="button" className="ua-cfg-goals-crumb" onClick={leaveEditor}>
              Goals &amp; Tests
            </button>
            <span className="ua-cfg-goals-crumb__sep">/</span>
            <span className="ua-cfg-goals-crumb__current">{draft.name.trim() || "New goal"}</span>
          </p>

          <header className="ua-cfg-goals__head ua-cfg-goals__head--edit">
            <div>
              <h1 className="ua-cfg-goals__title">{draft.id ? "Edit goal" : "New goal"}</h1>
              <p className="ua-cfg-goals__sub">Choose which tests belong to this goal and how long the user should prepare before each one.</p>
            </div>
          </header>

          <section className="ua-cfg-goals-card ua-cfg-goals-meta">
            <label className="ua-cfg-goals-meta__name">
              <span>Goal name</span>
              <input
                className="ua-cfg-goals-field"
                value={draft.name}
                disabled={busy}
                placeholder="Fat loss"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <div className="ua-cfg-goals-meta__side">
              <button
                type="button"
                className={`ua-toggle${draft.status !== "inactive" ? " ua-toggle--on" : ""}`}
                aria-pressed={draft.status !== "inactive"}
                aria-label="Active"
                disabled={busy}
                onClick={() => setDraft((current) => ({
                  ...current,
                  status: current.status === "inactive" ? "active" : "inactive",
                }))}
              >
                <span className="ua-toggle__knob" />
              </button>
              <span className="ua-cfg-goals-meta__active">{draft.status === "inactive" ? "Inactive" : "Active"}</span>
              <span className="ua-cfg-goals-meta__counts">
                {plural(counts.sections, "section")} · {plural(counts.tests, "test")} · {counts.selected} selected
              </span>
              <button type="button" className="ua-cfg-goals__new" disabled={busy} onClick={saveGoal}>
                {busy ? "Saving…" : "Save goal"}
              </button>
            </div>
          </section>

          {!masterCategories.length && !draft.sections.length ? (
            <p className="ua-cfg-goals__hint">
              Categories come from Configs → Dropdowns → Blood test categories. Add some there, then they show up here as sections.
            </p>
          ) : null}

          {draft.sections.map((section, sectionIndex) => (
            <section
              key={section.id}
              className={`ua-cfg-goals-section${drag?.type === "section" && drag.index === sectionIndex ? " is-dragging" : ""}`}
              onDragOver={(event) => {
                if (drag?.type === "section") event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                onSectionDrop(sectionIndex);
              }}
            >
              <div className="ua-cfg-goals-section__head">
                <span
                  className="ua-cfg-goals-grip"
                  draggable={!busy}
                  aria-hidden="true"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", section.id);
                    setDrag({ type: "section", index: sectionIndex });
                  }}
                  onDragEnd={() => setDrag(null)}
                >
                  <GripIcon />
                </span>
                <span className="ua-cfg-goals-section__name">{section.category}</span>
                <span className="ua-cfg-goals-section__count">{plural(section.tests.length, "test")}</span>
                <button
                  type="button"
                  className="ua-cfg-goals-icon"
                  aria-label={`Remove ${section.category}`}
                  disabled={busy}
                  onClick={() => removeSection(section)}
                >
                  <TrashIcon />
                </button>
              </div>

              <div className="ua-cfg-goals-lines">
                <div className="ua-cfg-goals-lines__head" aria-hidden="true">
                  <span />
                  <span />
                  <span>Test</span>
                  <span>BM/PM</span>
                  <span>Duration</span>
                  <span />
                </div>
                {section.tests.map((test, testIndex) => (
                  <div
                    key={test.id}
                    className="ua-cfg-goals-lines__row"
                    onDragOver={(event) => {
                      if (drag?.type === "test" && drag.sectionId === section.id) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onTestDrop(section.id, testIndex);
                    }}
                  >
                    <span
                      className="ua-cfg-goals-grip"
                      draggable={!busy}
                      aria-hidden="true"
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", test.id);
                        setDrag({ type: "test", sectionId: section.id, index: testIndex });
                      }}
                      onDragEnd={() => setDrag(null)}
                    >
                      <GripIcon />
                    </span>
                    <input
                      type="checkbox"
                      className="ua-cfg-goals-check"
                      checked={test.selected}
                      disabled={busy}
                      aria-label={`Include ${test.name || "test"}`}
                      onChange={(event) => {
                        const selected = event.target.checked;
                        updateSectionTests(section.id, section.tests.map((row) => (
                          row.id === test.id ? { ...row, selected } : row
                        )));
                      }}
                    />
                    <input
                      className="ua-cfg-goals-field"
                      value={test.name}
                      disabled={busy}
                      placeholder="Test name"
                      aria-label="Test name"
                      onChange={(event) => {
                        const name = event.target.value;
                        updateSectionTests(section.id, section.tests.map((row) => (
                          row.id === test.id ? { ...row, name } : row
                        )));
                      }}
                    />
                    <CodeField
                      value={test.code}
                      disabled={busy}
                      onChange={(code) => {
                        updateSectionTests(section.id, section.tests.map((row) => (
                          row.id === test.id ? { ...row, code } : row
                        )));
                      }}
                    />
                    <label className="ua-cfg-goals-hours">
                      <input
                        type="number"
                        min="0"
                        max="168"
                        className="ua-cfg-goals-field ua-cfg-goals-field--hours"
                        value={test.hours}
                        disabled={busy}
                        aria-label="Fasting or prep hours"
                        onChange={(event) => {
                          const hours = event.target.value === "" ? "" : Number(event.target.value);
                          updateSectionTests(section.id, section.tests.map((row) => (
                            row.id === test.id ? { ...row, hours } : row
                          )));
                        }}
                      />
                      <span>hrs</span>
                    </label>
                    <button
                      type="button"
                      className="ua-cfg-goals-icon"
                      aria-label="Remove test"
                      disabled={busy}
                      onClick={() => updateSectionTests(section.id, section.tests.filter((row) => row.id !== test.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="ua-cfg-goals-add" disabled={busy} onClick={() => addTest(section.id)}>
                + Add test
              </button>
            </section>
          ))}

          {unusedCategories.length ? (
            <label className="ua-cfg-goals-add-cat">
              <span>Add a category from the admin master</span>
              <CfgSelect
                className="ua-cfg-goals-select ua-cfg-goals-select--add"
                options={unusedCategories.map((category) => ({ value: category, label: category }))}
                value=""
                disabled={busy}
                ariaLabel="Add category"
                placeholder="Add category"
                onChange={addCategory}
              />
            </label>
          ) : null}

          {draft.id ? (
            <div className="ua-cfg-goals-footer">
              <button type="button" className="ua-cfg-goals-delete" disabled={busy} onClick={() => setPendingDeleteGoal(true)}>
                Delete goal
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteGoal}
        tag="Delete goal"
        title={draft?.name ? `Delete “${draft.name.trim()}”?` : "Delete this goal?"}
        body="This removes the goal and the tests saved on it."
        cancelLabel="Keep goal"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDeleteGoal(false)}
        onConfirm={confirmDeleteGoal}
      />
    </div>
  );
}
