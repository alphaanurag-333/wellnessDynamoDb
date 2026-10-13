import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TEST_CATEGORIES,
  TEST_CATALOG_PAGE_SIZE,
  adminCreateTestCatalog,
  adminDeleteTestCatalog,
  adminListTestCatalog,
  adminUpdateTestCatalog,
  fetchTestCategories,
  testCategoryOptions,
} from "../api/testCatalogApi.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const FASTING_TYPE_OPTIONS = [
  { value: "Fasting", label: "Fasting" },
  { value: "Non-fasting", label: "Non-fasting" },
  { value: "Post-prandial", label: "Post-prandial" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Hidden" },
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emptyLine() {
  return { category: "", name: "", fastingType: "", duration: "" };
}

function linesFromTest(test) {
  if (Array.isArray(test?.lines) && test.lines.length) {
    return test.lines.map((line) => ({ ...emptyLine(), ...line }));
  }
  const params = Array.isArray(test?.parameters) ? test.parameters : [];
  if (params.length) {
    return params.map((param, index) => ({
      category: test.category || "",
      name: param.name || "",
      fastingType: index === 0 ? test.fastingType || "" : "",
      duration: index === 0 ? test.duration || "" : "",
    }));
  }
  return [{ ...emptyLine(), category: test?.category || "", name: test?.name || "" }];
}

function trimLine(line) {
  return {
    category: String(line.category || "").trim(),
    name: String(line.name || "").trim(),
    fastingType: String(line.fastingType || "").trim(),
    duration: String(line.duration || "").trim(),
  };
}

function isBlankLine(line) {
  return !line.category && !line.name && !line.fastingType && !line.duration;
}

function isCompleteLine(line) {
  return Boolean(line.category && line.name && line.fastingType && line.duration);
}

/** Returns `{ error }` or `{ payload }` ready for the catalog API. */
function buildTestPayload(title, rawLines) {
  const name = String(title || "").trim();
  if (!name) return { error: "Title is required" };
  const lines = rawLines.map(trimLine).filter((line) => !isBlankLine(line));
  if (!lines.length) return { error: "Add at least one test line" };
  if (lines.some((line) => !isCompleteLine(line))) {
    return { error: "Each test line needs category, test name, fasting type, and duration" };
  }

  const usedIds = new Set();
  const parameters = lines.map((line, index) => {
    const base = slugify(line.name) || `param-${index + 1}`;
    let paramId = base;
    let suffix = 2;
    while (usedIds.has(paramId)) paramId = `${base}-${suffix++}`;
    usedIds.add(paramId);
    return { paramId, name: line.name, unit: "—", refRange: "—", sequence: index + 1 };
  });

  const [first] = lines;
  return {
    payload: {
      name,
      category: first.category,
      fastingType: first.fastingType,
      duration: first.duration,
      type: lines.length > 1 ? "PROFILE" : "SINGLE",
      lines,
      parameters,
    },
  };
}

function TestLinesEditor({ title, lines, categories, extras = [], disabled, onTitleChange, onLinesChange }) {
  function updateLine(index, patch) {
    onLinesChange(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  return (
    <div className="ua-cfg-tc-lines">
      <label className="ua-cfg-tc-lines__title">
        <span>Title</span>
        <input
          type="text"
          className="ua-cfg-tc-field"
          placeholder="Glucose Test"
          value={title}
          disabled={disabled}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>

      <div className="ua-cfg-tc-lines__labels" aria-hidden="true">
        <span>Select Category</span>
        <span>Test Name</span>
        <span>Fasting type</span>
        <span>Duration</span>
        <span />
      </div>

      {lines.map((line, index) => (
        <div key={`line-${index}`} className="ua-cfg-tc-lines__row">
          <CategorySelect
            value={line.category}
            extras={extras}
            categories={categories}
            allowEmpty
            emptyLabel="Select category"
            disabled={disabled}
            onChange={(category) => updateLine(index, { category })}
          />
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="e.g. HbA1c"
            aria-label="Test name"
            value={line.name}
            disabled={disabled}
            onChange={(event) => updateLine(index, { name: event.target.value })}
          />
          <CfgSelect
            className="ua-cfg-tc-select"
            options={FASTING_TYPE_OPTIONS}
            value={line.fastingType}
            disabled={disabled}
            ariaLabel="Fasting type"
            placeholder="Select fasting type"
            onChange={(fastingType) => updateLine(index, { fastingType })}
          />
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="e.g. 8–12 hours"
            aria-label="Duration"
            value={line.duration}
            disabled={disabled}
            onChange={(event) => updateLine(index, { duration: event.target.value })}
          />
          {lines.length > 1 ? (
            <button
              type="button"
              className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
              disabled={disabled}
              aria-label="Remove test line"
              onClick={() => onLinesChange(lines.filter((_, lineIndex) => lineIndex !== index))}
            >
              ×
            </button>
          ) : (
            <span className="ua-cfg-tc-lines__spacer" aria-hidden="true" />
          )}
        </div>
      ))}

      <div>
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
          disabled={disabled}
          onClick={() => onLinesChange([...lines, emptyLine()])}
        >
          + Add test
        </button>
      </div>
    </div>
  );
}

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

function CategorySelect({
  value,
  extras = [],
  categories = TEST_CATEGORIES,
  disabled,
  onChange,
  allowEmpty = false,
  emptyLabel = "Select category",
  className = "ua-cfg-tc-select",
  ariaLabel = "Category",
}) {
  const options = testCategoryOptions(extras, categories);
  const list = value && !options.includes(value) ? [value, ...options] : options;
  const selectOptions = [
    ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
    ...list.map((category) => ({ value: category, label: category })),
  ];
  return (
    <CfgSelect
      className={className}
      options={selectOptions}
      value={value}
      disabled={disabled}
      ariaLabel={ariaLabel}
      placeholder={emptyLabel}
      onChange={onChange}
    />
  );
}

function TestEditModal({ test, busy, extras = [], categories = TEST_CATEGORIES, onClose, onChange, onDelete, onToast }) {
  const [title, setTitle] = useState(test.name);
  const [lines, setLines] = useState(() => linesFromTest(test));

  useEffect(() => {
    setTitle(test.name);
    setLines(linesFromTest(test));
  }, [test]);

  async function save() {
    const { error, payload } = buildTestPayload(title, lines);
    if (error) {
      onToast?.(error);
      return false;
    }
    return onChange(payload, "Test saved");
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-dp-modal ua-cfg-tc-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-dp-modal__head">
          <div>
            <h3 className="ua-cfg-dp-modal__title">{test.name}</h3>
            <p className="ua-cfg-dp-modal__sub">Blood test · master catalog</p>
          </div>
          <div className="ua-cfg-dp-modal__actions">
            <span className="ua-cfg-dp-modal__live-label">Live</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${test.live ? " ua-toggle--on" : ""}`}
              aria-pressed={test.live}
              disabled={busy}
              onClick={() => onChange({ live: !test.live }, test.live ? "Test hidden" : "Test is live")}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-dp-modal__delete"
              disabled={busy}
              onClick={() => onDelete(test)}
            >
              Delete
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="ua-cfg-tc-modal__body">
          <TestLinesEditor
            title={title}
            lines={lines}
            categories={categories}
            extras={extras}
            disabled={busy}
            onTitleChange={setTitle}
            onLinesChange={setLines}
          />
        </div>

        <div className="ua-cfg-tc-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save test"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestCatalogSection({ tests, setTests, onToast }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: TEST_CATALOG_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const testsRef = useRef(tests);

  const [newTitle, setNewTitle] = useState("");
  const [newLines, setNewLines] = useState(() => [emptyLine()]);
  const [catalogCategories, setCatalogCategories] = useState(TEST_CATEGORIES);

  const selectedTest = tests.find((entry) => entry.id === selectedId) ?? null;
  const liveCount = tests.filter((entry) => entry.live).length;
  const categories = useMemo(
    () => [...new Set(tests.map((entry) => entry.category).filter(Boolean))].sort(),
    [tests],
  );

  const loadTests = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { tests: rows, pagination: nextPagination } = await adminListTestCatalog(null, {
        page: nextPage,
        limit: TEST_CATALOG_PAGE_SIZE,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
      });
      const next = rows || [];
      setTests(next);
      testsRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || TEST_CATALOG_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load test catalog");
      setTests([]);
      testsRef.current = [];
      setPagination({ page: 1, limit: TEST_CATALOG_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, search, setTests, statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    let cancelled = false;
    fetchTestCategories()
      .then((labels) => {
        if (!cancelled && labels.length) setCatalogCategories(labels);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    testsRef.current = tests;
  }, [tests]);

  function resetAddForm() {
    setNewTitle("");
    setNewLines([emptyLine()]);
    setShowAddForm(false);
  }

  async function persistTest(id, fields, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateTestCatalog(null, id, fields);
      if (!updated) throw new Error("Failed to save test");
      setTests((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save test");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addTest() {
    const { error, payload } = buildTestPayload(newTitle, newLines);
    if (error) {
      onToast(error);
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateTestCatalog(null, {
        ...payload,
        testId: slugify(payload.name),
        sequence: 0,
        live: true,
      });
      if (!created) throw new Error("Failed to add test");
      resetAddForm();
      onToast(`${payload.name} added to the catalog`);
      const lastPage = Math.max(1, Math.ceil((pagination.total + 1) / TEST_CATALOG_PAGE_SIZE));
      setPage(lastPage);
      await loadTests(lastPage);
    } catch (error) {
      onToast(error?.message || "Failed to add test");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const test = pendingDelete;
    setPendingDelete(null);
    if (selectedId === test.id) setSelectedId(null);
    setBusy(true);
    try {
      await adminDeleteTestCatalog(null, test.id);
      onToast("Test removed");
      const remaining = testsRef.current.filter((entry) => entry.id !== test.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadTests(nextPage);
      } else {
        await loadTests(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete test. If it is assigned to a client, deactivate it instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        className="ua-cfg-tc"
        title="Blood test catalog"
        subtitle={
          loading
            ? "Loading tests…"
            : "Admin maintains the master list. Categories come from Configs → Dropdowns."
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-dp__count">
              {liveCount} live of {pagination.total}
            </span>
          )
        }
      >
        <div className="ua-cfg-tc-filters">
          <input
            type="search"
            className="ua-cfg-tc-field"
            placeholder="Search name, slug or category"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <CategorySelect
            value={categoryFilter}
            extras={categories}
            categories={catalogCategories}
            allowEmpty
            emptyLabel="All categories"
            ariaLabel="Filter by category"
            onChange={(value) => {
              setPage(1);
              setCategoryFilter(value);
            }}
          />
          <CfgSelect
            className="ua-cfg-tc-select"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            ariaLabel="Filter by status"
            onChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
          />
        </div>

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching tests from the server…</p>
        ) : tests.length ? (
          <div className="ua-cfg-tc-grid">
            {tests.map((test) => {
              const cardLines = linesFromTest(test);
              return (
                <button
                  key={test.id}
                  type="button"
                  className={`ua-cfg-tc-card${selectedId === test.id ? " is-selected" : ""}${test.live ? "" : " is-hidden"}`}
                  onClick={() => setSelectedId(test.id)}
                >
                  <div className="ua-cfg-tc-card__top">
                    <div className="ua-cfg-tc-card__title-wrap">
                      <strong>{test.name}</strong>
                    </div>
                    {test.live ? <span className="ua-cfg-tc-card__live">Live</span> : <span className="ua-cfg-tc-card__hidden">Hidden</span>}
                  </div>
                  <ul className="ua-cfg-tc-card__lines">
                    {cardLines.map((line, index) => (
                      <li key={`${test.id}-line-${index}`}>
                        {[line.category, line.name, line.fastingType, line.duration].filter(Boolean).join(" · ")}
                      </li>
                    ))}
                  </ul>
                  <span className="ua-cfg-tc-card__count">
                    {cardLines.length} test{cardLines.length === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No tests in the catalog yet. Add one below.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={TEST_CATALOG_PAGE_SIZE}
            onPageChange={setPage}
            label="Test catalog pagination"
          />
        ) : null}
      </Panel>

      <Panel
        title="Add a test"
        subtitle="Give it a title, then add one or more tests with category, fasting type, and duration."
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
              + New test
            </button>
          ) : null
        }
      >
        {showAddForm ? (
          <div className="ua-cfg-tc-add">
            <TestLinesEditor
              title={newTitle}
              lines={newLines}
              categories={catalogCategories}
              disabled={busy}
              onTitleChange={setNewTitle}
              onLinesChange={setNewLines}
            />

            <div className="ua-cfg-dp-add__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addTest}>
                {busy ? "Adding…" : "Add to catalog"}
              </button>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={resetAddForm}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      {selectedTest ? (
        <TestEditModal
          test={selectedTest}
          busy={busy}
          categories={catalogCategories}
          onClose={() => setSelectedId(null)}
          onChange={(fields, message) => persistTest(selectedTest.id, fields, message)}
          onDelete={(test) => setPendingDelete(test)}
          onToast={onToast}
        />
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete test"
        title={pendingDelete ? `Remove “${pendingDelete.name}”?` : ""}
        body="If this test is already assigned to a client, delete will fail — hide it instead."
        cancelLabel="Keep test"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
