import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TEST_CATALOG_PAGE_SIZE,
  adminCreateTestCatalog,
  adminDeleteTestCatalog,
  adminListTestCatalog,
  adminUpdateTestCatalog,
  testCategoryOptions,
} from "../api/testCatalogApi.js";
import { ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

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

function Panel({ title, subtitle, actions, children }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className="ua-cfg-panel">
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

function CategorySelect({ value, extras = [], disabled, onChange, allowEmpty = false, emptyLabel = "Select category" }) {
  const options = testCategoryOptions(extras);
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select
      className="ua-cfg-dp-add__title"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {list.map((category) => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>
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
            className="ua-cfg-dp-add__title"
            placeholder="Parameter name · e.g. HbA1c"
            value={param.name}
            disabled={disabled}
            onChange={(event) => updateRow(index, { name: event.target.value })}
          />
          <input
            type="text"
            className="ua-cfg-dp-add__title"
            placeholder="Unit"
            value={param.unit}
            disabled={disabled}
            onChange={(event) => updateRow(index, { unit: event.target.value })}
          />
          <input
            type="text"
            className="ua-cfg-dp-add__title"
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
              <TrashIcon />
            </button>
          ) : null}
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
              className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
              disabled={busy}
              aria-label={`Delete ${test.name}`}
              title="Delete test"
              onClick={() => onDelete(test)}
            >
              <TrashIcon />
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="ua-cfg-tc-form">
          <label>
            <span>Name</span>
            <input className="ua-cfg-dp-add__title" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>Slug</span>
            <input className="ua-cfg-dp-add__title" value={testId} disabled={busy} onChange={(e) => setTestId(e.target.value)} />
          </label>
          <label>
            <span>Category</span>
            <CategorySelect value={category} extras={extras} disabled={busy} onChange={setCategory} />
          </label>
          <label>
            <span>Type</span>
            <select className="ua-cfg-dp-add__title" value={type} disabled={busy} onChange={(e) => setTypeAndParams(e.target.value)}>
              <option value="SINGLE">Single</option>
              <option value="PROFILE">Profile</option>
            </select>
          </label>
          <label>
            <span>Sequence</span>
            <input className="ua-cfg-dp-add__title" type="number" min="0" value={sequence} disabled={busy} onChange={(e) => setSequence(e.target.value)} />
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

        <div className="ua-cfg-dp-add__actions">
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
        title="Blood test catalog"
        subtitle={
          loading
            ? "Loading tests…"
            : "Admin maintains the master list. Coaches pick live tests on a client’s Internal Parameters page."
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-dp__count">
              {liveCount} live on this page · {pagination.total} in catalog
            </span>
          )
        }
      >
        <div className="ua-cfg-tc-filters">
          <input
            type="search"
            className="ua-cfg-dp-add__title"
            placeholder="Search name, slug or category"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <CategorySelect
            value={categoryFilter}
            extras={categories}
            allowEmpty
            emptyLabel="All categories"
            onChange={(value) => {
              setPage(1);
              setCategoryFilter(value);
            }}
          />
          <select
            className="ua-cfg-dp-add__title"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Live</option>
            <option value="inactive">Hidden</option>
          </select>
        </div>

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching tests from the server…</p>
        ) : tests.length ? (
          <div className="ua-cfg-nb-table-wrap">
            <table className="ua-cfg-nb-table ua-cfg-tc-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Parameters</th>
                  <th>Live</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id} className={test.live ? "" : "is-hidden"}>
                    <td>
                      <div className="ua-cfg-tc-name">
                        <strong>{test.name}</strong>
                        <span>{test.testId}</span>
                      </div>
                    </td>
                    <td>{test.category}</td>
                    <td>{test.type === "PROFILE" ? "Profile" : "Single"}</td>
                    <td>{test.parameters.length}</td>
                    <td>
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${test.live ? " ua-toggle--on" : ""}`}
                        aria-pressed={test.live}
                        aria-label={`${test.live ? "Hide" : "Show"} ${test.name}`}
                        disabled={busy}
                        onClick={() => persistTest(test.id, { live: !test.live }, test.live ? "Test hidden" : "Test is live")}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </td>
                    <td>
                      <div className="ua-cfg-tc-actions">
                        <button
                          type="button"
                          className="ua-cfg-icon-btn ua-cfg-icon-btn--edit"
                          aria-label={`Edit ${test.name}`}
                          title="Edit"
                          disabled={busy}
                          onClick={() => setSelectedId(test.id)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                          aria-label={`Delete ${test.name}`}
                          title="Delete"
                          disabled={busy}
                          onClick={() => setPendingDelete(test)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="ua-cfg-dp-add">
            <div className="ua-cfg-tc-form">
              <label>
                <span>Test name</span>
                <input
                  type="text"
                  className="ua-cfg-dp-add__title"
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
                  className="ua-cfg-dp-add__title"
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
                <select
                  className="ua-cfg-dp-add__title"
                  value={newType}
                  disabled={busy}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setNewType(nextType);
                    if (nextType === "SINGLE") {
                      setNewParameters((prev) => (prev.length ? [prev[0]] : [emptyParam()]));
                    } else {
                      setNewParameters((prev) => (prev.length >= 2 ? prev : [...prev, emptyParam(prev.length + 1)]));
                    }
                  }}
                >
                  <option value="SINGLE">Single</option>
                  <option value="PROFILE">Profile</option>
                </select>
              </label>
              <label>
                <span>Sequence</span>
                <input
                  type="number"
                  min="0"
                  className="ua-cfg-dp-add__title"
                  value={newSequence}
                  disabled={busy}
                  onChange={(event) => setNewSequence(event.target.value)}
                />
              </label>
            </div>
            <ParameterRows parameters={newParameters} disabled={busy} onChange={setNewParameters} />
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
