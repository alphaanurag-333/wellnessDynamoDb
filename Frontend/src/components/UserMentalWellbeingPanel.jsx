import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { AiOutlineEye } from "react-icons/ai";
import { CatalogPickerPagination } from "./CatalogPickerPagination.jsx";
import { CATALOG_PAGE_SIZE, emptyCatalogPagination } from "./catalogPickerConstants.js";
import { fetchActiveMentalWellbeingCatalog } from "../wellnessCoach/api/coachMentalWellbeingCatalog.js";

import { formatDate } from "../admin/utils/formatDate.js";

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

function youtubeEmbedUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return "";
  }
  return "";
}

function MentalWellbeingPreviewModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, item]);

  if (!item) return null;

  const link = resolveItemLink(item);
  const embedUrl = item.type === "ytlink" ? youtubeEmbedUrl(item.ytLink || link) : "";

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mental-wellbeing-preview-title" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-card__title" id="mental-wellbeing-preview-title">
          {item.title}
        </h3>
        <p className="modal-card__subtitle">{itemTypeLabel(item.type)}</p>

        <div className="mental-wellbeing-preview__media">
          {item.type === "ytlink" && embedUrl ? (
            <iframe
              title={item.title}
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="mental-wellbeing-preview__embed"
            />
          ) : item.type === "video" && item.file ? (
            <video
              src={item.file}
              controls
              playsInline
              preload="metadata"
              className="mental-wellbeing-preview__video"
            />
          ) : item.type === "audio" && item.file ? (
            <audio src={item.file} controls preload="metadata" className="mental-wellbeing-preview__audio" />
          ) : (
            <p className="table-placeholder">No preview available for this content.</p>
          )}
        </div>

        {link ? (
          <p className="mental-wellbeing-preview__link">
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              Open content
            </a>
          </p>
        ) : null}

        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function ItemPickerCard({ item, selected, onToggle, onViewContent }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(item);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`catalog-picker__card catalog-picker__card--mental-wellbeing${selected ? " catalog-picker__card--selected" : ""}`}
      onClick={() => onToggle(item)}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
    >
      <div className="catalog-picker__card-head">
        <span className="catalog-picker__card-name">{item.title}</span>
        <span className="catalog-picker__card-check" aria-hidden="true">
          {selected ? <CheckIcon /> : null}
        </span>
      </div>
      <div className="catalog-picker__card-meta">
        <span className="catalog-picker__badge catalog-picker__badge--type catalog-picker__badge--with-action">
          {itemTypeLabel(item.type)}
          <button
            type="button"
            className="catalog-picker__view-points"
            title="View content"
            aria-label={`View content for ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onViewContent(item);
            }}
          >
            <AiOutlineEye size={15} aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
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
              {assignment.createdAt ? ` · Assigned ${formatDate(assignment.createdAt)}` : ""}
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
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPagination, setCatalogPagination] = useState(() => emptyCatalogPagination());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [selectedItemsById, setSelectedItemsById] = useState(() => new Map());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [previewItem, setPreviewItem] = useState(null);

  const assignedItemIds = useMemo(
    () =>
      new Set(
        assignments
          .map((row) => row.mentalWellbeingId || row.mentalWellbeing?.id || row.mentalWellbeing?._id)
          .filter(Boolean)
      ),
    [assignments]
  );

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => !assignedItemIds.has(item.id || item._id));
  }, [assignedItemIds, catalogItems]);

  const selectedItemIds = useMemo(() => [...selectedItemsById.keys()], [selectedItemsById]);

  const selectedItems = useMemo(() => [...selectedItemsById.values()], [selectedItemsById]);

  const loadAssignments = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const assigned = await api.list(token, userId);
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

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const catalog = await fetchActiveMentalWellbeingCatalog({
        page: catalogPage,
        limit: CATALOG_PAGE_SIZE,
        search,
        type: typeFilter,
      });
      setCatalogItems(catalog.mentalWellbeing ?? []);
      setCatalogPagination(catalog.pagination ?? emptyCatalogPagination(catalogPage));
    } catch (e) {
      setCatalogItems([]);
      setCatalogPagination(emptyCatalogPagination(catalogPage));
      setError((prev) => prev || e.message || "Failed to load mental wellbeing catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogPage, search, typeFilter]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setCatalogPage(1);
  }, [search, typeFilter]);

  const toggleItem = (item) => {
    const itemId = item.id || item._id;
    setSelectedItemsById((prev) => {
      const next = new Map(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.set(itemId, item);
      return next;
    });
  };

  const clearSelection = () => setSelectedItemsById(new Map());

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

      setSelectedItemsById(new Map());
      setSearch("");
      setCatalogPage(1);
      await Promise.all([loadAssignments(), loadCatalog()]);
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
      await loadAssignments();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else await Swal.fire({ icon: "error", title: "Remove failed", text: err.message || "Could not remove item." });
    } finally {
      setRemovingId("");
    }
  };

  if (notFound && NotFoundPage) return <NotFoundPage />;
  if (loading && PageLoader) return <PageLoader label="Loading mental wellbeing…" />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel client-hub-module-panel" : "user-page"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Mental Wellbeing</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Assign meditation, audio, and video content from the catalog to this client.
          </p>
        </div>
      ) : (
        <div className="user-page__toolbar">
          <Link to={backTo} className="user-back-btn" aria-label="Back to clients">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
          <div className="user-page__toolbar-text">
            <h2 className="user-page__title">Mental Wellbeing</h2>
            <p className="user-page__subtitle">Assign videos and audios from the admin catalog to this client.</p>
          </div>
        </div>
      )}

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={embedded ? "client-hub-module-panel__content" : "page-card diet-plan-page"}>
        {!readOnly ? (
          <form
            className={`form-card diet-plan-upload${embedded ? " form-card--embedded" : ""}`}
            onSubmit={handleAssign}
          >
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
                    placeholder="Title, type…"
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
                    {selectedItemIds.length} selected · {catalogPagination.total || 0} total
                  </span>
                  {selectedItemIds.length > 0 ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredItems.length === 0 && !catalogLoading ? (
                <p className="table-placeholder">
                  {catalogPagination.total === 0
                    ? "No active content in catalog. Ask admin to add mental wellbeing items."
                    : "No matching items on this page. Try another search or filter."}
                </p>
              ) : (
                <>
                  <div className="catalog-picker">
                    <div className={`catalog-picker__grid${catalogLoading ? " catalog-picker__grid--loading" : ""}`}>
                      {filteredItems.map((item) => {
                        const id = item.id || item._id;
                        return (
                          <ItemPickerCard
                            key={id}
                            item={item}
                            selected={selectedItemIds.includes(id)}
                            onToggle={toggleItem}
                            onViewContent={setPreviewItem}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <CatalogPickerPagination
                    page={catalogPagination.page || catalogPage}
                    pages={catalogPagination.pages || 1}
                    total={catalogPagination.total || 0}
                    loading={catalogLoading}
                    onPageChange={setCatalogPage}
                  />
                </>
              )}

              {selectedItems.length > 0 ? (
                <div className="client-hub-module-panel__selection">
                  <span className="client-hub-module-panel__selection-label">Selected content</span>
                  <div className="plan-chip-list">
                    {selectedItems.map((item) => (
                      <div key={item.id || item._id} className="plan-chip">
                        <span className="plan-chip__name">{item.title}</span>
                        <span className="plan-chip__meta">{itemTypeLabel(item.type)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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

        <section className="diet-plan-section client-hub-module-panel__section">
          <h3 className="form-card__title">Assigned content ({assignments.length})</h3>
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

      <MentalWellbeingPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
