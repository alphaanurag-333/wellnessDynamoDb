function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image"));
    image.src = src;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function ratioNumber(ratio, fallback = 240 / 64) {
  if (!ratio || ratio === "Original") return fallback;
  const [w, h] = String(ratio).split(":").map(Number);
  if (!w || !h) return fallback;
  return w / h;
}

export function coverLayout(imageWidth, imageHeight, viewportWidth, viewportHeight, zoom = 1, pan = { x: 0, y: 0 }) {
  const cover = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const scale = cover * zoom;
  const renderedW = imageWidth * scale;
  const renderedH = imageHeight * scale;
  const maxX = Math.max(0, (renderedW - viewportWidth) / 2);
  const maxY = Math.max(0, (renderedH - viewportHeight) / 2);
  const x = clamp(pan.x, -maxX, maxX);
  const y = clamp(pan.y, -maxY, maxY);
  return {
    renderedW,
    renderedH,
    pan: { x, y },
    scale,
  };
}

export async function cropImageToFile(imageSrc, { viewportWidth, viewportHeight, zoom, pan, fileName, mimeType, outputWidth, outputHeight }) {
  const image = await loadImage(imageSrc);
  const layout = coverLayout(
    image.naturalWidth,
    image.naturalHeight,
    viewportWidth,
    viewportHeight,
    zoom,
    pan,
  );
  const left = (viewportWidth - layout.renderedW) / 2 + layout.pan.x;
  const top = (viewportHeight - layout.renderedH) / 2 + layout.pan.y;
  const sx = clamp((0 - left) / layout.scale, 0, image.naturalWidth);
  const sy = clamp((0 - top) / layout.scale, 0, image.naturalHeight);
  const sw = clamp(viewportWidth / layout.scale, 1, image.naturalWidth - sx);
  const sh = clamp(viewportHeight / layout.scale, 1, image.naturalHeight - sy);

  // Keep the selected source pixels. Locked outputWidth/Height only define the
  // crop aspect in the UI — forcing export down to that display size (e.g. 391×180)
  // softens images on retina and wide cards. Cap only very large uploads.
  const maxSide = 2400;
  const outScale = Math.min(1, maxSide / Math.max(sw, sh));
  let outW = Math.max(1, Math.round(sw * outScale));
  let outH = Math.max(1, Math.round(sh * outScale));

  // If the crop is smaller than the declared display size, keep source 1:1
  // (do not upscale — that also looks soft). Aspect already matches the lock.
  if (outputWidth && outputHeight && outW < outputWidth && outH < outputHeight) {
    outW = Math.max(1, Math.round(sw));
    outH = Math.max(1, Math.round(sh));
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

  const outputMime = mimeType === "image/png" || mimeType === "image/webp" ? mimeType : "image/jpeg";
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Crop failed"))),
      outputMime,
      outputMime === "image/jpeg" ? 0.95 : undefined,
    );
  });

  const baseName = String(fileName || "logo").replace(/\.[^.]+$/, "");
  const ext =
    outputMime === "image/png" ? "png" : outputMime === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${baseName}-cropped.${ext}`, {
    type: outputMime,
    lastModified: Date.now(),
  });
}
