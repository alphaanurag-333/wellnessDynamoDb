import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TEST_CATALOG_PAGE_SIZE,
  adminCreateTestCatalog,
  adminDeleteTestCatalog,
  adminListTestCatalog,
  adminUpdateTestCatalog,
  testCategoryOptions,
} from "../api/testCatalogApi.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const TYPE_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "PROFILE", label: "Profile" },
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

function emptyParam(sequence = 1) {
  return { name: "", unit: "", refRange: "", sequence };
}

function cleanParameters(parameters, type) {
  const cleaned = (parameters || [])
    .map((param, index) => ({
      paramId: slugify(param.paramId || param.name) || `param-${index + 1}`,
      name: String(param.name || "").trim(),
      unit: String(param.unit || "").trim() || "—",
      refRange: String(param.refRange || "").trim() || "—",
      sequence: index + 1,
    }))
    .filter((param) => param.name);

  if (type === "SINGLE") return cleaned.slice(0, 1);
  return cleaned;
}

function paramPreview(parameters = []) {
  const names = parameters.map((entry) => entry.name).filter(Boolean);
  if (!names.length) return "No parameters yet";
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 3).join(" · ")} +${names.length - 3} more`;
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
  disabled,
  onChange,
  allowEmpty = false,
  emptyLabel = "Select category",
  className = "ua-cfg-tc-select",
  ariaLabel = "Category",
}) {
  const options = testCategoryOptions(extras);
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

function ParameterRows({ parameters, disabled, onChange }) {
  function updateRow(index, patch) {
    onChange(parameters.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="ua-cfg-tc-params">
      <div className="ua-cfg-tc-params__labels">
        <span>Parameter</span>
        <span>Unit</span>
        <span>Ref range</span>
        <span />
      </div>
      {parameters.map((param, index) => (
        <div key={`param-${index}`} className="ua-cfg-tc-params__row">
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="Parameter name · e.g. HbA1c"
            value={param.name}
            disabled={disabled}
            onChange={(event) => updateRow(index, { name: event.target.value })}
          />
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="Unit"
            value={param.unit}
            disabled={disabled}
            onChange={(event) => updateRow(index, { unit: event.target.value })}
          />
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="Ref range"
            value={param.refRange}
            disabled={disabled}
            onChange={(event) => updateRow(index, { refRange: event.target.value })}
          />
          {parameters.length > 1 ? (
            <button
              type="button"
              className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
              disabled={disabled}
              aria-label="Remove parameter"
              onClick={() => onChange(parameters.filter((_, rowIndex) => rowIndex !== index))}
            >
              ×
            </button>
          ) : (
            <span className="ua-cfg-tc-params__spacer" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

function TestEditModal({ test, busy, extras = [], onClose, onChange, onDelete }) {
  const [name, setName] = useState(test.name);
  const [testId, setTestId] = useState(test.testId);
  const [category, setCategory] = useState(test.category);
  const [type, setType] = useState(test.type);
  const [sequence, setSequence] = useState(String(test.sequence || 0));
  const [parameters, setParameters] = useState(
    test.parameters.length ? test.parameters : [emptyParam()],
  );

  useEffect(() => {
    setName(test.name);
    setTestId(test.testId);
    setCategory(test.category);
    setType(test.type);
    setSequence(String(test.sequence || 0));
    setParameters(test.parameters.length ? test.parameters : [emptyParam()]);
  }, [test]);

  function setTypeAndParams(nextType) {
    setType(nextType);
    if (nextType === "SINGLE") {
      setParameters((prev) => (prev.length ? [prev[0]] : [emptyParam()]));
      return;
    }
    setParameters((prev) => (prev.length >= 2 ? prev : [...prev, emptyParam(prev.length + 1)]));
  }

  async function save() {
    const cleaned = cleanParameters(parameters, type);
    if (!name.trim() || !category.trim()) {
      return false;
    }
    if (type === "SINGLE" && cleaned.length !== 1) return false;
    if (type === "PROFILE" && cleaned.length < 2) return false;
    return onChange({
      name: name.trim(),
      testId: testId.trim() || slugify(name),
      category: category.trim(),
      type,
      sequence: Number(sequence) || 0,
      parameters: cleaned,
    }, "Test saved");
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
          <div className="ua-cfg-tc-form">
            <label>
              <span>Name</span>
              <input className="ua-cfg-tc-field" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Slug</span>
              <input className="ua-cfg-tc-field" value={testId} disabled={busy} onChange={(e) => setTestId(e.target.value)} />
            </label>
            <label>
              <span>Category</span>
              <CategorySelect value={category} extras={extras} disabled={busy} onChange={setCategory} />
            </label>
            <label>
              <span>Type</span>
              <CfgSelect
                className="ua-cfg-tc-select"
                options={TYPE_OPTIONS}
                value={type}
                disabled={busy}
                ariaLabel="Test type"
                onChange={setTypeAndParams}
              />
            </label>
            <label>
              <span>Sequence</span>
              <input className="ua-cfg-tc-field" type="number" min="0" value={sequence} disabled={busy} onChange={(e) => setSequence(e.target.value)} />
            </label>
          </div>

          <div className="ua-cfg-tc-params-wrap">
            <div className="ua-cfg-tc-params__head">
              <strong>Parameters</strong>
              {type === "PROFILE" ? (
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  disabled={busy}
                  onClick={() => setParameters((prev) => [...prev, emptyParam(prev.length + 1)])}
                >
                  + Parameter
                </button>
              ) : null}
            </div>
            <ParameterRows parameters={parameters} disabled={busy} onChange={setParameters} />
          </div>
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

  const [newName, setNewName] = useState("");
  const [newTestId, setNewTestId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState("SINGLE");
  const [newSequence, setNewSequence] = useState("0");
  const [newParameters, setNewParameters] = useState([emptyParam()]);

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
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    testsRef.current = tests;
  }, [tests]);

  function resetAddForm() {
    setNewName("");
    setNewTestId("");
    setNewCategory("");
    setNewType("SINGLE");
    setNewSequence("0");
    setNewParameters([emptyParam()]);
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
    const name = newName.trim();
    const category = newCategory.trim();
    const cleaned = cleanParameters(newParameters, newType);
    if (!name || !category) {
      onToast("Name and category are required");
      return;
    }
    if (newType === "SINGLE" && cleaned.length !== 1) {
      onToast("A single test needs one named parameter");
      return;
    }
    if (newType === "PROFILE" && cleaned.length < 2) {
      onToast("A profile needs at least two named parameters");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateTestCatalog(null, {
        name,
        testId: newTestId.trim() || slugify(name),
        category,
        type: newType,
        sequence: Number(newSequence) || 0,
        parameters: cleaned,
        live: true,
      });
      if (!created) throw new Error("Failed to add test");
      resetAddForm();
      onToast(`${name} added to the catalog`);
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
            : "Admin maintains the master list. Coaches pick live tests on a client’s Internal Parameters page."
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
            {tests.map((test) => (
              <button
                key={test.id}
                type="button"
                className={`ua-cfg-tc-card${selectedId === test.id ? " is-selected" : ""}${test.live ? "" : " is-hidden"}`}
                onClick={() => setSelectedId(test.id)}
              >
                <div className="ua-cfg-tc-card__top">
                  <div className="ua-cfg-tc-card__title-wrap">
                    <strong>{test.name}</strong>
                    <span className="ua-cfg-tc-card__slug">{test.testId}</span>
                  </div>
                  {test.live ? <span className="ua-cfg-tc-card__live">Live</span> : <span className="ua-cfg-tc-card__hidden">Hidden</span>}
                </div>
                <div className="ua-cfg-tc-card__meta">
                  <span>{test.category || "Uncategorized"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{test.type === "PROFILE" ? "Profile" : "Single"}</span>
                </div>
                <p className="ua-cfg-tc-card__excerpt">{paramPreview(test.parameters)}</p>
                <span className="ua-cfg-tc-card__count">
                  {test.parameters.length} parameter{test.parameters.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
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
        subtitle="Name it, set the category, and add reference parameters. Coaches can then assign it to a client."
        actions={
          !showAddForm ? (
            <button
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
            <div className="ua-cfg-tc-form">
              <label>
                <span>Test name</span>
                <input
                  type="text"
                  className="ua-cfg-tc-field"
                  placeholder="e.g. HbA1c"
                  value={newName}
                  disabled={busy}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  type="text"
                  className="ua-cfg-tc-field"
                  placeholder="Optional · auto from name"
                  value={newTestId}
                  disabled={busy}
                  onChange={(event) => setNewTestId(event.target.value)}
                />
              </label>
              <label>
                <span>Category</span>
                <CategorySelect
                  value={newCategory}
                  extras={categories}
                  allowEmpty
                  disabled={busy}
                  onChange={setNewCategory}
                />
              </label>
              <label>
                <span>Type</span>
                <CfgSelect
                  className="ua-cfg-tc-select"
                  options={TYPE_OPTIONS}
                  value={newType}
                  disabled={busy}
                  ariaLabel="Test type"
                  onChange={(nextType) => {
                    setNewType(nextType);
                    if (nextType === "SINGLE") {
                      setNewParameters((prev) => (prev.length ? [prev[0]] : [emptyParam()]));
                    } else {
                      setNewParameters((prev) => (prev.length >= 2 ? prev : [...prev, emptyParam(prev.length + 1)]));
                    }
                  }}
                />
              </label>
              <label>
                <span>Sequence</span>
                <input
                  type="number"
                  min="0"
                  className="ua-cfg-tc-field"
                  value={newSequence}
                  disabled={busy}
                  onChange={(event) => setNewSequence(event.target.value)}
                />
              </label>
            </div>

            <div className="ua-cfg-tc-params-wrap">
              <div className="ua-cfg-tc-params__head">
                <strong>Parameters</strong>
                {newType === "PROFILE" ? (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                    disabled={busy}
                    onClick={() => setNewParameters((prev) => [...prev, emptyParam(prev.length + 1)])}
                  >
                    + Parameter
                  </button>
                ) : null}
              </div>
              <ParameterRows parameters={newParameters} disabled={busy} onChange={setNewParameters} />
            </div>

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
          extras={categories}
          onClose={() => setSelectedId(null)}
          onChange={(fields, message) => persistTest(selectedTest.id, fields, message)}
          onDelete={(test) => setPendingDelete(test)}
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
