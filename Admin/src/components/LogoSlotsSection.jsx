import { useCallback, useEffect, useRef, useState } from "react";
import { getAppLogos, saveAppLogo } from "../api/logoApi.js";
import {
  createDefaultLogoSlots,
  LOGO_MAX_SIZE_MB,
  validateLogoFile,
} from "../data/logoConfigData.js";
import { coverLayout, cropImageToFile, ratioNumber } from "../utils/cropImage.js";

const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function originalAspectCss(slot) {
  if (slot?.field === "favicon") return "1 / 1";
  return "240 / 64";
}

function originalAspectNumber(slot) {
  if (slot?.field === "favicon") return 1;
  return 240 / 64;
}

function cropAspectCss(ratio, slot) {
  if (ratio === "Original") return originalAspectCss(slot);
  return ratio.replace(":", " / ");
}

function UploadConfirmModal({ open, slot, file, previewUrl, busy, onClose, onConfirm }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [ratio, setRatio] = useState("Original");
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setRatio("Original");
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setCropping(false);
    return undefined;
  }, [open, previewUrl]);

  const zoomFactor = zoom / 100;

  function clampPanTo(nextPan, nextZoom = zoomFactor) {
    const viewport = viewportRef.current;
    if (!viewport || !imageSize.width || !imageSize.height) return nextPan;
    return coverLayout(
      imageSize.width,
      imageSize.height,
      viewport.clientWidth,
      viewport.clientHeight,
      nextZoom,
      nextPan,
    ).pan;
  }

  function onPointerDown(event) {
    if (busy || cropping) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, pan };
  }

  function onPointerMove(event) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setPan(clampPanTo({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy }));
  }

  function endDrag(event) {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  async function confirmCrop() {
    const viewport = viewportRef.current;
    if (!viewport || !previewUrl || !file) return;
    setCropping(true);
    try {
      const cropped = await cropImageToFile(previewUrl, {
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        zoom: zoomFactor,
        pan,
        fileName: file.name,
        mimeType: file.type,
      });
      await onConfirm(cropped);
    } catch (error) {
      onConfirm(null, error);
    } finally {
      setCropping(false);
    }
  }

  if (!open) return null;
  const disabled = busy || cropping;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-mv-upload-modal ua-cfg-pt-upload-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="ua-cfg-mv-upload-modal__head">
          <div>
            <h3 className="ua-cfg-mv-upload-modal__title">
              <span aria-hidden="true">✂</span> Confirm upload
            </h3>
            <p className="ua-cfg-mv-upload-modal__sub">
              {slot?.title?.toLowerCase() ?? "logo"} · set the crop, ratio and zoom before it is attached
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ua-cfg-mv-upload-modal__ratios">
          {CROP_RATIOS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`}
              onClick={() => {
                setRatio(entry);
                setPan({ x: 0, y: 0 });
              }}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="ua-cfg-mv-upload-modal__crop">
          <div
            ref={viewportRef}
            className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-lg-crop-viewport"
            style={{ aspectRatio: cropAspectCss(ratio, slot) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {previewUrl ? (
              <img
                className="ua-cfg-lg-crop-preview"
                src={previewUrl}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  setImageSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomFactor})`,
                }}
              />
            ) : null}
            <span className="ua-cfg-mv-upload-modal__grid" aria-hidden="true" />
          </div>
        </div>

        <div className="ua-cfg-mv-upload-modal__frameworks">
          <span className="ua-cfg-mv-upload-modal__frameworks-label">How it will sit in your frameworks</span>
          <div
            className="ua-cfg-mv-upload-modal__frameworks-row"
            style={{ "--fw-ratio": String(ratioNumber(ratio, originalAspectNumber(slot))) }}
          >
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--web">
              <span>Web</span>
              <div />
            </div>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--app is-active">
              <span>App</span>
              <div />
            </div>
          </div>
        </div>

        <div className="ua-cfg-mv-upload-modal__zoom">
          <button
            type="button"
            className="ua-cfg-mv-upload-modal__zoom-btn"
            disabled={disabled}
            onClick={() => {
              const next = Math.max(50, zoom - 10);
              setZoom(next);
              setPan((current) => clampPanTo(current, next / 100));
            }}
          >
            −
          </button>
          <input
            type="range"
            min={50}
            max={150}
            value={zoom}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              setZoom(next);
              setPan((current) => clampPanTo(current, next / 100));
            }}
          />
          <button
            type="button"
            className="ua-cfg-mv-upload-modal__zoom-btn"
            disabled={disabled}
            onClick={() => {
              const next = Math.min(150, zoom + 10);
              setZoom(next);
              setPan((current) => clampPanTo(current, next / 100));
            }}
          >
            +
          </button>
          <span className="ua-cfg-mv-upload-modal__zoom-value">{zoom}%</span>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
            disabled={disabled}
            onClick={() => {
              setRatio("Original");
              setZoom(100);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>

        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={disabled}>
            Discard
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={confirmCrop} disabled={disabled}>
            {cropping ? "Cropping…" : "Confirm & attach"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoSlotCard({ slot, busy, onPick }) {
  const inputRef = useRef(null);

  return (
    <article className={`ua-cfg-lg-slot${slot.uploaded ? " is-filled" : ""}`}>
      <div className="ua-cfg-lg-slot__head">
        <div>
          <strong>{slot.title}</strong>
          <p>{slot.note}</p>
        </div>
        <span className="ua-cfg-lg-slot__size">{slot.size}</span>
      </div>
      <div className="ua-cfg-lg-slot__drop">
        {slot.uploaded ? (
          <>
            {slot.url ? (
              <img className="ua-cfg-lg-slot__thumb-img" src={slot.url} alt={slot.title} />
            ) : (
              <span className="ua-cfg-lg-slot__thumb" aria-hidden="true">IR</span>
            )}
            <div className="ua-cfg-lg-slot__actions">
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true">🏷</span> Upload
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.ico"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPick(slot, file);
          }}
        />
      </div>
    </article>
  );
}

export function LogoSlotsSection({ slots, setSlots, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [pending, setPending] = useState(null);
  const previewUrl = pending?.previewUrl || "";

  const loadLogos = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAppLogos();
      setSlots(next);
    } catch (error) {
      onToast(error?.message || "Failed to load logos");
      setSlots(createDefaultLogoSlots());
    } finally {
      setLoading(false);
    }
  }, [onToast, setSlots]);

  useEffect(() => {
    loadLogos();
  }, [loadLogos]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function closePending() {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  }

  function pickFile(slot, file) {
    const error = validateLogoFile(file);
    if (error) {
      onToast(error);
      return;
    }
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending({
      slot,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  async function confirmUpload(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!pending || !croppedFile) return;
    const { slot } = pending;
    setBusyId(slot.field);
    try {
      const next = await saveAppLogo(slot.field, croppedFile);
      setSlots(next);
      onToast(`${slot.title} attached`);
      closePending();
    } catch (err) {
      onToast(err?.message || "Failed to save logo");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Panel
        title="Logo slots"
        subtitle={
          loading
            ? "Loading logos…"
            : `Website, admin, and favicon logos from App Config. Images only, max ${LOGO_MAX_SIZE_MB} MB.`
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching logos from App Config…</p>
        ) : (
          <div className="ua-cfg-lg-grid">
            {slots.map((slot) => (
              <LogoSlotCard
                key={slot.id}
                slot={slot}
                busy={Boolean(busyId)}
                onPick={pickFile}
              />
            ))}
          </div>
        )}
      </Panel>

      <UploadConfirmModal
        open={Boolean(pending)}
        slot={pending?.slot}
        file={pending?.file}
        previewUrl={previewUrl}
        busy={Boolean(busyId)}
        onClose={closePending}
        onConfirm={confirmUpload}
      />
    </>
  );
}
