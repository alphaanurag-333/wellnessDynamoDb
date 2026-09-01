import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateWellnessLibraryItem,
  adminDeleteWellnessLibraryItem,
  adminListWellnessLibrary,
  adminPreviewYoutubeDuration,
  adminUpdateWellnessLibraryItem,
} from "../api/wellnessLibraryApi.js";
import { youtubeEmbedUrl } from "../data/recipesConfigData.js";
import {
  WELLNESS_LIBRARY_KINDS,
  WELLNESS_LIBRARY_PAGE_SIZE,
  WELLNESS_LIBRARY_TYPES,
  WELLNESS_AUDIO_ACCEPT,
  WELLNESS_AUDIO_MAX_MB,
  WELLNESS_TITLE_MAX_LEN,
  WELLNESS_VIDEO_ACCEPT,
  WELLNESS_VIDEO_MAX_MB,
  displayTypeLabel,
  emptyWellnessDraft,
  isBareNumber,
  isValidDuration,
  isValidYoutubeUrl,
  readMediaFileDuration,
  resolveLibraryType,
  sanitizeTimeInput,
} from "../data/wellnessLibraryData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";
const TIME_HINT = "Enter time as 5:12 (minutes:seconds), not a number";
const SEARCH_DEBOUNCE_MS = 400;

function withYoutubeAutoplay(embedUrl) {
  if (!embedUrl) return "";
  try {
    const parsed = new URL(embedUrl);
    parsed.searchParams.set("autoplay", "1");
    return parsed.toString();
  } catch {
    return embedUrl.includes("?") ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
  }
}

/** Locked cover crop sizes by wellness library kind. */
const LIB_COVER_SPECS = {
  yoga: { width: 780, height: 420, label: "Thumbnail: 780x420", ratio: "780:420" },
  exercise: { width: 460, height: 195, label: "Cover: 460x195", ratio: "460:195" },
  mental: { width: 780, height: 342, label: "Thumbnail: 780x342", ratio: "780:342" },
};
const LIB_VIDEO_SIZE_LABEL = "1920x1080";
const LIB_COVER_CROP_KINDS = new Set(["yoga", "exercise", "mental"]);

function coverSpecForKind(kind) {
  return LIB_COVER_SPECS[kind] || LIB_COVER_SPECS.mental;
}

function CharHint({ value, max }) {
  const length = String(value || "").length;
  return (
    <span className={`ua-cfg-dd-char${length >= max ? " is-limit" : ""}`}>
      {length}/{max}
    </span>
  );
}

function clampTitle(raw) {
  return String(raw ?? "").slice(0, WELLNESS_TITLE_MAX_LEN);
}
const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "ytlink", label: "YouTube" },
  { value: "video", label: "Uploaded video" },
  { value: "audio", label: "Uploaded audio" },
];

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

function revokeBlobUrl(url) {
  if (url && String(url).startsWith("blob:")) URL.revokeObjectURL(url);
}

