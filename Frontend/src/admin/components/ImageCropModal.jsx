import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImageFile } from "../../utils/cropImage.js";

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
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
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

  if (!open || !imageSrc) return null;

  const aspect = outputWidth / outputHeight;

  return (
    <div className="modal-overlay image-crop-modal" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--wide image-crop-modal__card">
        <h3 className="modal-card__title">{title}</h3>
        <p className="modal-card__subtitle">
          Drag to reposition and use the slider to zoom. Width {outputWidth}px × height {outputHeight}px.
        </p>
        <div className="image-crop-modal__crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid={false}
          />
        </div>
        <div className="image-crop-modal__zoom">
          <span className="image-crop-modal__zoom-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
          />
        </div>
        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={processing}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={handleConfirm} disabled={processing}>
            {processing ? "Cropping…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
