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

  let outW;
  let outH;
  if (outputWidth && outputHeight) {
    outW = Math.max(1, Math.round(outputWidth));
    outH = Math.max(1, Math.round(outputHeight));
  } else {
    const maxSide = 1200;
    const outScale = Math.min(1, maxSide / Math.max(sw, sh));
    outW = Math.max(1, Math.round(sw * outScale));
    outH = Math.max(1, Math.round(sh * outScale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

  const outputMime = mimeType === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Crop failed"))),
      outputMime,
      outputMime === "image/jpeg" ? 0.92 : undefined,
    );
  });

  const baseName = String(fileName || "logo").replace(/\.[^.]+$/, "");
  const ext = outputMime === "image/png" ? "png" : "jpg";
  return new File([blob], `${baseName}-cropped.${ext}`, {
    type: outputMime,
    lastModified: Date.now(),
  });
}
