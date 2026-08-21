import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateLeadershipNote,
  adminDeleteLeadershipNote,
  adminListLeadershipNotes,
  adminUpdateLeadershipNote,
} from "../api/leadershipNoteApi.js";
import { adminGetConfigDropdown } from "../api/configDropdownApi.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";

const PAGE_SIZE = 10;
const DEFAULT_BADGE = "A NOTE FROM LEADERSHIP";

const EMPTY_DRAFT = {
  name: "",
  designation: "",
  title: "",
  badge: DEFAULT_BADGE,
  message: "",
  webVisible: true,
  appVisible: true,
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

function PortraitDrop({ previewUrl, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before ua-cfg-ld-drop${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">👤</span>
      <p className="ua-cfg-tf-drop__label">Portrait</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove portrait photo" disabled={disabled} onClick={onRemove}>×</button>
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

function LeadershipViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  const photo = entry.imagePreview || entry.profileImage;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-ld-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="ld-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">{asCopyString(entry.badge) || DEFAULT_BADGE}</p>
            <h3 id="ld-view-title">{asCopyString(entry.name) || "Untitled leader"}</h3>
            <p>
              {asCopyString(entry.designation) || asCopyString(entry.title) || "—"}
              <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Hidden"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-ld-view__body">
          {photo ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
              <img src={photo} alt="" />
            </div>
          ) : (
            <div className="ua-cfg-rc-view__media"><div className="ua-cfg-rc-view__media-empty">No photo</div></div>
          )}
          {asCopyString(entry.message) ? <p className="ua-cfg-rc-view__copy">{asCopyString(entry.message)}</p> : null}
          <dl className="ua-cfg-rc-view__meta">
            <div>
              <dt>Web</dt>
              <dd>{entry.webVisible ? "Visible" : "Hidden"}</dd>
            </div>
            <div>
              <dt>App</dt>
              <dd>{entry.appVisible ? "Visible" : "Hidden"}</dd>
            </div>
          </dl>
        </div>
        <div className="ua-cfg-rc-view__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Close</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={() => { onClose(); onEdit(entry.id); }}>Edit note</button>
        </div>
      </div>
    </div>
  );
}

function NoteForm({
  draft,
  setDraft,
  titleOptions,
  busy,
  onSave,
  onCancel,
  onPickPhoto,
  saveLabel = "Save",
}) {
  const designationOptions = titleOptions.length
    ? titleOptions.map((label) => ({ value: label, label }))
    : [{ value: "", label: "Add titles in Configs → Dropdowns" }];

  return (
    <div className="ua-cfg-ld-new__grid">
      <div className="ua-cfg-ld-new__top">
        <PortraitDrop
          previewUrl={draft.imagePreview}
          disabled={busy}
          onPick={(file) => onPickPhoto?.(file)}
          onRemove={draft.imagePreview ? () => setDraft((prev) => {
            if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
            return { ...prev, imageFile: null, imagePreview: "" };
          }) : undefined}
        />
        <div className="ua-cfg-ld-new__meta">
          <label className="ua-cfg-ld-field">
            <span>Name</span>
            <input
              type="text"
              className="ua-cfg-vh-input"
              value={asCopyString(draft.name)}
              disabled={busy}
              placeholder="Leader name"
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="ua-cfg-ld-field">
            <span>Designation</span>
            <CfgSelect
              className="ua-cfg-ld-select"
              options={designationOptions}
              value={draft.designation || ""}
              disabled={busy || !titleOptions.length}
              ariaLabel="Designation"
              placeholder="Pick designation"
              onChange={(value) => setDraft((prev) => ({
                ...prev,
                designation: value,
                title: prev.title || value,
              }))}
            />
          </label>
          <label className="ua-cfg-ld-field">
            <span>Card title</span>
            <input
              type="text"
              className="ua-cfg-vh-input"
              value={asCopyString(draft.title)}
              disabled={busy}
              placeholder="Defaults to designation"
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="ua-cfg-ld-field">
            <span>Badge label</span>
            <input
              type="text"
              className="ua-cfg-vh-input"
              value={asCopyString(draft.badge)}
              disabled={busy}
              onChange={(event) => setDraft((prev) => ({ ...prev, badge: event.target.value }))}
            />
          </label>
        </div>
      </div>
      <div className="ua-cfg-bn-surfaces ua-cfg-ld-field--wide">
            <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${draft.webVisible ? " is-on" : ""}`}>
              <span>Web {draft.webVisible ? "Visible" : "Hidden"}</span>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${draft.webVisible ? " ua-toggle--on" : ""}`}
                aria-pressed={draft.webVisible}
                disabled={busy}
                onClick={() => setDraft((prev) => ({ ...prev, webVisible: !prev.webVisible }))}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>
            <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${draft.appVisible ? " is-on" : ""}`}>
              <span>App {draft.appVisible ? "Visible" : "Hidden"}</span>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${draft.appVisible ? " ua-toggle--on" : ""}`}
                aria-pressed={draft.appVisible}
                disabled={busy}
                onClick={() => setDraft((prev) => ({ ...prev, appVisible: !prev.appVisible }))}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>
      </div>
      <label className="ua-cfg-ld-field">
        <span>Message</span>
        <textarea
          className="ua-cfg-tf-story ua-cfg-ld-new__story"
          rows={5}
          value={asCopyString(draft.message)}
          disabled={busy}
          placeholder="Leadership message…"
          onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
        />
      </label>
      <div className="ua-cfg-ld-new__foot">
        {onCancel ? <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={onCancel}>Cancel</button> : null}
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={onSave}>{saveLabel}</button>
      </div>
    </div>
  );
}

