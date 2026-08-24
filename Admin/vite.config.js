import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function mimeFromFilename(filename) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

function imageDownloadProxy() {
  async function handle(req, res, next) {
    const rawUrl = String(req.url || "");
    if (!rawUrl.startsWith("/__image_download")) return next();
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end();
      return;
    }

    let target = "";
    let filename = "image.jpg";
    try {
      const parsed = new URL(rawUrl, "http://localhost");
      target = parsed.searchParams.get("url") || "";
      filename = parsed.searchParams.get("filename") || filename;
    } catch {
      res.statusCode = 400;
      res.end("Invalid request");
      return;
    }

    if (!isAllowedImageUrl(target)) {
      res.statusCode = 400;
      res.end("Invalid image url");
      return;
    }

    try {
      const upstream = await fetch(target, { redirect: "follow" });
      if (!upstream.ok) {
        res.statusCode = 502;
        res.end("Could not download image");
        return;
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      const type = upstream.headers.get("content-type") || mimeFromFilename(filename);
      const safeName = String(filename).replace(/[^\w.\-]+/g, "_");
      res.statusCode = 200;
      res.setHeader("Content-Type", type);
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Cache-Control", "no-store");
      res.end(buffer);
    } catch {
      res.statusCode = 502;
      res.end("Could not download image");
    }
  }

  return {
    name: "image-download-proxy",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  plugins: [react(), imageDownloadProxy()],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
});
