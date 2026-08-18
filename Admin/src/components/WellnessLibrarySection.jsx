import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateWellnessLibraryItem,
  adminDeleteWellnessLibraryItem,
  adminListWellnessLibrary,
  adminPreviewYoutubeDuration,
  adminUpdateWellnessLibraryItem,
} from "../api/wellnessLibraryApi.js";
import {
  WELLNESS_LIBRARY_KINDS,
  WELLNESS_LIBRARY_PAGE_SIZE,
  WELLNESS_LIBRARY_TYPES,
  WELLNESS_VIDEO_ACCEPT,
  WELLNESS_VIDEO_MAX_MB,
  emptyWellnessDraft,
  isBareNumber,
  isValidDuration,
  isValidYoutubeUrl,
  readVideoFileDuration,
  resolveLibraryType,
  sanitizeTimeInput,
} from "../data/wellnessLibraryData.js";
import { ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";
const TIME_HINT = "Enter time as 5:12 (minutes:seconds), not a number";

function snapshotItem(item) {
  return {
    title: String(item?.title || "").trim(),
    type: resolveLibraryType(item?.type),
    ytLink: String(item?.ytLink || "").trim(),
    duration: String(item?.duration || "").trim(),
    status: item?.status === "inactive" ? "inactive" : "active",
    hasFile: Boolean(item?.hasFile),
  };
}

function sameSnapshot(a, b) {
  return (
    a.title === b.title &&
    a.type === b.type &&
    a.ytLink === b.ytLink &&
    a.duration === b.duration &&
    a.status === b.status
  );
}

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ImagePicker({ previewUrl, disabled, onPick, label = "Upload thumbnail" }) {
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      className={`ua-cfg-nb-thumb${previewUrl ? " has-image" : ""}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
    >
      {previewUrl ? <img src={previewUrl} alt="" /> : <span>+</span>}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onPick(file);
        }}
      />
    </button>
  );
}

function TypeSelect({ value, disabled, onChange, ariaLabel, className }) {
  const type = resolveLibraryType(value);
  return (
    <select
      className={className}
      value={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {type === "audio" ? <option value="audio">Audio</option> : null}
      {WELLNESS_LIBRARY_TYPES.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function VideoPicker({ label, fileName, disabled, onPick }) {
  const inputRef = useRef(null);
  return (
    <>
      <button
        type="button"
        className="ua-cfg-wl-file"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {fileName || label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={WELLNESS_VIDEO_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onPick(file);
        }}
      />
    </>
  );
}

function TimeInput({ value, disabled, detecting, onChange, onBlur, ariaLabel, className }) {
  return (
    <input
      type="text"
      className={className}
      value={detecting ? "" : value}
      placeholder={detecting ? "Detecting…" : "5:12"}
      disabled={disabled || detecting}
      aria-label={ariaLabel}
      autoComplete="off"
      onChange={(event) => onChange(sanitizeTimeInput(event.target.value))}
      onBlur={onBlur}
    />
  );
}

export function WellnessLibrarySection({ kind, onToast }) {
  const meta = WELLNESS_LIBRARY_KINDS[kind] || WELLNESS_LIBRARY_KINDS.mental;
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyWellnessDraft);
  const [draftThumb, setDraftThumb] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [draftVideo, setDraftVideo] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: WELLNESS_LIBRARY_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const savedRef = useRef({});
  const itemsRef = useRef(items);

  const rememberSaved = useCallback((rows) => {
    savedRef.current = Object.fromEntries((rows || []).map((row) => [row.id, snapshotItem(row)]));
  }, []);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListWellnessLibrary(kind, null, {
        page: nextPage,
        limit: WELLNESS_LIBRARY_PAGE_SIZE,
      });
      const next = rows || [];
      setItems(next);
      itemsRef.current = next;
      rememberSaved(next);
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || WELLNESS_LIBRARY_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || `Failed to load ${meta.title}`);
      setItems([]);
      itemsRef.current = [];
      rememberSaved([]);
      setPagination({ page: 1, limit: WELLNESS_LIBRARY_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [kind, meta.title, onToast, page, rememberSaved]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    if (draftPreview.startsWith("blob:")) URL.revokeObjectURL(draftPreview);
  }, [draftPreview]);

  function updateItem(id, patch) {
    setItems((prev) => {
      const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
      itemsRef.current = next;
      return next;
    });
  }

  function assertVideoFile(file) {
    if (!(file instanceof File)) return false;
    if (file.size > WELLNESS_VIDEO_MAX_MB * 1024 * 1024) {
      onToast(`Video must be ${WELLNESS_VIDEO_MAX_MB} MB or smaller`);
      return false;
    }
    return true;
  }

  function restoreTime(id, saved) {
    updateItem(id, { duration: saved.duration });
    onToast(TIME_HINT);
  }

  async function detectYoutubeTime(url) {
    if (!isValidYoutubeUrl(url)) return "";
    try {
      return (await adminPreviewYoutubeDuration(kind, url)) || "";
    } catch (error) {
      onToast(error?.message || "Could not detect video time from this YouTube link");
      return "";
    }
  }

  async function persistItem(id, fields, files, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateWellnessLibraryItem(kind, null, id, fields, files || {});
      if (!updated) throw new Error("Failed to save item");
      setItems((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry));
        itemsRef.current = next;
        return next;
      });
      savedRef.current[id] = snapshotItem(updated);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save item");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function commitItem(id) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.id || busy) return;
    const next = snapshotItem(item);
    const saved = savedRef.current[item.id] || next;

    if (!next.title) {
      updateItem(item.id, saved);
      onToast("Title is required");
      return;
    }

    if (next.duration && (isBareNumber(next.duration) || !isValidDuration(next.duration))) {
      restoreTime(item.id, saved);
      return;
    }

    if (next.type === "ytlink") {
      if (!isValidYoutubeUrl(next.ytLink)) {
        updateItem(item.id, saved);
        onToast("A valid YouTube URL is required");
        return;
      }
      if (!isValidDuration(next.duration)) {
        setDetecting(item.id);
        const detected = await detectYoutubeTime(next.ytLink);
        setDetecting("");
        if (!detected) {
          onToast(TIME_HINT);
          return;
        }
        next.duration = detected;
        updateItem(item.id, { duration: detected });
      }
    } else if (!item.hasFile) {
      onToast("Upload a video file");
      return;
    } else if (!isValidDuration(next.duration)) {
      onToast(TIME_HINT);
      return;
    }

    if (sameSnapshot(saved, next)) return;

    const ok = await persistItem(item.id, {
      title: next.title,
      type: next.type,
      ytLink: next.type === "ytlink" ? next.ytLink : "",
      duration: next.duration,
    });
    if (!ok) updateItem(item.id, saved);
  }

  async function changeType(item, type) {
    if (busy) return;
    const nextType = resolveLibraryType(type);
    if (nextType === item.type) return;

    if (nextType === "video" && !item.hasFile) {
      updateItem(item.id, { type: nextType, ytLink: "", duration: "" });
      onToast("Upload a video file");
      return;
    }

    if (nextType === "ytlink" && !isValidYoutubeUrl(item.ytLink)) {
      updateItem(item.id, { type: nextType, duration: item.duration });
      onToast("Paste a YouTube URL");
      return;
    }

    let duration = item.duration;
    if (nextType === "ytlink" && !isValidDuration(duration)) {
      setDetecting(item.id);
      duration = await detectYoutubeTime(item.ytLink);
      setDetecting("");
    }
    if (!isValidDuration(duration)) {
      updateItem(item.id, { type: nextType });
      onToast(TIME_HINT);
      return;
    }

    updateItem(item.id, { type: nextType, duration, ytLink: nextType === "ytlink" ? item.ytLink : "" });
    const ok = await persistItem(item.id, {
      type: nextType,
      ytLink: nextType === "ytlink" ? item.ytLink : "",
      duration,
    });
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function changeVideoFile(item, file) {
    if (!assertVideoFile(file) || busy) return;
    setDetecting(item.id);
    const duration = await readVideoFileDuration(file);
    setDetecting("");
    if (!isValidDuration(duration)) {
      updateItem(item.id, { type: "video", duration: "" });
      onToast("Could not detect video time. Enter time as 5:12");
      return;
    }
    updateItem(item.id, { type: "video", duration, ytLink: "" });
    const ok = await persistItem(
      item.id,
      { type: "video", duration, ytLink: "" },
      { videoFile: file },
      "Video updated",
    );
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    updateItem(item.id, { live, status: live ? "active" : "inactive" });
    const ok = await persistItem(item.id, { live });
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function changeImage(item, file) {
    if (!(file instanceof File) || busy) return;
    await persistItem(item.id, {}, { thumbnailFile: file }, "Thumbnail updated");
  }

  function pickDraftImage(file) {
    if (draftPreview.startsWith("blob:")) URL.revokeObjectURL(draftPreview);
    setDraftThumb(file instanceof File ? file : null);
    setDraftPreview(file instanceof File ? URL.createObjectURL(file) : "");
  }

  async function pickDraftVideo(file) {
    if (!assertVideoFile(file)) return;
    setDraftVideo(file);
    setDetecting("draft");
    const duration = await readVideoFileDuration(file);
    setDetecting("");
    setDraft((prev) => ({ ...prev, type: "video", duration: duration || "", ytLink: "" }));
    if (!duration) onToast("Could not detect video time. Enter time as 5:12");
  }

  async function detectDraftYoutube(url) {
    if (!isValidYoutubeUrl(url)) return;
    setDetecting("draft");
    const duration = await detectYoutubeTime(url);
    setDetecting("");
    if (duration) setDraft((prev) => ({ ...prev, duration }));
  }

  function changeDraftType(type) {
    const nextType = resolveLibraryType(type);
    setDraft((prev) => ({
      ...prev,
      type: nextType,
      duration: "",
      ytLink: nextType === "ytlink" ? prev.ytLink : "",
    }));
    if (nextType !== "video") setDraftVideo(null);
  }

  function commitDraftTime() {
    const raw = String(draft.duration || "").trim();
    if (!raw) return;
    if (isBareNumber(raw) || !isValidDuration(raw)) {
      setDraft((prev) => ({ ...prev, duration: "" }));
      onToast(TIME_HINT);
    }
  }

  async function addItem() {
    const title = draft.title.trim();
    const type = resolveLibraryType(draft.type);
    const ytLink = draft.ytLink.trim();
    let duration = draft.duration.trim();

    if (!title || !(draftThumb instanceof File)) {
      onToast("Title and thumbnail are required");
      return;
    }
    if (duration && (isBareNumber(duration) || !isValidDuration(duration))) {
      onToast(TIME_HINT);
      return;
    }

    if (type === "ytlink") {
      if (!isValidYoutubeUrl(ytLink)) {
        onToast("Paste a valid YouTube URL");
        return;
      }
      if (!isValidDuration(duration)) {
        setDetecting("draft");
        duration = await detectYoutubeTime(ytLink);
        setDetecting("");
        if (duration) setDraft((prev) => ({ ...prev, duration }));
      }
    } else if (!(draftVideo instanceof File)) {
      onToast("Upload a video file");
      return;
    }

    if (!isValidDuration(duration)) {
      onToast("Could not detect video time. Enter time as 5:12");
      return;
    }

    setBusy(true);
    try {
      const created = await adminCreateWellnessLibraryItem(
        kind,
        null,
        {
          title,
          type,
          ytLink: type === "ytlink" ? ytLink : "",
          duration,
          live: true,
        },
        {
          thumbnailFile: draftThumb,
          videoFile: type === "video" ? draftVideo : undefined,
        },
      );
      if (!created) throw new Error("Failed to add item");
      setDraft(emptyWellnessDraft());
      setDraftVideo(null);
      pickDraftImage(null);
      onToast(`${title} added to the library`);
      setPage(1);
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Failed to add item");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteWellnessLibraryItem(kind, null, item.id);
      onToast(`${item.title} removed`);
      const remaining = itemsRef.current.filter((entry) => entry.id !== item.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadItems(nextPage);
      } else {
        await loadItems(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  const locked = busy || loading;
  const liveCount = items.filter((entry) => entry.live).length;

  return (
    <>
      <Panel
        title={meta.title}
        subtitle={
          loading
            ? `Loading ${meta.title.toLowerCase()}…`
            : meta.subtitle
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-dp__count">
              {liveCount} live on this page · {pagination.total} in library
            </span>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching library from the server…</p>
        ) : items.length ? (
          <div className="ua-cfg-nb-table-wrap ua-cfg-wl-table-wrap">
            <table className="ua-cfg-nb-table ua-cfg-wl-table">
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Time</th>
                  <th>Live</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={item.live ? "" : "is-hidden"}>
                    <td>
                      <ImagePicker
                        previewUrl={item.thumbnail}
                        disabled={locked}
                        label={`Change thumbnail for ${item.title}`}
                        onPick={(file) => changeImage(item, file)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="ua-cfg-nb-table__name"
                        value={item.title}
                        disabled={locked}
                        aria-label={`Title for ${item.title}`}
                        onChange={(event) => updateItem(item.id, { title: event.target.value })}
                        onBlur={() => commitItem(item.id)}
                      />
                    </td>
                    <td>
                      <TypeSelect
                        className="ua-cfg-nb-table__unit ua-cfg-wl-table__type"
                        value={item.type}
                        disabled={locked}
                        ariaLabel={`Type for ${item.title}`}
                        onChange={(type) => changeType(item, type)}
                      />
                    </td>
                    <td>
                      {item.type === "video" ? (
                        <VideoPicker
                          label="Upload video"
                          fileName={item.hasFile ? "Replace video" : ""}
                          disabled={locked}
                          onPick={(file) => changeVideoFile(item, file)}
                        />
                      ) : (
                        <input
                          type="url"
                          className="ua-cfg-wl-table__link"
                          value={item.ytLink}
                          disabled={locked}
                          placeholder="YouTube URL"
                          aria-label={`YouTube URL for ${item.title}`}
                          onChange={(event) => updateItem(item.id, { ytLink: event.target.value, type: "ytlink" })}
                          onBlur={() => commitItem(item.id)}
                        />
                      )}
                    </td>
                    <td>
                      <TimeInput
                        className="ua-cfg-wl-table__time"
                        value={item.duration}
                        detecting={detecting === item.id}
                        disabled={locked}
                        ariaLabel={`Video time for ${item.title}`}
                        onChange={(duration) => updateItem(item.id, { duration })}
                        onBlur={() => commitItem(item.id)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
                        aria-pressed={item.live}
                        aria-label={`${item.live ? "Hide" : "Show"} ${item.title}`}
                        disabled={locked}
                        onClick={() => toggleLive(item)}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ua-cfg-icon-btn ua-cfg-nb-table__delete"
                        aria-label={`Remove ${item.title}`}
                        disabled={locked}
                        onClick={() => setPendingDelete(item)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No items in the library yet. Add one below.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={WELLNESS_LIBRARY_PAGE_SIZE}
            onPageChange={setPage}
            label={`${meta.title} pagination`}
          />
        ) : null}

        <div className="ua-cfg-nb-add ua-cfg-wl-add">
          <ImagePicker
            previewUrl={draftPreview}
            disabled={locked}
            label="Upload thumbnail"
            onPick={pickDraftImage}
          />
          <div className="ua-cfg-nb-add__fields">
            <input
              type="text"
              className="ua-cfg-nb-add__input"
              placeholder="Title"
              value={draft.title}
              disabled={locked}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <div className="ua-cfg-wl-add__meta">
              <TypeSelect
                className="ua-cfg-nb-add__input ua-cfg-nb-add__unit ua-cfg-wl-add__type"
                value={draft.type}
                disabled={locked}
                ariaLabel="Type"
                onChange={changeDraftType}
              />
              {draft.type === "video" ? (
                <VideoPicker
                  label="Upload video"
                  fileName={draftVideo?.name || ""}
                  disabled={locked}
                  onPick={pickDraftVideo}
                />
              ) : (
                <input
                  type="url"
                  className="ua-cfg-nb-add__input"
                  placeholder="YouTube URL"
                  value={draft.ytLink}
                  disabled={locked}
                  onChange={(event) => setDraft({ ...draft, ytLink: event.target.value })}
                  onBlur={() => detectDraftYoutube(draft.ytLink)}
                />
              )}
              <TimeInput
                className="ua-cfg-nb-add__input ua-cfg-wl-add__time"
                value={draft.duration}
                detecting={detecting === "draft"}
                disabled={locked}
                ariaLabel="Video time"
                onChange={(duration) => setDraft({ ...draft, duration })}
                onBlur={commitDraftTime}
              />
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addItem}>
                {meta.addLabel}
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={!!pendingDelete}
        tag={`Delete ${meta.noun}`}
        title={pendingDelete ? `Remove “${pendingDelete.title}”?` : ""}
        body="This permanently removes it from the private library. Assigned clients will no longer see it."
        cancelLabel="Keep item"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
