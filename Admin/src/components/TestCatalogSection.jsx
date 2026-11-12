import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CfgSelect } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import {
  adminDeleteTestCatalog,
  adminGetCatalogMaster,
  adminListTestGoals,
  adminSaveCatalogMaster,
  adminSaveTestGoal,
  CATALOG_MASTER_NAME,
  fetchTestCategories,
} from "../api/testCatalogApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import "./testCatalogConfig.css";

function goalInitial(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function CatalogHeroIcon() {
  return (
    <svg className="ua-tc-hero__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6v2.2c0 .5.2 1 .6 1.3l2.4 2.1c.5.4.8 1 .8 1.6V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9.8c0-.6.3-1.2.8-1.6l2.4-2.1c.4-.3.6-.8.6-1.3V3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 11h4M10 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="ua-tc-search__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 12.5 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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
  return { id: newId(), name: "", code: "", hours: 12, selected: true };
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
        code: test.code || "",
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

function cloneTestsFromMaster(tests) {
  return (tests || []).map((test) => ({
    id: newId(),
    name: test.name || "",
    code: test.code || "",
    hours: Number.isFinite(Number(test.hours)) ? Number(test.hours) : 12,
    selected: test.selected !== false,
  }));
}

function seedSectionsFromMaster(masterSections, dismissed, masterCategories) {
  const base = mergeSections([], dismissed, masterCategories);
  const byCategory = new Map(
    (masterSections || []).map((section) => [
      String(section?.category || "").trim().toLowerCase(),
      section,
    ]),
  );
  return base.map((section) => {
    const masterSection = byCategory.get(section.category.toLowerCase());
    if (!masterSection?.tests?.length) return section;
    return { ...section, tests: cloneTestsFromMaster(masterSection.tests) };
  });
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

function SortButtons({ label, disabled, isFirst, isLast, onMove }) {
  return (
    <div className="ua-cfg-goals-sort">
      <button
        type="button"
        aria-label={`Move ${label} up`}
        title="Move up"
        disabled={disabled || isFirst}
        onClick={() => onMove(-1)}
      >
        <svg viewBox="0 0 12 8" aria-hidden="true">
          <path d="M2 6.5 6 2l4 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        title="Move down"
        disabled={disabled || isLast}
        onClick={() => onMove(1)}
      >
        <svg viewBox="0 0 12 8" aria-hidden="true">
          <path d="M2 1.5 6 6l4-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
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
    />
  );
}

export function TestCatalogSection({ setTests, onToast }) {
  const { isAdminView, can } = useViewAs();
  const canEditCatalogMaster = Boolean(isAdminView) && can("console.cf.edit");

  const [goals, setGoals] = useState([]);
  const [catalogMaster, setCatalogMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [masterCategories, setMasterCategories] = useState([]);
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());

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
    if (!canEditCatalogMaster) return undefined;
    let cancelled = false;
    adminGetCatalogMaster(null)
      .then((row) => {
        if (!cancelled && row) setCatalogMaster(row);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canEditCatalogMaster]);

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
    if ((mode !== "edit" && mode !== "master") || !masterCategories.length) return;
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

  const listStats = useMemo(() => {
    const activeGoals = goals.filter((goal) => goal.status !== "inactive").length;
    let sectionTotal = 0;
    let testTotal = 0;
    goals.forEach((goal) => {
      const rowCounts = goalCounts(goal.sections);
      sectionTotal += rowCounts.sections;
      testTotal += rowCounts.tests;
    });
    return {
      goals: goals.length,
      activeGoals,
      sections: sectionTotal,
      tests: testTotal,
    };
  }, [goals]);

  const counts = goalCounts(draft?.sections);
  const unusedCategories = useMemo(() => {
    const used = new Set((draft?.sections || []).map((section) => section.category.toLowerCase()));
    return masterCategories.filter((category) => !used.has(String(category).trim().toLowerCase()));
  }, [draft, masterCategories]);

  const isMasterMode = mode === "master";
  const dirty = (mode === "edit" || isMasterMode) && draft ? snapshotOf(draft) !== savedSnapshot : false;

  function openNew() {
    const sections = seedSectionsFromMaster(
      catalogMaster?.sections,
      catalogMaster?.dismissedCategories,
      masterCategories,
    );
    const next = { id: null, name: "", status: "active", sections, dismissedCategories: [] };
    setDraft(next);
    setSavedSnapshot(snapshotOf(next));
    setCollapsedSections(new Set());
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
    setCollapsedSections(new Set());
    setMode("edit");
  }

  function openMaster() {
    const next = {
      id: catalogMaster?.id || null,
      name: CATALOG_MASTER_NAME,
      status: "inactive",
      sections: mergeSections(
        catalogMaster?.sections || [],
        catalogMaster?.dismissedCategories || [],
        masterCategories,
      ),
      dismissedCategories: [...(catalogMaster?.dismissedCategories || [])],
    };
    setDraft(next);
    setSavedSnapshot(snapshotOf(next));
    setCollapsedSections(new Set());
    setMode("master");
  }

  function leaveEditor() {
    const noun = isMasterMode ? "master list" : "goal";
    if (dirty && !window.confirm(`Leave without saving this ${noun}?`)) return;
    setMode("list");
    setDraft(null);
  }

  function updateSectionTests(sectionId, tests) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, tests } : section)),
    }));
  }

  function toggleSection(sectionId) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function addTest(sectionId) {
    setCollapsedSections((current) => {
      if (!current.has(sectionId)) return current;
      const next = new Set(current);
      next.delete(sectionId);
      return next;
    });
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
    if (!draft || busy || isMasterMode) return;
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

  async function saveMaster() {
    if (!draft || busy || !isMasterMode) return;
    const { error, payload } = prepareGoal(draft);
    if (error) {
      onToast(error);
      return;
    }
    setBusy(true);
    try {
      const saved = await adminSaveCatalogMaster(null, {
        id: draft.id,
        sections: payload.sections,
        dismissedCategories: payload.dismissedCategories,
      });
      if (!saved) throw new Error("Failed to save master list");
      setCatalogMaster(saved);
      setSavedSnapshot(snapshotOf({ ...draft, id: saved.id }));
      setDraft((current) => (current ? { ...current, id: saved.id } : current));
      onToast("Master test list saved");
    } catch (error) {
      onToast(error?.message || "Failed to save master list");
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

  function moveSection(index, delta) {
    setDraft((current) => ({
      ...current,
      sections: moveItem(current.sections, index, index + delta),
    }));
  }

  function moveTest(sectionId, index, delta) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (
        section.id === sectionId
          ? { ...section, tests: moveItem(section.tests, index, index + delta) }
          : section
      )),
    }));
  }

  const rootClass = [
    "ua-cfg-goals",
    "ua-test-catalog",
    mode === "list" ? "is-list" : "",
    mode === "edit" ? "is-edit" : "",
    isMasterMode ? "is-master" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      {mode === "list" ? (
        <>
          <header className="ua-tc-hero">
            <div className="ua-tc-hero__copy">
              <div className="ua-tc-hero__icon-wrap" aria-hidden="true">
                <CatalogHeroIcon />
              </div>
              <div>
                <p className="ua-tc-hero__eyebrow">Heal · Blood tests</p>
                <h1 className="ua-cfg-goals__title">Goals &amp; Tests</h1>
                <p className="ua-cfg-goals__sub">
                  Each goal has its own set of test sections, with fasting or prep time per test.
                </p>
              </div>
            </div>
            <div className="ua-tc-hero__actions">
              {canEditCatalogMaster ? (
                <button
                  type="button"
                  className="ua-cfg-goals__secondary"
                  disabled={loading}
                  onClick={openMaster}
                >
                  Edit master
                </button>
              ) : null}
              <button type="button" className="ua-cfg-goals__new" disabled={loading} onClick={openNew}>
                + New goal
              </button>
            </div>
          </header>

          <div className="ua-tc-stats" aria-label="Catalog summary">
            <div className="ua-tc-stat ua-tc-stat--accent">
              <span className="ua-tc-stat__label">Goals</span>
              <span className="ua-tc-stat__value">{loading ? "—" : listStats.goals}</span>
              <span className="ua-tc-stat__hint">{loading ? "" : `${listStats.activeGoals} active`}</span>
            </div>
            <div className="ua-tc-stat">
              <span className="ua-tc-stat__label">Sections</span>
              <span className="ua-tc-stat__value">{loading ? "—" : listStats.sections}</span>
              <span className="ua-tc-stat__hint">Across all goals</span>
            </div>
            <div className="ua-tc-stat">
              <span className="ua-tc-stat__label">Tests</span>
              <span className="ua-tc-stat__value">{loading ? "—" : listStats.tests}</span>
              <span className="ua-tc-stat__hint">In catalog rows</span>
            </div>
            <div className="ua-tc-stat">
              <span className="ua-tc-stat__label">Showing</span>
              <span className="ua-tc-stat__value">{loading ? "—" : filtered.length}</span>
              <span className="ua-tc-stat__hint">
                {search.trim() ? "Matches search" : "All goals"}
              </span>
            </div>
          </div>

          <section className="ua-cfg-goals-card">
            <div className="ua-tc-toolbar">
              <div>
                <p className="ua-tc-toolbar__title">Goal directory</p>
                <p className="ua-tc-toolbar__meta">Open a goal to manage sections, codes, and prep hours.</p>
              </div>
              <div className="ua-cfg-goals-card__search">
                <label className="ua-tc-search">
                  <SearchIcon />
                  <input
                    type="search"
                    className="ua-cfg-goals-field"
                    placeholder="Search goals by name…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>
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
                          <td className="ua-cfg-goals-table__goal">
                            <div className="ua-tc-goal-cell">
                              <span className="ua-tc-goal-avatar" aria-hidden="true">{goalInitial(goal.name)}</span>
                              <span className="ua-tc-goal-name">{goal.name}</span>
                            </div>
                          </td>
                          <td><span className="ua-tc-metric">{rowCounts.sections}</span></td>
                          <td><span className="ua-tc-metric">{rowCounts.tests}</span></td>
                          <td>
                            <span className={`ua-cfg-goals-status${active ? "" : " is-inactive"}`}>
                              {active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="ua-cfg-goals-edit" onClick={() => openEdit(goal)}>
                              Edit
                              <span aria-hidden="true">→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="ua-cfg-goals-table__empty">
                        <div className="ua-tc-empty">
                          <p className="ua-tc-empty__title">
                            {goals.length ? "No matching goals" : "No goals yet"}
                          </p>
                          <p className="ua-tc-empty__sub">
                            {goals.length
                              ? "Try a different search term or clear the filter."
                              : "Create a goal to attach tests from the admin blood-test categories."}
                          </p>
                          {!goals.length ? (
                            <button type="button" className="ua-cfg-goals__new" onClick={openNew}>
                              + Create first goal
                            </button>
                          ) : null}
                        </div>
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
            <span className="ua-cfg-goals-crumb__current">
              {isMasterMode ? "Master test list" : draft.name.trim() || "New goal"}
            </span>
          </p>

          <header className="ua-cfg-goals__head ua-cfg-goals__head--edit">
            <div>
              <h1 className="ua-cfg-goals__title">
                {isMasterMode ? "Master test list" : draft.id ? "Edit goal" : "New goal"}
              </h1>
              <p className="ua-cfg-goals__sub">
                {isMasterMode
                  ? "Default tests per category. New goals start from this list; coaches never see this master."
                  : "Choose which tests belong to this goal and how long the user should prepare before each one."}
              </p>
            </div>
          </header>

          <section className="ua-cfg-goals-card ua-cfg-goals-meta">
            {!isMasterMode ? (
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
            ) : (
              <div className="ua-cfg-goals-meta__name">
                <span>Master list</span>
                <p className="ua-cfg-goals-meta__master-label">Shared template for all new goals</p>
              </div>
            )}
            <div className="ua-cfg-goals-meta__side">
              {!isMasterMode ? (
                <>
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
                </>
              ) : null}
              <span className="ua-cfg-goals-meta__counts">
                {plural(counts.sections, "section")} · {plural(counts.tests, "test")} · {counts.selected} selected
              </span>
              <button
                type="button"
                className="ua-cfg-goals__new"
                disabled={busy}
                onClick={isMasterMode ? saveMaster : saveGoal}
              >
                {busy ? "Saving…" : isMasterMode ? "Save master" : "Save goal"}
              </button>
            </div>
          </section>

          {!masterCategories.length && !draft.sections.length ? (
            <p className="ua-cfg-goals__hint">
              Categories come from Configs → Dropdowns → Blood test categories. Add some there, then they show up here as sections.
            </p>
          ) : null}

          {draft.sections.map((section, sectionIndex) => {
            const isOpen = !collapsedSections.has(section.id);
            return (
            <section key={section.id} className={`ua-cfg-goals-section${isOpen ? " is-open" : ""}`}>
              <div className="ua-cfg-goals-section__head">
                <button
                  type="button"
                  className="ua-cfg-goals-section__toggle"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Collapse ${section.category}` : `Expand ${section.category}`}
                  disabled={busy}
                  onClick={() => toggleSection(section.id)}
                >
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 4.5 6 8l3-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <SortButtons
                  label={section.category}
                  disabled={busy}
                  isFirst={sectionIndex === 0}
                  isLast={sectionIndex === draft.sections.length - 1}
                  onMove={(delta) => moveSection(sectionIndex, delta)}
                />
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

              {isOpen ? (
              <>
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
                  <div key={test.id} className="ua-cfg-goals-lines__row">
                    <SortButtons
                      label={test.name || "test"}
                      disabled={busy}
                      isFirst={testIndex === 0}
                      isLast={testIndex === section.tests.length - 1}
                      onMove={(delta) => moveTest(section.id, testIndex, delta)}
                    />
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
              </>
              ) : null}
            </section>
            );
          })}

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

          {draft.id && !isMasterMode ? (
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
