function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function extensionFromMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function getCroppedImageFile(
  imageSrc,
  pixelCrop,
  outputWidth,
  outputHeight,
  originalFileName,
  originalMimeType = "image/jpeg"
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const outputMime = originalMimeType === "image/png" ? "image/png" : "image/jpeg";
  const quality = outputMime === "image/jpeg" ? 0.92 : undefined;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Crop failed"))),
      outputMime,
      quality
    );
  });

  const baseName = String(originalFileName || "image").replace(/\.[^.]+$/, "");
  const ext = extensionFromMime(outputMime);
  return new File([blob], `${baseName}-cropped.${ext}`, {
    type: outputMime,
    lastModified: Date.now(),
  });
}
