import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveMentalWellbeingCatalog } from "../wellnessCoach/api/coachMentalWellbeingCatalog.js";

function formatAssignedDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function itemTypeLabel(type) {
  if (type === "video") return "Video";
  if (type === "audio") return "Audio";
  return "YouTube";
}

function resolveItemLink(item) {
  if (!item) return "";
  if (item.link) return item.link;
  if (item.type === "ytlink") return item.ytLink || "";
  return item.file || "";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function ItemPickerCard({ item, selected, onToggle }) {
  const id = item.id || item._id;

  return (
    <button
      type="button"
      className={`catalog-picker__card${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(id)}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{item.title}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        <span className="catalog-picker__badge catalog-picker__badge--type">
          {itemTypeLabel(item.type)}
        </span>
      </div>
    </button>
  );
}

function AssignmentCard({ assignment, onRemove, removing, canRemove }) {
  const assignmentId = assignment.id || assignment._id;
  const item = assignment.mentalWellbeing || {};
  const link = resolveItemLink(item);

  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div className="diet-plan-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z" />
              <path d="M12 8v4l3 2" />
            </svg>
          </div>
          <div>
            <div className="diet-plan-card__title">{item.title || "Content"}</div>
            <div className="diet-plan-card__date">
              {itemTypeLabel(item.type)}
              {assignment.createdAt ? ` · Assigned ${formatAssignedDate(assignment.createdAt)}` : ""}
            </div>
          </div>
        </div>
        <div className="assignment-card__header-actions">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              Open
            </a>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm text-danger"
              onClick={() => onRemove(assignment)}
              disabled={removing}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function UserMentalWellbeingPanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [catalogItems, setCatalogItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const assignedItemIds = useMemo(
    () =>
      new Set(
        assignments
          .map((row) => row.mentalWellbeingId || row.mentalWellbeing?.id || row.mentalWellbeing?._id)
          .filter(Boolean)
      ),
    [assignments]
  );

  const availableCatalog = useMemo(
    () => catalogItems.filter((item) => !assignedItemIds.has(item.id || item._id)),
    [catalogItems, assignedItemIds]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = availableCatalog;

    if (typeFilter) {
      items = items.filter((item) => item.type === typeFilter);
    }

    if (q) {
      items = items.filter((item) => {
        const haystack = [item.title, itemTypeLabel(item.type)].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...items].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [availableCatalog, search, typeFilter]);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalog, assigned] = await Promise.all([
        fetchActiveMentalWellbeingCatalog(),
        api.list(token, userId),
      ]);
      setCatalogItems(catalog.mentalWellbeing ?? []);
      setAssignments(assigned.assignments ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load mental wellbeing content.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleItem = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const clearSelection = () => setSelectedItemIds([]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!selectedItemIds.length) {
      await Swal.fire({ icon: "warning", title: "Select at least one item." });
      return;
    }

    setAssigning(true);
    try {
      const result = await api.assign(token, userId, { mentalWellbeingIds: selectedItemIds });
      const createdCount = result?.assignments?.length ?? 0;
      const skippedDuplicate = result?.skippedDuplicate?.length ?? 0;

      if (createdCount === 0) {
        await Swal.fire({
          icon: "info",
          title: "Nothing new assigned",
          text:
            skippedDuplicate > 0
              ? "Selected items are already assigned to this client."
              : "Selected items are invalid or inactive.",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Content assigned",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setSelectedItemIds([]);
      setSearch("");
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Assign failed", text: err.message || "Could not assign content." });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (assignment) => {
    const title = assignment.mentalWellbeing?.title || "this item";
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove item?",
      text: `"${title}" will be removed from this client's list.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!confirm.isConfirmed) return;

    const assignmentId = assignment.id || assignment._id;
    setRemovingId(assignmentId);
    try {
      await api.remove(token, userId, assignmentId);
      await Swal.fire({ icon: "success", title: "Removed", timer: 1200, showConfirmButton: false });
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Remove failed", text: err.message || "Could not remove item." });
    } finally {
      setRemovingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading mental wellbeing…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        {backTo ? (
          <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        ) : null}
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Mental Wellbeing</h2>
          <p className="user-page__subtitle">Assign videos and audios from the admin catalog to this client.</p>
        </div>
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-card diet-plan-page">
        {!readOnly ? (
          <form className="form-card diet-plan-upload" onSubmit={handleAssign}>
            <h3 className="form-card__title">Assign from catalog</h3>

            <div className="form-section">
              <div className="form-section__header">
                <span className="user-field__label" style={{ marginBottom: 0 }}>
                  Select content <span className="required-dot">*</span>
                </span>
              </div>

              <div className="catalog-picker__toolbar">
                <label className="user-field">
                  <span className="user-field__label">Search</span>
                  <input
                    className="user-field__input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title…"
                  />
                </label>
                <label className="user-field">
                  <span className="user-field__label">Type</span>
                  <select className="user-field__input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All types</option>
                    <option value="ytlink">YouTube</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </label>
                <div className="catalog-picker__summary">
                  <span>
                    {selectedItemIds.length} selected · {filteredItems.length} available
                  </span>
                  {selectedItemIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <p className="table-placeholder">
                  {catalogItems.length === 0
                    ? "No active content in catalog. Ask admin to add mental wellbeing items."
                    : availableCatalog.length === 0
                      ? "All catalog items are already assigned to this client."
                      : "No matching items. Try another search or filter."}
                </p>
              ) : (
                <div className="catalog-picker">
                  <div className="catalog-picker__grid">
                    {filteredItems.map((item) => {
                      const id = item.id || item._id;
                      return (
                        <ItemPickerCard
                          key={id}
                          item={item}
                          selected={selectedItemIds.includes(id)}
                          onToggle={toggleItem}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="diet-assign-form__actions">
              <span className="diet-assign-form__hint">
                {selectedItemIds.length
                  ? `${selectedItemIds.length} item(s) will be assigned to this client.`
                  : "Select one or more items to assign."}
              </span>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={assigning || !selectedItemIds.length}
              >
                {assigning ? "Assigning…" : "Assign selected"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="diet-plan-section">
          <h3 className="form-card__title">Assigned content</h3>
          {assignments.length === 0 ? (
            <p className="table-placeholder">No mental wellbeing content assigned yet.</p>
          ) : (
            <div className="diet-plan-list">
              {assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id || assignment._id}
                  assignment={assignment}
                  onRemove={handleRemove}
                  removing={removingId === (assignment.id || assignment._id)}
                  canRemove={!readOnly}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
