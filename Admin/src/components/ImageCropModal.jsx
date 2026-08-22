import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { coverLayout, cropImageToFile } from "../utils/cropImage.js";

const CROP_RATIOS = ["Original", "1:1", "4:5", "3:4", "4:3", "16:9"];

function cropAspectCss(ratio, originalAspectCss) {
  if (ratio === "Original") {
    return originalAspectCss && originalAspectCss !== "auto" ? originalAspectCss : undefined;
  }
  return ratio.replace(":", " / ");
}

export function ImageCropModal({
  open,
  label = "image",
  file,
  previewUrl: previewUrlProp = "",
  busy = false,
  defaultRatio = "Original",
  originalAspectCss = "16 / 9",
  originalAspectNumber = 16 / 9,
  onClose,
  onConfirm,
}) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [cropping, setCropping] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  useEffect(() => {
    if (!open || !file) {
      setLocalPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useEffect(() => {
    if (!open) return undefined;
    setRatio(defaultRatio);
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });
    setCropping(false);
    return undefined;
  }, [open, file, defaultRatio]);

  const previewUrl = localPreviewUrl || previewUrlProp;
  const zoomFactor = zoom / 100;
  const naturalAspectCss =
    imageSize.width && imageSize.height ? `${imageSize.width} / ${imageSize.height}` : originalAspectCss;
  const viewportAspectCss = cropAspectCss(ratio, naturalAspectCss);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!open || !viewport) return undefined;

    const updateSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [open, viewportAspectCss, imageSize.width, imageSize.height]);

  const layout =
    imageSize.width && viewportSize.width
      ? coverLayout(
          imageSize.width,
          imageSize.height,
          viewportSize.width,
          viewportSize.height,
          zoomFactor,
          pan,
        )
      : null;

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
              {label} · set the crop, ratio and zoom before it is attached
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
            style={viewportAspectCss ? { aspectRatio: viewportAspectCss } : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {previewUrl ? (
              <img
                key={previewUrl}
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
                style={
                  layout
                    ? {
                        width: layout.renderedW,
                        height: layout.renderedH,
                        left: (viewportSize.width - layout.renderedW) / 2 + layout.pan.x,
                        top: (viewportSize.height - layout.renderedH) / 2 + layout.pan.y,
                      }
                    : undefined
                }
              />
            ) : null}
            <span className="ua-cfg-mv-upload-modal__grid" aria-hidden="true" />
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
              setRatio(defaultRatio);
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