function LibraryViewModal({ entry, viewTag, itemNoun, coverAspect, onClose, onEdit }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
  }, [entry?.id]);

  if (!entry) return null;
  const type = resolveLibraryType(entry.type);
  const isVideo = type === "video";
  const isAudio = type === "audio";
  const embed = type === "ytlink" ? youtubeEmbedUrl(entry.ytLink) : "";
  const mediaSrc = isVideo || isAudio ? entry.fileUrl : "";
  const photo = entry.thumbnail;
  const hasPlayer = Boolean(embed || (isVideo && mediaSrc));
  const title = entry.title || `${itemNoun} video`;
  const showCover = Boolean(photo) && (!hasPlayer || !playing);
  const mediaStyle = coverAspect ? { aspectRatio: coverAspect } : undefined;

  return (
    <div className="ua-cp-modal-backdrop ua-cfg-lib-view-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-lib-view ua-cfg-recipes-view"
        style={coverAspect ? { "--ua-lib-cover-ratio": coverAspect } : undefined}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="library-view-title"
      >
        <div className="ua-cfg-rc-view__head">
          <div className="ua-cfg-recipes-view__intro">
            <p className="ua-cfg-rc-view__tag">{viewTag}</p>
            <h3 id="library-view-title">{entry.title || `Untitled ${itemNoun}`}</h3>
            <p className="ua-cfg-recipes-view__meta">
              <span>{displayTypeLabel(entry.type)}{entry.duration ? ` · ${entry.duration}` : ""}</span>
              <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
                {entry.live ? "Live" : "Hidden"}
              </span>
            </p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-recipes-view__body">
          {hasPlayer ? (
            <div className={`ua-cfg-rc-player${showCover ? " has-cover" : ""}`} style={mediaStyle}>
              {showCover ? (
                <button
                  type="button"
                  className="ua-cfg-rc-player__cover"
                  onClick={() => setPlaying(true)}
                  aria-label={`Play ${title}`}
                >
                  <img src={photo} alt="" />
                  <span className="ua-cfg-rc-player__play" aria-hidden="true">▶</span>
                </button>
              ) : null}
              {playing || !photo ? (
                embed ? (
                  <iframe
                    title={title}
                    src={playing && photo ? withYoutubeAutoplay(embed) : embed}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={mediaSrc}
                    poster={photo || undefined}
                    controls
                    playsInline
                    autoPlay={playing}
                    preload={photo ? "none" : "metadata"}
                  />
                )
              ) : null}
            </div>
          ) : photo ? (
            <div className="ua-cfg-rc-view__media ua-cfg-rc-view__media--photo" style={mediaStyle}>
              <img src={photo} alt="" />
            </div>
          ) : (
            <div className="ua-cfg-rc-view__media" style={mediaStyle}>
              <div className="ua-cfg-rc-view__media-empty">No cover</div>
            </div>
          )}
          {isAudio && mediaSrc ? (
            <audio className="ua-cfg-rc-view__player ua-cfg-lib-view__audio" src={mediaSrc} controls preload="metadata" />
          ) : null}
          <dl className="ua-cfg-rc-view__meta">
            <div>
              <dt>{isAudio ? "Audio" : isVideo ? "Video" : "YouTube"}</dt>
              <dd>
                {(isVideo || isAudio) && mediaSrc ? (
                  <a href={mediaSrc} target="_blank" rel="noreferrer">{mediaSrc}</a>
                ) : entry.ytLink ? (
                  <a href={entry.ytLink} target="_blank" rel="noreferrer">{entry.ytLink}</a>
                ) : "—"}
              </dd>
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
            Edit {itemNoun}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function CoverDrop({ previewUrl, disabled, label = "Cover photo", sizeLabel = "", onPick, onRemove }) {
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before ua-cfg-rc-dropbox${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      {!filled ? (
        <>
          <span className="ua-cfg-tf-drop__icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg></span>
          <p className="ua-cfg-tf-drop__label">{label}</p>
          {sizeLabel ? <span className="ua-cfg-lib-drop__size">{sizeLabel}</span> : null}
        </>
      ) : null}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => onPick?.()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove cover" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
    </div>
  );
}

function MediaDrop({ mode = "video", previewUrl, embedUrl, fileName, disabled, sizeLabel = "", onPick, onRemove }) {
  const isAudio = mode === "audio";
  const hasMedia = Boolean(previewUrl || embedUrl);
  const filled = hasMedia || Boolean(fileName);
  const label = isAudio ? "Audio file" : "Video file";

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--after ua-cfg-rc-dropbox${hasMedia ? " is-on" : ""}`}>
      {previewUrl && isAudio ? (
        <audio className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview" src={previewUrl} controls preload="metadata" />
      ) : previewUrl ? (
        <video className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview" src={previewUrl} controls playsInline preload="metadata" />
      ) : embedUrl ? (
        <iframe
          className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview"
          title="YouTube preview"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : null}
      {!hasMedia ? (
        <>
          <span className="ua-cfg-tf-drop__icon" aria-hidden="true">{isAudio ? "♪" : "▶"}</span>
          <p className="ua-cfg-tf-drop__label">{label}</p>
          {sizeLabel ? <span className="ua-cfg-lib-drop__size">{sizeLabel}</span> : null}
        </>
      ) : null}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => onPick?.()}
      >
        {previewUrl || fileName ? `Replace ${isAudio ? "audio" : "video"}` : `Upload ${isAudio ? "audio" : "video"}`}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label={`Remove ${isAudio ? "audio" : "video"}`} disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
    </div>
  );
}

function TimeInput({ value, disabled, detecting, onChange, onBlur, ariaLabel }) {
  return (
    <input
      type="text"
      className="ua-cfg-vh-input"
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
  const lockedCoverCrop = LIB_COVER_CROP_KINDS.has(kind);
  const coverSpec = coverSpecForKind(kind);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyWellnessDraft);
  const [draftThumb, setDraftThumb] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [draftVideo, setDraftVideo] = useState(null);
  const [draftVideoPreview, setDraftVideoPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [viewingId, setViewingId] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
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
  const [cropPending, setCropPending] = useState(null);
  const savedRef = useRef({});
  const itemsRef = useRef(items);
  const editFilesRef = useRef({});

  function openCoverCrop(file, target) {
    if (!file) return;
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
      pickDraftImage(croppedFile);
      onToast("Cover photo attached");
      return;
    }
    const item = target?.item;
    if (item?.id) {
      await changeImage(item, croppedFile);
    }
  }

  const { openPicker: openImagePicker, mediaPickerModal: imagePickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose cover photo",
    cropImages: !lockedCoverCrop,
    cropWidth: lockedCoverCrop ? coverSpec.width : undefined,
    cropHeight: lockedCoverCrop ? coverSpec.height : undefined,
    showFrameworks: false,
    sizeHint: lockedCoverCrop ? coverSpec.label : "",
    onFiles: (file, context) => {
      if (!file) return;
      if (lockedCoverCrop) {
        openCoverCrop(file, context);
        return;
      }
      if (context === "draft") pickDraftImage(file);
      else if (context?.item) changeImage(context.item, file);
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  const { openPicker: openVideoPicker, mediaPickerModal: videoPickerModal } = useMediaPicker({
    accept: "video",
    title: "Choose video",
    sizeHint: LIB_VIDEO_SIZE_LABEL,
    onFiles: (file, context) => {
      if (!file) return;
      if (context === "draft") pickDraftMedia(file, "video");
      else if (context?.item) pickEditMedia(context.item, file, "video");
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  const { openPicker: openAudioPicker, mediaPickerModal: audioPickerModal } = useMediaPicker({
    accept: "audio",
    title: "Choose audio",
    onFiles: (file, context) => {
      if (!file) return;
      if (context === "draft") pickDraftMedia(file, "audio");
      else if (context?.item) pickEditMedia(context.item, file, "audio");
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

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
        search,
        type: typeFilter || undefined,
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
  }, [kind, meta.title, onToast, page, rememberSaved, search, typeFilter]);

  useEffect(() => {
    setPage(1);
    setListQuery("");
    setSearch("");
    setTypeFilter("");
    setCreating(false);
    setEditingId("");
    setViewingId("");
    setDraft(emptyWellnessDraft());
    setDraftThumb(null);
    setDraftVideo(null);
    setDraftPreview((prev) => {
      revokeBlobUrl(prev);
      return "";
    });
    setDraftVideoPreview((prev) => {
      revokeBlobUrl(prev);
      return "";
    });
    setCropPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    editFilesRef.current = {};
  }, [kind]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = listQuery.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [listQuery]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    revokeBlobUrl(draftPreview);
    revokeBlobUrl(draftVideoPreview);
  }, [draftPreview, draftVideoPreview]);

  function updateItem(id, patch) {
    setItems((prev) => {
      const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
      itemsRef.current = next;
      return next;
    });
  }

  function assertMediaFile(file, type = "video") {
    if (!(file instanceof File)) return false;
    const isAudio = resolveLibraryType(type) === "audio";
    const maxMb = isAudio ? WELLNESS_AUDIO_MAX_MB : WELLNESS_VIDEO_MAX_MB;
    if (file.size > maxMb * 1024 * 1024) {
      onToast(`${isAudio ? "Audio" : "Video"} must be ${maxMb} MB or smaller`);
      return false;
    }
    return true;
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

  async function resolveDuration(item, next) {
    if (next.duration && (isBareNumber(next.duration) || !isValidDuration(next.duration))) {
      onToast(TIME_HINT);
      return "";
    }
    if (next.type === "ytlink") {
      if (!isValidYoutubeUrl(next.ytLink)) {
        onToast("A valid YouTube URL is required");
        return "";
      }
      if (isValidDuration(next.duration)) return next.duration;
      setDetecting(item.id);
      const detected = await detectYoutubeTime(next.ytLink);
      setDetecting("");
      if (!detected) {
        onToast(TIME_HINT);
        return "";
      }
      updateItem(item.id, { duration: detected });
      return detected;
    }
    const staged = editFilesRef.current[item.id]?.videoFile;
    if (!item.hasFile && !(staged instanceof File)) {
      onToast(next.type === "audio" ? "Upload an audio file" : "Upload a video file");
      return "";
    }
    if (isValidDuration(next.duration)) return next.duration;
    onToast(TIME_HINT);
    return "";
  }

  async function saveEditedItem(item) {
    if (!item?.id || busy) return;
    const next = snapshotItem(item);
    next.title = clampTitle(next.title);
    if (!next.title) {
      onToast("Title is required");
      return;
    }
    const duration = await resolveDuration(item, next);
    if (!duration) return;
    next.duration = duration;
    const staged = editFilesRef.current[item.id] || {};
    const files = {};
    if (staged.videoFile instanceof File) files.videoFile = staged.videoFile;
    const saved = savedRef.current[item.id] || next;
    if (sameSnapshot(saved, next) && !files.videoFile) {
      setEditingId("");
      return;
    }
    const ok = await persistItem(
      item.id,
      {
        title: next.title,
        type: next.type,
        ytLink: next.type === "ytlink" ? next.ytLink : "",
        duration: next.duration,
      },
      files,
      `${next.title} saved`,
    );
    if (ok) {
      delete editFilesRef.current[item.id];
      setEditingId("");
    } else {
      updateItem(item.id, saved);
    }
  }

  function cancelEdit(item) {
    const saved = savedRef.current[item.id];
    if (saved) updateItem(item.id, saved);
    delete editFilesRef.current[item.id];
    setEditingId("");
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
    await persistItem(item.id, {}, { thumbnailFile: file }, "Cover updated");
  }

  async function pickEditMedia(item, file, type = "video") {
    const mediaType = resolveLibraryType(type) === "audio" ? "audio" : "video";
    if (!assertMediaFile(file, mediaType) || busy) return;
    setDetecting(item.id);
    const duration = await readMediaFileDuration(file, mediaType);
    setDetecting("");
    editFilesRef.current[item.id] = { ...(editFilesRef.current[item.id] || {}), videoFile: file };
    updateItem(item.id, {
      type: mediaType,
      ytLink: "",
      duration: duration || item.duration,
      hasFile: true,
      fileUrl: URL.createObjectURL(file),
    });
    if (!duration) onToast(`Could not detect ${mediaType} time. Enter time as 5:12`);
  }

  function pickDraftImage(file) {
    revokeBlobUrl(draftPreview);
    setDraftThumb(file instanceof File ? file : null);
    setDraftPreview(file instanceof File ? URL.createObjectURL(file) : "");
  }

  async function pickDraftMedia(file, type = "video") {
    const mediaType = resolveLibraryType(type) === "audio" ? "audio" : "video";
    if (!assertMediaFile(file, mediaType)) return;
    revokeBlobUrl(draftVideoPreview);
    setDraftVideo(file);
    setDraftVideoPreview(URL.createObjectURL(file));
    setDetecting("draft");
    const duration = await readMediaFileDuration(file, mediaType);
    setDetecting("");
    setDraft((prev) => ({ ...prev, type: mediaType, duration: duration || "", ytLink: "" }));
    if (!duration) onToast(`Could not detect ${mediaType} time. Enter time as 5:12`);
  }

  function clearDraftVideo() {
    revokeBlobUrl(draftVideoPreview);
    setDraftVideo(null);
    setDraftVideoPreview("");
    setDraft((prev) => ({
      ...prev,
      type: prev.type === "audio" || prev.type === "video" ? "ytlink" : prev.type,
      duration: prev.ytLink ? prev.duration : "",
    }));
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
    if (nextType === "ytlink" || nextType === "video" || nextType === "audio") {
      revokeBlobUrl(draftVideoPreview);
      setDraftVideo(null);
      setDraftVideoPreview("");
    }
  }

  function commitDraftTime() {
    const raw = String(draft.duration || "").trim();
    if (!raw) return;
    if (isBareNumber(raw) || !isValidDuration(raw)) {
      setDraft((prev) => ({ ...prev, duration: "" }));
      onToast(TIME_HINT);
    }
  }

  function resetDraft() {
    revokeBlobUrl(draftPreview);
    revokeBlobUrl(draftVideoPreview);
    setDraft(emptyWellnessDraft());
    setDraftThumb(null);
    setDraftPreview("");
    setDraftVideo(null);
    setDraftVideoPreview("");
  }

  async function addItem() {
    const title = clampTitle(draft.title.trim());
    const type = resolveLibraryType(draft.type);
    const ytLink = draft.ytLink.trim();
    let duration = draft.duration.trim();

    if (!title || !(draftThumb instanceof File)) {
      onToast("Title and cover photo are required");
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
      onToast(type === "audio" ? "Upload an audio file" : "Upload a video file");
      return;
    }

    if (!isValidDuration(duration)) {
      onToast("Could not detect media time. Enter time as 5:12");
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
          videoFile: type === "video" || type === "audio" ? draftVideo : undefined,
        },
      );
      if (!created) throw new Error("Failed to add item");
      resetDraft();
      setCreating(false);
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
      if (editingId === item.id) setEditingId("");
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

  function clearFilters() {
    setListQuery("");
    setSearch("");
    setTypeFilter("");
    setPage(1);
  }

  const locked = busy || loading;
  const liveCount = items.filter((entry) => entry.live).length;
  const hasFilters = Boolean(search || typeFilter);

  return (
    <div
      className={`ua-cfg-rc ua-cfg-lib${lockedCoverCrop ? ` ua-cfg-lib--cover-locked ua-cfg-lib--cover-${coverSpec.width}x${coverSpec.height}` : ""}`}
      style={lockedCoverCrop ? { "--ua-lib-cover-ratio": `${coverSpec.width} / ${coverSpec.height}` } : undefined}
    >
      <Panel
        title={meta.title}
        subtitle={
          loading
            ? `Loading ${meta.title.toLowerCase()}…`
            : `${pagination.total || items.length} ${(pagination.total || items.length) === 1 ? meta.noun : meta.nouns} · ${liveCount} live on this page${hasFilters ? " · filtered" : ""}`
        }
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={locked}
            onClick={() => {
              setEditingId("");
              setCreating(true);
            }}
          >
            {meta.addLabel}
          </button>
        }
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-lib-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">{meta.emoji}</span> {meta.newLabel}</strong>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close"
                disabled={locked}
                onClick={() => {
                  resetDraft();
                  setCreating(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                <CoverDrop
                  previewUrl={draftPreview}
                  disabled={locked}
                  sizeLabel={lockedCoverCrop ? coverSpec.label : ""}
                  onPick={() => openImagePicker("draft")}
                  onRemove={() => pickDraftImage(null)}
                />
                <MediaDrop
                  mode={draft.type === "audio" ? "audio" : "video"}
                  previewUrl={draftVideoPreview}
                  embedUrl={draftVideo || draft.type === "audio" || draft.type === "video" ? "" : youtubeEmbedUrl(draft.ytLink)}
                  fileName={draftVideo?.name || ""}
                  disabled={locked}
                  sizeLabel={draft.type === "audio" ? "" : LIB_VIDEO_SIZE_LABEL}
                  onPick={() => {
                    if (draft.type === "audio") openAudioPicker("draft");
                    else openVideoPicker("draft");
                  }}
                  onRemove={clearDraftVideo}
                />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <label className="ua-cfg-rc-field">
                  <span className="ua-cfg-rc-field__head">
                    <span>Title</span>
                    <CharHint value={draft.title} max={WELLNESS_TITLE_MAX_LEN} />
                  </span>
                  <input
                    className="ua-cfg-vh-input"
                    placeholder="Title"
                    value={draft.title}
                    maxLength={WELLNESS_TITLE_MAX_LEN}
                    disabled={locked}
                    onChange={(event) => setDraft((prev) => ({
                      ...prev,
                      title: clampTitle(event.target.value),
                    }))}
                  />
                </label>
                <label className="ua-cfg-rc-field">
                  <span>Type</span>
                  <CfgSelect
                    className="ua-cfg-rc-select"
                    options={WELLNESS_LIBRARY_TYPES}
                    value={resolveLibraryType(draft.type)}
                    disabled={locked}
                    onChange={changeDraftType}
                    ariaLabel="Type"
                    placeholder="Choose type"
                  />
                </label>
                {draft.type === "ytlink" ? (
                  <label className="ua-cfg-rc-field ">
                    <span>YouTube link</span>
                    <input
                      className="ua-cfg-vh-input"
                      placeholder="https://youtube.com/…"
                      value={draft.ytLink}
                      disabled={locked}
                      onChange={(event) => setDraft((prev) => ({ ...prev, ytLink: event.target.value, type: "ytlink" }))}
                      onBlur={() => detectDraftYoutube(draft.ytLink)}
                    />
                  </label>
                ) : null}
                <label className="ua-cfg-rc-field">
                  <span>Time</span>
                  <TimeInput
                    value={draft.duration}
                    detecting={detecting === "draft"}
                    disabled={locked}
                    ariaLabel="Media time"
                    onChange={(duration) => setDraft((prev) => ({ ...prev, duration }))}
                    onBlur={commitDraftTime}
                  />
                </label>
                <div className="ua-cfg-rc-new__foot">
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addItem}>
                    {busy && creating ? "Saving…" : meta.addLabel.replace(/^\+\s*/, "Add ")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder={meta.search}
            value={listQuery}
            onChange={(event) => setListQuery(event.target.value)}
            aria-label={`Search ${meta.nouns}`}
          />
          <CfgSelect
            className="ua-cfg-rc-select ua-cfg-rc-filter"
            options={TYPE_FILTERS}
            value={typeFilter}
            disabled={locked}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            ariaLabel="Filter by type"
            placeholder="All types"
          />
          {hasFilters ? (
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching library from the server…</p>
        ) : items.length ? (
          <div className={`ua-cfg-rc-list${busy ? " is-loading" : ""}`}>
            {items.map((item) => {
              const editing = editingId === item.id;
              const stagedFile = editFilesRef.current[item.id]?.videoFile;
              return (
                <article
                  key={item.id}
                  className={`ua-cfg-rc-item ua-cfg-rc-item--lib ua-cfg-lib-item${editing ? " is-editing" : ""} is-video`}
                >
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className="ua-cfg-rc-cover is-video ua-cfg-rc-cover--pick"
                      disabled={locked}
                      onClick={() => openImagePicker({ item })}
                    >
                      {item.thumbnail ? (
                        <img className="ua-cfg-rc-cover__img" src={item.thumbnail} alt="" />
                      ) : (
                        <span aria-hidden="true">🖼</span>
                      )}
                      <em>{item.thumbnail ? "Replace" : "Cover"}</em>
                    </button>
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-rc-item__head">
                      <div className="ua-cfg-rc-item__identity">
                        {editing ? (
                          <div className="ua-cfg-rc-title-edit">
                            <input
                              className="ua-cfg-vh-input ua-cfg-rc-title"
                              value={item.title}
                              maxLength={WELLNESS_TITLE_MAX_LEN}
                              disabled={locked}
                              onChange={(event) => updateItem(item.id, { title: clampTitle(event.target.value) })}
                            />
                            <CharHint value={item.title} max={WELLNESS_TITLE_MAX_LEN} />
                          </div>
                        ) : (
                          <strong>{item.title}</strong>
                        )}
                        <div className="ua-cfg-rc-item__meta">
                          <span className={`ua-cfg-rc-pill ua-cfg-rc-pill--${item.type === "audio" ? "audio" : "video"}`}>
                            {displayTypeLabel(item.type)}
                          </span>
                          {item.duration ? (
                            <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">{item.duration}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="ua-cfg-rc-item__actions">
                        <div className="ua-cfg-rc-item__live">
                          <span className={`ua-cfg-faq__shown${item.live ? " is-on" : ""}`}>
                            {item.live ? "LIVE" : "HIDDEN"}
                          </span>
                          <button
                            type="button"
                            className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
                            aria-pressed={item.live}
                            aria-label={`${item.title} ${item.live ? "live" : "hidden"}`}
                            disabled={locked}
                            onClick={() => toggleLive(item)}
                          >
                            <span className="ua-toggle__knob" />
                          </button>
                        </div>
                        <div className="ua-cfg-rc-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={locked}
                            onClick={() => setViewingId(item.id)}
                          >
                            View
                          </button>
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={() => saveEditedItem(item)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={() => cancelEdit(item)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={locked}
                              onClick={() => {
                                setCreating(false);
                                setViewingId("");
                                setEditingId(item.id);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label={`Remove ${item.title}`}
                            disabled={locked}
                            onClick={() => setPendingDelete(item)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                    {editing ? (
                      <div className="ua-cfg-rc-edit">
                        <div className="ua-cfg-rc-edit__media">
                          <MediaDrop
                            mode={item.type === "audio" ? "audio" : "video"}
                            previewUrl={item.fileUrl || ""}
                            embedUrl={item.fileUrl || item.type === "audio" || item.type === "video" ? "" : youtubeEmbedUrl(item.ytLink)}
                            fileName={stagedFile?.name || (item.hasFile ? (item.type === "audio" ? "Uploaded audio" : "Uploaded video") : "")}
                            disabled={locked}
                            onPick={() => {
                              if (item.type === "audio") openAudioPicker({ item });
                              else openVideoPicker({ item });
                            }}
                            onRemove={() => {
                              delete editFilesRef.current[item.id];
                              updateItem(item.id, { type: "ytlink", fileUrl: "", hasFile: false });
                            }}
                          />
                          <div className="ua-cfg-rc-edit__side">
                            <label className="ua-cfg-rc-field">
                              <span>Type</span>
                              <CfgSelect
                                className="ua-cfg-rc-select"
                                options={WELLNESS_LIBRARY_TYPES}
                                value={resolveLibraryType(item.type)}
                                disabled={locked}
                                onChange={(type) => {
                                  const nextType = resolveLibraryType(type);
                                  updateItem(item.id, {
                                    type: nextType,
                                    ytLink: nextType === "ytlink" ? item.ytLink : "",
                                  });
                                }}
                                ariaLabel={`Type for ${item.title}`}
                                placeholder="Choose type"
                              />
                            </label>
                            {item.type === "ytlink" ? (
                              <input
                                className="ua-cfg-vh-input"
                                placeholder="YouTube link · youtube.com/watch?v=…"
                                value={item.ytLink}
                                disabled={locked}
                                onChange={(event) => updateItem(item.id, { ytLink: event.target.value, type: "ytlink" })}
                              />
                            ) : null}
                            <label className="ua-cfg-rc-field">
                              <span>Time</span>
                              <TimeInput
                                value={item.duration}
                                detecting={detecting === item.id}
                                disabled={locked}
                                ariaLabel={`Time for ${item.title}`}
                                onChange={(duration) => updateItem(item.id, { duration })}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      item.ytLink ? (
                        <a className="ua-cfg-rc-link" href={item.ytLink} target="_blank" rel="noreferrer">
                          {item.ytLink}
                        </a>
                      ) : null
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {hasFilters ? `No ${meta.nouns} match your search.` : `No ${meta.nouns} yet. Add one to start the library.`}
          </p>
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
      </Panel>

      <LibraryViewModal
        entry={items.find((row) => row.id === viewingId) || null}
        viewTag={meta.title}
        itemNoun={meta.noun}
        coverAspect={`${coverSpec.width} / ${coverSpec.height}`}
        onClose={() => setViewingId("")}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

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

      {lockedCoverCrop && cropPending ? (
        <ImageCropModal
          open={Boolean(cropPending)}
          label="cover"
          file={cropPending.file}
          previewUrl={cropPending.previewUrl || ""}
          busy={busy}
          defaultRatio={coverSpec.ratio}
          originalAspectCss={`${coverSpec.width} / ${coverSpec.height}`}
          originalAspectNumber={coverSpec.width / coverSpec.height}
          cropWidth={coverSpec.width}
          cropHeight={coverSpec.height}
          backdropClassName={`ua-cfg-lib-cover-crop-modal ua-cfg-lib-cover-crop-modal--${coverSpec.width}x${coverSpec.height}`}
          onClose={closeCoverCrop}
          onConfirm={confirmCoverCrop}
        />
      ) : null}

      {imagePickerModal}
      {videoPickerModal}
      {audioPickerModal}
    </div>
  );
}
