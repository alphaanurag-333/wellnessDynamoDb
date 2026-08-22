import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateRealPeopleTestimonial,
  adminDeleteRealPeopleTestimonial,
  adminListRealPeopleTestimonials,
  adminUpdateRealPeopleTestimonial,
} from "../api/realPeopleTestimonialApi.js";
import { adminListHealthConcerns } from "../api/healthConcernApi.js";
import { adminGetConfigDropdown, adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  TESTIMONIAL_PAGE_SIZE,
  TESTIMONIAL_POINT_SLUG,
  defaultDraftPoints,
  fieldKey,
  healthConcernIdOptions,
  mapTestimonialPointOptions,
} from "../data/testimonialDropdownData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { moveConfigListItem } from "../utils/configReorder.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";

const EMPTY_DRAFT = {
  name: "",
  review: "",
  stars: 5,
  healthConcernId: "",
  points: [],
  imageFile: null,
  imagePreview: "",
};

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function PhotoDrop({ previewUrl, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before ua-cfg-rp-drop${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">📷</span>
      <p className="ua-cfg-tf-drop__label">Client photo</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove client photo" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

const STAR_OPTIONS = [5, 4, 3, 2, 1].map((value) => ({
  value,
  label: `${value} star${value === 1 ? "" : "s"}`,
}));

function ConcernSelect({ options, value, disabled, onChange, className = "" }) {
  return (
    <CfgSelect
      className={`ua-cfg-rp-select${className ? ` ${className}` : ""}`}
      options={options.length ? options : [{ value: "", label: "No health concerns" }]}
      value={value || ""}
      disabled={disabled || !options.length}
      ariaLabel="Health concern"
      placeholder="Select health concern"
      onChange={onChange}
    />
  );
}

function DataPointEditor({ points, options, busy, onChange }) {
  const [addOpen, setAddOpen] = useState(false);
  const used = new Set(points.map((row) => fieldKey(row.field)));
  const available = options.filter((row) => !used.has(fieldKey(row.value)) && fieldKey(row.value) !== "client_name");

  return (
    <div className="ua-cfg-tf-points-ed">
      <div className="ua-cfg-tf-add">
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-add-pt"
          disabled={busy}
          onClick={() => setAddOpen((open) => !open)}
        >
          + Add data point
        </button>
        {addOpen ? (
          <div className="ua-cfg-tf-add__menu">
            {available.length ? available.map((entry) => (
              <button
                key={entry.id || entry.value}
                type="button"
                onClick={() => {
                  onChange((prev) => [...prev, {
                    id: `dp-${Date.now()}`,
                    field: entry.value,
                    label: entry.label,
                    value: "",
                    source: "AUTO",
                  }]);
                  setAddOpen(false);
                }}
              >
                {entry.label}
              </button>
            )) : <span>Add options in Configs → Dropdowns</span>}
          </div>
        ) : null}
      </div>
      <div className="ua-cfg-tf-table">
        <div className="ua-cfg-tf-table__head">
          <span>Field</span>
          <span>Value</span>
          <span />
        </div>
        {points.map((entry) => (
          <div key={entry.id} className="ua-cfg-tf-table__row">
            <span>{asCopyString(entry.label)}</span>
            <div className="ua-cfg-tf-table__value">
              <input
                type="text"
                value={asCopyString(entry.value)}
                placeholder={asCopyString(entry.label)}
                disabled={busy}
                onChange={(event) => onChange((prev) => prev.map((row) => (
                  row.id === entry.id ? { ...row, value: event.target.value } : row
                )))}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label={`Remove ${entry.label}`}
                disabled={busy}
                onClick={() => onChange((prev) => prev.filter((row) => row.id !== entry.id))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RealPeopleViewModal({ entry, concernLabel, onClose, onEdit }) {
  if (!entry) return null;
  const photo = entry.imagePreview || entry.profileImage;
  const points = (entry.dataPoints || []).filter((row) => String(row.value || "").trim());
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-rp-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="rp-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Real People Real Healing</p>
            <h3 id="rp-view-title">{asCopyString(entry.name) || "Untitled client"}</h3>
            <p>
              {asCopyString(entry.healthConcernTitle) || concernLabel(entry.healthConcernId) || "Uncategorized"}
              <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Hidden"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-rp-view__body">
          {photo ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
              <img src={photo} alt="" />
            </div>
          ) : (
            <div className="ua-cfg-rc-view__media"><div className="ua-cfg-rc-view__media-empty">No photo</div></div>
          )}
          <p className="ua-cfg-cr-stars" aria-label={`${entry.stars} stars`}>
            {"★★★★★".slice(0, Math.max(1, Math.min(5, entry.stars || 5)))}
            <span className="ua-cfg-cr-stars__empty">{"★★★★★".slice(Math.max(1, Math.min(5, entry.stars || 5)))}</span>
          </p>
          {asCopyString(entry.review) ? <p className="ua-cfg-rc-view__copy">{asCopyString(entry.review)}</p> : null}
          <dl className="ua-cfg-rc-view__meta">
            {points.map((row) => (
              <div key={row.id || row.field}>
                <dt>{asCopyString(row.label) || row.field}</dt>
                <dd>{asCopyString(row.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="ua-cfg-rc-view__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => {
              onEdit(entry.id);
              onClose();
            }}
          >
            Edit testimonial
          </button>
        </div>
      </div>
    </div>
  );
}

export function DynamicRealPeopleSection({ items, setItems, editor, setEditor, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [concernFilter, setConcernFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: TESTIMONIAL_PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const [concernOptions, setConcernOptions] = useState([]);
  const [pointOptions, setPointOptions] = useState([]);
  const coverInputRefs = useRef({});

  const loadLookups = useCallback(async () => {
    try {
      const [{ healthConcerns }, dropdownResult] = await Promise.all([
        adminListHealthConcerns(null, { page: 1, limit: 200, status: "active" }),
        (async () => {
          try {
            return await adminGetConfigDropdown(null, TESTIMONIAL_POINT_SLUG);
          } catch {
            const { lists } = await adminListConfigDropdowns(null, { limit: 50 });
            return (lists || []).find((row) => row.slug === TESTIMONIAL_POINT_SLUG) || null;
          }
        })(),
      ]);
      const concerns = healthConcernIdOptions(healthConcerns);
      const points = mapTestimonialPointOptions(dropdownResult).filter((row) => fieldKey(row.value) !== "client_name");
      setConcernOptions(concerns);
      setPointOptions(points);
      setDraft((prev) => ({
        ...prev,
        healthConcernId: prev.healthConcernId || concerns[0]?.value || "",
        points: prev.points.length ? prev.points : defaultDraftPoints(points).filter((row) => fieldKey(row.field) !== "client_name"),
      }));
    } catch (error) {
      setConcernOptions([]);
      setPointOptions([]);
      onToast(error?.message || "Could not load dropdowns");
    }
  }, [onToast]);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListRealPeopleTestimonials(null, {
        page: nextPage,
        limit: TESTIMONIAL_PAGE_SIZE,
        search: query || undefined,
        healthConcernId: concernFilter || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || TESTIMONIAL_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load real people testimonials");
    } finally {
      setLoading(false);
    }
  }, [concernFilter, onToast, page, query, setItems]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query, concernFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    if (draft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(draft.imagePreview);
  }, [draft.imagePreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCrop(file, target) {
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({ file, previewUrl: URL.createObjectURL(file), target });
  }

  function clearDraftPhoto() {
    setDraft((prev) => {
      if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
      return { ...prev, imageFile: null, imagePreview: "" };
    });
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const target = cropPending.target;
    closeCrop();
    if (target === "draft") {
      setDraft((prev) => {
        if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
        return { ...prev, imageFile: croppedFile, imagePreview: URL.createObjectURL(croppedFile) };
      });
      onToast("Client photo attached");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateRealPeopleTestimonial(null, target, {}, croppedFile);
      patchItem(target, saved);
      onToast("Client photo updated");
    } catch (error) {
      onToast(error?.message || "Could not update the photo");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.name.trim();
    const review = draft.review.trim();
    if (!name || !review) {
      onToast("Add the client name and review");
      return;
    }
    if (!draft.healthConcernId) {
      onToast("Pick a health concern from Configs → Dropdowns");
      return;
    }
    if (!(draft.imageFile instanceof File)) {
      onToast("Add a client photo");
      return;
    }
    setBusy(true);
    try {
      await adminCreateRealPeopleTestimonial(null, {
        name,
        review,
        stars: draft.stars,
        healthConcernId: draft.healthConcernId,
        dataPoints: draft.points,
        status: "active",
      }, draft.imageFile);
      clearDraftPhoto();
      setDraft({
        ...EMPTY_DRAFT,
        healthConcernId: concernOptions[0]?.value || "",
        points: defaultDraftPoints(pointOptions).filter((row) => fieldKey(row.field) !== "client_name"),
      });
      setCreating(false);
      setPage(1);
      onToast("Real people testimonial added");
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Could not add testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item) {
    const name = String(item.name || "").trim();
    const review = String(item.review || "").trim();
    if (!name || !review) {
      onToast("Add the client name and review");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateRealPeopleTestimonial(null, item.id, {
        name,
        review,
        stars: item.stars,
        healthConcernId: item.healthConcernId,
        dataPoints: item.dataPoints || [],
      });
      patchItem(item.id, saved);
      setEditingId(null);
      onToast("Testimonial saved");
    } catch (error) {
      onToast(error?.message || "Could not save testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateRealPeopleTestimonial(null, item.id, { live });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { live: item.live, status: item.status });
      onToast(error?.message || "Could not update visibility");
    }
  }

  async function toggleSurface(item, field) {
    if (busy || (field !== "webVisible" && field !== "appVisible")) return;
    const next = !item[field];
    const prev = item[field];
    patchItem(item.id, { [field]: next });
    try {
      const saved = await adminUpdateRealPeopleTestimonial(null, item.id, { [field]: next });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { [field]: prev });
      onToast(error?.message || `Could not update ${field === "webVisible" ? "web" : "app"} visibility`);
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteRealPeopleTestimonial(null, item.id);
      onToast("Testimonial deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(index, direction) {
    await moveConfigListItem({
      canReorder,
      busy,
      setBusy,
      items,
      setItems,
      index,
      direction,
      listAll: async () => {
        const result = await adminListRealPeopleTestimonials(null, { page: 1, limit: 200 });
        return result.items || [];
      },
      updateItem: (id, fields) => adminUpdateRealPeopleTestimonial(null, id, fields),
      reload: loadItems,
      onToast,
    });
  }

  const hasListFilter = Boolean(query || concernFilter);
  const canReorder = !hasListFilter;
  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);
  const concernLabel = (id) => concernOptions.find((row) => row.value === id)?.label || "";
  const viewing = items.find((row) => row.id === viewingId) || null;

  return (
    <div className="ua-cfg-rp">
      <SectionSurfacePanel
        sectionId="real-people"
        editor={editor}
        setEditor={setEditor}
        onToast={onToast}
      />
      <Panel
        title="Real People Real Healing"
        subtitle={loading ? "Loading testimonials…" : `${pagination.total} total · ${liveCount} live on this page · health concern + testimonial data points from Dropdowns${canReorder ? " · use arrows to reorder" : ""}`}
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setViewingId(null);
              setDraft({
                ...EMPTY_DRAFT,
                healthConcernId: concernOptions[0]?.value || "",
                points: defaultDraftPoints(pointOptions).filter((row) => fieldKey(row.field) !== "client_name"),
              });
            }}
          >
            + Add testimonial
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-rp-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">💬</span> New testimonial</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rp-new__grid">
              <div className="ua-cfg-rp-new__top">
                <PhotoDrop
                  previewUrl={draft.imagePreview}
                  disabled={busy}
                  onPick={(file) => openCrop(file, "draft")}
                  onRemove={clearDraftPhoto}
                />
                <div className="ua-cfg-rp-new__meta">
                  <label className="ua-cfg-rp-field">
                    <span>Health concern</span>
                    <ConcernSelect
                      options={concernOptions}
                      value={draft.healthConcernId}
                      disabled={busy}
                      onChange={(value) => setDraft((prev) => ({ ...prev, healthConcernId: value }))}
                    />
                  </label>
                  <label className="ua-cfg-rp-field">
                    <span>Rating</span>
                    <CfgSelect
                      className="ua-cfg-rp-select"
                      options={STAR_OPTIONS}
                      value={draft.stars}
                      disabled={busy}
                      ariaLabel="Rating"
                      onChange={(value) => setDraft((prev) => ({ ...prev, stars: Number(value) }))}
                    />
                  </label>
                  <label className="ua-cfg-rp-field ua-cfg-rp-field--wide">
                    <span>Client name</span>
                    <input
                      className="ua-cfg-vh-input"
                      placeholder="Client name"
                      value={asCopyString(draft.name)}
                      disabled={busy}
                      onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  {!concernOptions.length ? (
                    <p className="ua-cfg-panel__sub ua-cfg-rp-field--wide">Add health concerns in Configs → Dropdowns first.</p>
                  ) : null}
                </div>
              </div>
              <div className="ua-cfg-rp-new__split">
                <div className="ua-cfg-rp-new__fields">
                  <DataPointEditor
                    points={draft.points}
                    options={pointOptions}
                    busy={busy}
                    onChange={(updater) => setDraft((prev) => ({ ...prev, points: updater(prev.points) }))}
                  />
                </div>
                <div className="ua-cfg-rp-new__story-col">
                  <span className="ua-cfg-rp-new__story-label">Review</span>
                  <textarea
                    className="ua-cfg-tf-story ua-cfg-rp-new__story"
                    rows={6}
                    placeholder="Client review shown with the photo…"
                    value={asCopyString(draft.review)}
                    disabled={busy}
                    onChange={(event) => setDraft((prev) => ({ ...prev, review: event.target.value }))}
                  />
                </div>
              </div>
              <div className="ua-cfg-rp-new__foot">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addItem}>
                  {busy ? "Saving…" : "Add testimonial"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search by client name or review…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search testimonials"
          />
          <CfgSelect
            className="ua-cfg-select--filter"
            options={[{ value: "", label: "All health concerns" }, ...concernOptions]}
            value={concernFilter}
            onChange={setConcernFilter}
            ariaLabel="Filter by health concern"
          />
        </div>

        {items.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {items.map((entry, index) => {
              const isEditing = editingId === entry.id;
              const photo = entry.imagePreview || entry.profileImage;
              return (
                <article key={entry.id} className={`ua-cfg-rc-item ua-cfg-rp-item${isEditing ? " is-editing" : ""}`}>
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className={`ua-cfg-rc-cover ua-cfg-rc-cover--pick${photo ? " is-on" : ""}`}
                      disabled={busy}
                      aria-label={photo ? "Replace client photo" : "Add client photo"}
                      onClick={() => coverInputRefs.current[entry.id]?.click()}
                    >
                      {photo ? <img className="ua-cfg-rc-cover__img" src={photo} alt="" /> : <span aria-hidden="true">📷</span>}
                      <em>{photo ? "Replace" : "Photo"}</em>
                    </button>
                    <input
                      ref={(node) => {
                        coverInputRefs.current[entry.id] = node;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) openCrop(file, entry.id);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-rp-item__body">
                    <div className="ua-cfg-rp-item__head">
                      <div className="ua-cfg-rp-item__identity">
                        {isEditing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            value={asCopyString(entry.name)}
                            disabled={busy}
                            onChange={(event) => patchItem(entry.id, { name: event.target.value })}
                          />
                        ) : (
                          <strong>{asCopyString(entry.name)}</strong>
                        )}
                        <div className="ua-cfg-rp-item__meta">
                          {isEditing ? (
                            <>
                              <ConcernSelect
                                options={concernOptions}
                                value={entry.healthConcernId}
                                disabled={busy}
                                onChange={(value) => patchItem(entry.id, { healthConcernId: value })}
                              />
                              <CfgSelect
                                className="ua-cfg-rp-select ua-cfg-select--sm"
                                options={STAR_OPTIONS}
                                value={entry.stars}
                                disabled={busy}
                                ariaLabel="Rating"
                                onChange={(value) => patchItem(entry.id, { stars: Number(value) })}
                              />
                            </>
                          ) : (
                            <>
                              <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">
                                {asCopyString(entry.healthConcernTitle) || concernLabel(entry.healthConcernId) || "Uncategorized"}
                              </span>
                              <span className="ua-cfg-cr-stars" aria-label={`${entry.stars} stars`}>
                                {"★★★★★".slice(0, Math.max(1, Math.min(5, entry.stars || 5)))}
                              </span>
                              <p className="ua-cfg-panel__sub">{formatRecipeDate(entry.updatedAt)}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ua-cfg-rp-item__actions">
                        <div className="ua-cfg-rp-item__surfaces">
                          <div className="ua-cfg-rp-item__live">
                            <span className={`ua-cfg-faq__shown${entry.webVisible ? " is-on" : ""}`}>WEB</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.webVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.webVisible}
                              aria-label={entry.webVisible ? "Hide on web" : "Show on web"}
                              disabled={busy}
                              onClick={() => toggleSurface(entry, "webVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-rp-item__live">
                            <span className={`ua-cfg-faq__shown${entry.appVisible ? " is-on" : ""}`}>APP</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.appVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.appVisible}
                              aria-label={entry.appVisible ? "Hide on app" : "Show on app"}
                              disabled={busy}
                              onClick={() => toggleSurface(entry, "appVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-rp-item__live">
                            <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                            <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} disabled={busy} onClick={() => toggleLive(entry)}>
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-tf-item__moves">
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            disabled={busy || !canReorder || index === 0}
                            onClick={() => moveItem(index, -1)}
                            aria-label="Move up"
                            title={canReorder ? "Move up" : "Clear filters to reorder"}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            disabled={busy || !canReorder || index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                            aria-label="Move down"
                            title={canReorder ? "Move down" : "Clear filters to reorder"}
                          >
                            ↓
                          </button>
                        </div>
                        <div className="ua-cfg-rp-item__btns">
                          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => setViewingId(entry.id)}>View</button>
                          {isEditing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveItem(entry)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => { setEditingId(null); loadItems(); }}>Cancel</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={busy}
                              onClick={() => { setViewingId(null); setEditingId(entry.id); setCreating(false); }}
                            >
                              Edit
                            </button>
                          )}
                          <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${asCopyString(entry.name)}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                        </div>
                      </div>
                    </div>
                    {isEditing ? (
                      <>
                        <DataPointEditor
                          points={entry.dataPoints || []}
                          options={pointOptions}
                          busy={busy}
                          onChange={(updater) => patchItem(entry.id, { dataPoints: updater(entry.dataPoints || []) })}
                        />
                        <textarea
                          className="ua-cfg-tf-story"
                          rows={3}
                          value={asCopyString(entry.review)}
                          disabled={busy}
                          onChange={(event) => patchItem(entry.id, { review: event.target.value })}
                        />
                      </>
                    ) : (
                      <p className="ua-cfg-rp-item__story">{asCopyString(entry.review)}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading ? "Fetching testimonials…" : query || concernFilter ? "No testimonials match your search." : "No testimonials yet."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={TESTIMONIAL_PAGE_SIZE}
          onPageChange={setPage}
          label="Real people pagination"
        />
      </Panel>

      <RealPeopleViewModal
        entry={viewing}
        concernLabel={concernLabel}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

      <ImageCropModal
        open={Boolean(cropPending)}
        label="client photo"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="3 / 4"
        originalAspectNumber={3 / 4}
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Real people testimonial"
        title={`Delete ${asCopyString(pendingDelete?.name) || "this testimonial"}?`}
        body="This permanently removes the testimonial and its uploaded image."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