export function DynamicLeadershipSection({ items, setItems, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [titleOptions, setTitleOptions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [cropPending, setCropPending] = useState(null);
  const coverInputRefs = useRef({});

  const loadTitles = useCallback(async () => {
    try {
      const list = await adminGetConfigDropdown(null, "leadership-title");
      const options = (list?.options || [])
        .filter((row) => row.on !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => row.label || row.value)
        .filter(Boolean);
      setTitleOptions(options);
    } catch {
      setTitleOptions([]);
    }
  }, []);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListLeadershipNotes(null, {
        page: nextPage,
        limit: PAGE_SIZE,
        search: query || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load leadership notes");
    } finally {
      setLoading(false);
    }
  }, [onToast, page, query, setItems]);

  useEffect(() => {
    loadTitles();
  }, [loadTitles]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    if (draft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(draft.imagePreview);
  }, [draft.imagePreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  function openPhotoCrop(file, target) {
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      file,
      previewUrl: URL.createObjectURL(file),
      target,
    });
  }

  function patchItem(id, patch) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCoverCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  async function confirmCoverCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const target = cropPending.target;
    closeCoverCrop();
    if (target === "draft") {
      setDraft((prev) => {
        if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
        return {
          ...prev,
          imageFile: croppedFile,
          imagePreview: URL.createObjectURL(croppedFile),
        };
      });
      onToast("Portrait attached");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateLeadershipNote(null, target, {}, { file: croppedFile });
      patchItem(target, saved);
      onToast("Portrait updated");
    } catch (error) {
      onToast(error?.message || "Could not update portrait");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.name.trim();
    const designation = draft.designation.trim();
    const message = draft.message.trim();
    if (!name || !designation || !message) {
      onToast("Add name, designation, and message");
      return;
    }
    if (!(draft.imageFile instanceof File)) {
      onToast("Add a portrait photo");
      return;
    }
    setBusy(true);
    try {
      await adminCreateLeadershipNote(null, {
        name,
        designation,
        title: draft.title.trim() || designation,
        badge: draft.badge.trim() || DEFAULT_BADGE,
        message,
        webVisible: draft.webVisible,
        appVisible: draft.appVisible,
        status: "active",
      }, { file: draft.imageFile });
      if (draft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(draft.imagePreview);
      setDraft({
        ...EMPTY_DRAFT,
        designation: titleOptions[0] || "",
        title: titleOptions[0] || "",
      });
      setCreating(false);
      setPage(1);
      onToast("Leadership note added");
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Could not add leadership note");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item) {
    const name = String(item.name || "").trim();
    const designation = String(item.designation || "").trim();
    const message = String(item.message || "").trim();
    if (!name || !designation || !message) {
      onToast("Add name, designation, and message");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateLeadershipNote(null, item.id, {
        name,
        designation,
        title: String(item.title || "").trim() || designation,
        badge: String(item.badge || "").trim() || DEFAULT_BADGE,
        message,
        webVisible: item.webVisible,
        appVisible: item.appVisible,
      });
      patchItem(item.id, saved);
      setEditingId(null);
      onToast("Leadership note saved");
    } catch (error) {
      onToast(error?.message || "Could not save leadership note");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateLeadershipNote(null, item.id, { live });
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
      const saved = await adminUpdateLeadershipNote(null, item.id, { [field]: next });
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
      await adminDeleteLeadershipNote(null, item.id);
      onToast("Leadership note deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete leadership note");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);
  const viewing = items.find((row) => row.id === viewingId) || null;
  const designationOptions = titleOptions.length
    ? titleOptions.map((label) => ({ value: label, label }))
    : [{ value: "", label: "Add titles in Configs → Dropdowns" }];

  return (
    <div className="ua-cfg-rc ua-cfg-ld">
      <Panel
        title="Leadership notes"
        subtitle={loading ? "Loading notes…" : `${pagination.total} total · ${liveCount} live on this page`}
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              const first = titleOptions[0] || "";
              setDraft({ ...EMPTY_DRAFT, designation: first, title: first });
            }}
          >
            + Add note
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-ld-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">✦</span> New leadership note</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <NoteForm
              draft={draft}
              setDraft={setDraft}
              titleOptions={titleOptions}
              busy={busy}
              saveLabel={busy ? "Saving…" : "Add note"}
              onCancel={() => setCreating(false)}
              onPickPhoto={(file) => openPhotoCrop(file, "draft")}
              onSave={addItem}
            />
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search name, role, or message"
            value={search}
            disabled={busy}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search leadership notes"
          />
        </div>

        {items.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const photo = item.profileImage;
              const updated = item.updatedAt ? formatRecipeDate(item.updatedAt) : "";
              return (
                <article key={item.id} className={`ua-cfg-rc-item ua-cfg-ld-item${item.live ? " is-live" : ""}${isEditing ? " is-editing" : ""}`}>
                  <div className="ua-cfg-rc-cover-wrap ua-cfg-ld-cover-wrap">
                    <button
                      type="button"
                      className={`ua-cfg-rc-cover ua-cfg-rc-cover--pick ua-cfg-ld-cover${photo ? " is-on" : ""}`}
                      disabled={busy}
                      aria-label={photo ? "Replace portrait photo" : "Add portrait photo"}
                      onClick={() => coverInputRefs.current[item.id]?.click()}
                    >
                      {photo ? <img className="ua-cfg-rc-cover__img" src={photo} alt="" /> : <span aria-hidden="true">👤</span>}
                      <em>{photo ? "Replace" : "Photo"}</em>
                    </button>
                    <input
                      ref={(node) => {
                        coverInputRefs.current[item.id] = node;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) openPhotoCrop(file, item.id);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-ld-item__head">
                      <div className="ua-cfg-ld-item__identity">
                        {isEditing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            value={asCopyString(item.name)}
                            disabled={busy}
                            placeholder="Name"
                            onChange={(event) => patchItem(item.id, { name: event.target.value })}
                          />
                        ) : (
                          <strong>{asCopyString(item.name) || "Untitled"}</strong>
                        )}
                        <div className="ua-cfg-ld-item__meta-row">
                          {isEditing ? (
                            <CfgSelect
                              className="ua-cfg-ld-select ua-cfg-select--sm"
                              options={designationOptions}
                              value={item.designation || ""}
                              disabled={busy || !titleOptions.length}
                              ariaLabel="Designation"
                              placeholder="Pick designation"
                              onChange={(value) => patchItem(item.id, {
                                designation: value,
                                title: item.title || value,
                              })}
                            />
                          ) : (
                            <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">
                              {asCopyString(item.designation) || asCopyString(item.title) || "No designation"}
                            </span>
                          )}
                          {isEditing || !updated ? null : (
                            <span className="ua-cfg-panel__sub">Updated {updated}</span>
                          )}
                        </div>
                      </div>
                      <div className="ua-cfg-ld-item__actions">
                        <div className="ua-cfg-ld-item__surfaces">
                          <div className="ua-cfg-ld-item__live">
                            <span className={`ua-cfg-faq__shown${item.webVisible ? " is-on" : ""}`}>
                              WEB
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${item.webVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={item.webVisible}
                              aria-label={item.webVisible ? "Hide on web" : "Show on web"}
                              disabled={busy}
                              onClick={() => toggleSurface(item, "webVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-ld-item__live">
                            <span className={`ua-cfg-faq__shown${item.appVisible ? " is-on" : ""}`}>
                              APP
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${item.appVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={item.appVisible}
                              aria-label={item.appVisible ? "Hide on app" : "Show on app"}
                              disabled={busy}
                              onClick={() => toggleSurface(item, "appVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-ld-item__live">
                            <span className={`ua-cfg-faq__shown${item.live ? " is-on" : ""}`}>
                              {item.live ? "LIVE" : "HIDDEN"}
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
                              aria-pressed={item.live}
                              aria-label={item.live ? "Hide note" : "Publish note"}
                              disabled={busy}
                              onClick={() => toggleLive(item)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-ld-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => setViewingId(item.id)}
                          >
                            View
                          </button>
                          {isEditing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveItem(item)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => { setEditingId(null); loadItems(); }}>Cancel</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={busy}
                              onClick={() => { setViewingId(null); setEditingId(item.id); setCreating(false); }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label={`Delete ${asCopyString(item.name) || "note"}`}
                            disabled={busy}
                            onClick={() => setPendingDelete(item)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                    {isEditing ? null : (
                      <p>{asCopyString(item.message)}</p>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="ua-cfg-ld-edit">
                      <label className="ua-cfg-ld-field">
                        <span>Card title</span>
                        <input
                          className="ua-cfg-vh-input"
                          value={asCopyString(item.title)}
                          disabled={busy}
                          placeholder="Card title (defaults to designation)"
                          onChange={(event) => patchItem(item.id, { title: event.target.value })}
                        />
                      </label>
                      <label className="ua-cfg-ld-field">
                        <span>Badge label</span>
                        <input
                          className="ua-cfg-vh-input"
                          value={asCopyString(item.badge) || DEFAULT_BADGE}
                          disabled={busy}
                          placeholder="Badge label"
                          onChange={(event) => patchItem(item.id, { badge: event.target.value })}
                        />
                      </label>
                      <label className="ua-cfg-ld-field ua-cfg-ld-field--wide">
                        <span>Message</span>
                        <textarea
                          className="ua-cfg-tf-story"
                          rows={4}
                          value={asCopyString(item.message)}
                          disabled={busy}
                          placeholder="Leadership message"
                          onChange={(event) => patchItem(item.id, { message: event.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading
              ? "Fetching leadership notes…"
              : query
                ? "No leadership notes match your search."
                : "No leadership notes yet. Add the first note from leadership."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Leadership notes pagination"
        />
      </Panel>

      <LeadershipViewModal
        entry={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(id) => { setViewingId(null); setEditingId(id); setCreating(false); }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Leadership note"
        title={`Delete ${asCopyString(pendingDelete?.name) || "this note"}?`}
        body="This permanently removes the leadership note and its portrait."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />

      {cropPending ? (
        <ImageCropModal
          open={Boolean(cropPending)}
          label="leadership portrait"
          file={cropPending.file}
          previewUrl={cropPending.previewUrl || ""}
          busy={busy}
          defaultRatio="Original"
          originalAspectCss="3 / 4"
          originalAspectNumber={3 / 4}
          onClose={closeCoverCrop}
          onConfirm={confirmCoverCrop}
        />
      ) : null}
    </div>
  );
}
