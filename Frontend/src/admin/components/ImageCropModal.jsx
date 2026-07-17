import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { getCroppedImageFile } from "../../utils/cropImage.js";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function clampZoom(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}

/** Custom zoom slider — native range drag often breaks under react-easy-crop re-renders. */
function CropZoomSlider({ value, onChange, disabled = false }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  const ratio = (clampZoom(value) - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);

  const valueFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return value;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return clampZoom(ZOOM_MIN + t * (ZOOM_MAX - ZOOM_MIN));
  };

  const startDrag = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromClientX(e.clientX));
  };

  const moveDrag = (e) => {
    if (!draggingRef.current || disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(valueFromClientX(e.clientX));
  };

  const endDrag = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const nudge = (delta) => {
    if (disabled) return;
    onChange(clampZoom(value + delta));
  };

  return (
    <div className="image-crop-zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        className="image-crop-zoom__btn"
        onClick={() => nudge(-0.1)}
        disabled={disabled || value <= ZOOM_MIN}
        aria-label="Zoom out"
      >
        −
      </button>
      <div
        ref={trackRef}
        className="image-crop-zoom__track"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={ZOOM_MIN}
        aria-valuemax={ZOOM_MAX}
        aria-valuenow={Number(clampZoom(value).toFixed(2))}
        aria-valuetext={`${Math.round(ratio * 100)}%`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            nudge(-0.05);
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            nudge(0.05);
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(ZOOM_MIN);
          } else if (e.key === "End") {
            e.preventDefault();
            onChange(ZOOM_MAX);
          }
        }}
      >
        <div className="image-crop-zoom__fill" style={{ width: `${ratio * 100}%` }} />
        <div className="image-crop-zoom__thumb" style={{ left: `${ratio * 100}%` }} />
      </div>
      <button
        type="button"
        className="image-crop-zoom__btn"
        onClick={() => nudge(0.1)}
        disabled={disabled || value >= ZOOM_MAX}
        aria-label="Zoom in"
      >
        +
      </button>
      <span className="image-crop-zoom__pct">{Math.round(((clampZoom(value) - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100)}%</span>
    </div>
  );
}

export function ImageCropModal({
  open,
  title = "Crop image",
  imageSrc,
  outputWidth,
  outputHeight,
  originalFileName = "image.jpg",
  originalMimeType = "image/jpeg",
  onCancel,
  onConfirm,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setCrop({ x: 0, y: 0 });
    setZoom(ZOOM_MIN);
    setCroppedAreaPixels(null);
    setProcessing(false);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // Reset only when modal opens / image changes — not on every parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const setZoomSafe = useCallback((value) => {
    setZoom(clampZoom(value));
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        originalFileName,
        originalMimeType
      );
      onConfirm(file);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !imageSrc || typeof document === "undefined") return null;

  const aspect = outputWidth / outputHeight;

  const modal = (
    <div
      className="modal-overlay image-crop-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !processing) onCancel();
      }}
    >
      <div
        className="modal-card modal-card--wide image-crop-modal__card"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="image-crop-modal__head">
          <h3 id="image-crop-modal-title" className="modal-card__title">
            {title}
          </h3>
          <p className="modal-card__subtitle">
            Drag to reposition · use − / + or the bar to zoom · {outputWidth}×{outputHeight}px
          </p>
        </header>

        <div
          className="image-crop-modal__crop-area"
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setZoomSafe(zoom + (e.deltaY > 0 ? -0.1 : 0.1));
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoomSafe}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
            zoomWithScroll={false}
          />
        </div>

        <CropZoomSlider value={zoom} onChange={setZoomSafe} disabled={processing} />

        <div className="modal-card__actions image-crop-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={processing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? "Cropping…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
