import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateProgramTestimonial,
  adminDeleteProgramTestimonial,
  adminListProgramTestimonials,
  adminUpdateProgramTestimonial,
} from "../api/programTestimonialApi.js";
import {
  adminListHealthConcerns,
} from "../api/healthConcernApi.js";
import {
  mapHealthConcernOptions,
  programTestimonialLabel,
  resolveProgramSelectValue,
} from "../data/programTestimonialsConfigData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";

const PAGE_SIZE = 20;

const EMPTY_DRAFT = {
  name: "",
  program: "",
  description: "",
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

function CoverDrop({ previewUrl, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--after ua-cfg-pt-drop${filled ? " is-on" : ""}`}>
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

function ProgramSelect({ options, value, disabled, onChange }) {
  const selected = resolveProgramSelectValue(value, options);
  const known = options.some((entry) => entry.value === selected);
  const extra = !known && value ? [{ value, label: programTestimonialLabel(value, options) }] : [];
  return (
    <CfgSelect
      className="ua-cfg-pt-select"
      options={options.length ? [...extra, ...options] : [{ value: "", label: "No health concerns" }]}
      value={known ? selected : value || ""}
      disabled={disabled || !options.length}
      ariaLabel="Health concern"
      placeholder="Health concern"
      onChange={onChange}
    />
  );
}

function TestimonialViewModal({ entry, options, onClose, onEdit }) {
  if (!entry) return null;
  const photo = entry.imagePreview || entry.profileImage;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-pt-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="pt-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Program testimonial</p>
            <h3 id="pt-view-title">{entry.name || "Untitled client"}</h3>
            <p>
              {programTestimonialLabel(entry.program, options) || "Uncategorized"}
              <span className={`ua-cfg-pt-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Hidden"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-pt-view__body">
          <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo">
            {photo ? <img src={photo} alt="" /> : <div className="ua-cfg-rc-view__media-empty">No photo</div>}
          </div>
          {entry.description ? <p className="ua-cfg-rc-view__copy">{entry.description}</p> : null}
          <dl className="ua-cfg-rc-view__meta">
            <div>
              <dt>Health concern</dt>
              <dd>{programTestimonialLabel(entry.program, options) || "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{entry.live ? "Live" : "Hidden"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatRecipeDate(entry.createdAt)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatRecipeDate(entry.updatedAt)}</dd>
            </div>
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

export function DynamicProgramTestimonialsSection({ stories, setStories, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const [concernOptions, setConcernOptions] = useState([]);
  const coverInputRefs = useRef({});

  const viewing = stories.find((entry) => entry.id === viewingId) || null;
  const hasFilters = Boolean(query || programFilter);

  const loadConcerns = useCallback(async () => {
    try {
      const { healthConcerns } = await adminListHealthConcerns(null, {
        page: 1,
        limit: 200,
        status: "active",
      });
      const options = mapHealthConcernOptions(healthConcerns);
      setConcernOptions(options);
      setDraft((prev) => ({
        ...prev,
        program: prev.program || options[0]?.value || "",
      }));
    } catch (error) {
      setConcernOptions([]);
      onToast(error?.message || "Could not load health concerns");
    }
  }, [onToast]);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListProgramTestimonials(null, {
        page: nextPage,
        limit: PAGE_SIZE,
        type: programFilter || undefined,
        search: query || undefined,
      });
      const next = result.items || [];
      setStories(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setStories([]);
      onToast(error?.message || "Could not load program testimonials");
    } finally {
      setLoading(false);
    }
  }, [onToast, page, programFilter, query, setStories]);

  useEffect(() => {
    loadConcerns();
  }, [loadConcerns]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [programFilter, query]);

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
    setStories((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCoverCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCoverCrop(file, target) {
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

  function pickDraftPhoto(file) {
    openCoverCrop(file, "draft");
  }

  function clearDraftPhoto() {
    setDraft((prev) => {
      if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
      return { ...prev, imageFile: null, imagePreview: "" };
    });
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
      onToast("Client photo attached");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateProgramTestimonial(null, target, {}, croppedFile);
      patchItem(target, { ...saved, imagePreview: "" });
      onToast("Client photo updated");
    } catch (error) {
      onToast(error?.message || "Could not update the client photo");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.name.trim();
    const description = draft.description.trim();
    const program = String(draft.program || "").trim();
    if (!name || !description) {
      onToast("Add the client name and testimonial");
      return;
    }
    if (!program) {
      onToast("Pick a health concern from Configs → Dropdowns");
      return;
    }
    if (!(draft.imageFile instanceof File)) {
      onToast("Add a client photo");
      return;
    }
    setBusy(true);
    try {
      await adminCreateProgramTestimonial(null, {
        name,
        description,
        type: program,
        status: "active",
      }, draft.imageFile);
      clearDraftPhoto();
      setDraft({ ...EMPTY_DRAFT, program: concernOptions[0]?.value || "" });
      setCreating(false);
      setPage(1);
      onToast("Program testimonial added");
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Could not add program testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item) {
    const name = String(item.name || "").trim();
    const description = String(item.description || "").trim();
    if (!name || !description) {
      onToast("Add the client name and testimonial");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateProgramTestimonial(null, item.id, {
        name,
        description,
        type: item.program,
      });
      patchItem(item.id, saved);
      setEditingId(null);
      onToast("Program testimonial saved");
    } catch (error) {
      onToast(error?.message || "Could not save program testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function replacePhoto(id, file) {
    openCoverCrop(file, id);
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateProgramTestimonial(null, item.id, { live });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { live: item.live, status: item.status });
      onToast(error?.message || "Could not update visibility");
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteProgramTestimonial(null, item.id);
      onToast("Program testimonial deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete program testimonial");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => stories.filter((row) => row.live).length, [stories]);

  return (
    <div className="ua-cfg-pt">
      <Panel
        title="Program testimonials"
        subtitle={loading ? "Loading testimonials…" : `${pagination.total} total · ${liveCount} live on this page`}
        actions={(
          <button
            type="button"
            className="ua-cfg-rc-add ua-cfg-pt-add"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setDraft({ ...EMPTY_DRAFT, program: concernOptions[0]?.value || "" });
            }}
          >
            + Add testimonial
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">💬</span> New testimonial</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                <CoverDrop
                  previewUrl={draft.imagePreview}
                  disabled={busy}
                  onPick={pickDraftPhoto}
                  onRemove={clearDraftPhoto}
                />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <label className="ua-cfg-pt-field">
                  <span>Health concern</span>
                  <ProgramSelect
                    options={concernOptions}
                    value={draft.program}
                    disabled={busy}
                    onChange={(value) => setDraft((prev) => ({ ...prev, program: value }))}
                  />
                </label>
                {!concernOptions.length ? (
                  <p className="ua-cfg-panel__sub">Add health concerns in Configs → Dropdowns first.</p>
                ) : null}
                <label className="ua-cfg-pt-field">
                  <span>Client name</span>
                  <input
                    className="ua-cfg-vh-input"
                    placeholder="e.g. Vikram Singh"
                    value={draft.name}
                    disabled={busy}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
              </div>
              <label className="ua-cfg-pt-field ua-cfg-pt-field--wide">
                <span>Success story</span>
                <textarea
                  className="ua-cfg-tf-story ua-cfg-pt-new-story"
                  rows={4}
                  placeholder="Client success story…"
                  value={draft.description}
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <div className="ua-cfg-pt-new-foot">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-pt-new-submit" disabled={busy} onClick={addItem}>
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
            placeholder="Search by client name or story…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search testimonials"
          />
          <CfgSelect
            className="ua-cfg-select--filter"
            options={[{ value: "", label: "All health concerns" }, ...concernOptions]}
            value={programFilter}
            onChange={setProgramFilter}
            ariaLabel="Filter by health concern"
          />
        </div>

        {stories.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {stories.map((entry) => {
              const isEditing = editingId === entry.id;
              const photo = entry.imagePreview || entry.profileImage;
              return (
                <article key={entry.id} className={`ua-cfg-rc-item ua-cfg-pt-item${isEditing ? " is-editing" : ""}`}>
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className={`ua-cfg-rc-cover ua-cfg-rc-cover--pick${photo ? " is-on" : ""}`}
                      disabled={busy}
                      aria-label={photo ? "Replace client photo" : "Add client photo"}
                      onClick={() => coverInputRefs.current[entry.id]?.click()}
                    >
                      {photo ? (
                        <img className="ua-cfg-rc-cover__img" src={photo} alt="" />
                      ) : (
                        <span aria-hidden="true">📷</span>
                      )}
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
                        if (file) replacePhoto(entry.id, file);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-pt-item__body">
                    <div className="ua-cfg-pt-item__head">
                      <div className="ua-cfg-pt-item__identity">
                        {isEditing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            placeholder="Client name"
                            value={entry.name}
                            disabled={busy}
                            onChange={(event) => patchItem(entry.id, { name: event.target.value })}
                          />
                        ) : (
                          <strong>{entry.name}</strong>
                        )}
                        {isEditing ? null : (
                          <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">
                            {programTestimonialLabel(entry.program, concernOptions)}
                          </span>
                        )}
                      </div>
                      <div className="ua-cfg-pt-item__actions">
                        <div className="ua-cfg-pt-item__live">
                          <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                            {entry.live ? "LIVE" : "HIDDEN"}
                          </span>
                          <button
                            type="button"
                            className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                            aria-pressed={entry.live}
                            disabled={busy}
                            onClick={() => toggleLive(entry)}
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                        </div>
                        <div className="ua-cfg-pt-item__btns">
                          {isEditing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveItem(entry)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => { setEditingId(null); loadItems(); }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={() => setViewingId(entry.id)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={() => { setViewingId(null); setEditingId(entry.id); setCreating(false); }}
                              >
                                Edit
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label={`Delete ${entry.name}`}
                            disabled={busy}
                            onClick={() => setPendingDelete(entry)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="ua-cfg-pt-item__edit">
                        <label className="ua-cfg-pt-field">
                          <span>Health concern</span>
                          <ProgramSelect
                            options={concernOptions}
                            value={entry.program}
                            disabled={busy}
                            onChange={(value) => patchItem(entry.id, { program: value })}
                          />
                        </label>
                        <label className="ua-cfg-pt-field">
                          <span>Success story</span>
                          <textarea
                            className="ua-cfg-tf-story ua-cfg-pt-new-story"
                            rows={4}
                            placeholder="Client success story…"
                            value={entry.description}
                            disabled={busy}
                            onChange={(event) => patchItem(entry.id, { description: event.target.value })}
                          />
                        </label>
                      </div>
                    ) : (
                      <p>{entry.description}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading
              ? "Fetching testimonials…"
              : hasFilters
                ? "No testimonials match your search."
                : "No testimonials yet."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Program testimonial pagination"
        />
      </Panel>

      <TestimonialViewModal
        entry={viewing}
        options={concernOptions}
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
        onClose={closeCoverCrop}
        onConfirm={confirmCoverCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Program testimonial"
        title={`Delete ${pendingDelete?.name || "this testimonial"}?`}
        body="This permanently removes the testimonial and its uploaded image."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
