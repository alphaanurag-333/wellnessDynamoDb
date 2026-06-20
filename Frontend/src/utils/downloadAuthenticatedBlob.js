export async function downloadAuthenticatedBlob(client, url, filename, { mimeType = "application/pdf" } = {}) {
  const cacheBust = url.includes("?") ? `&_=${Date.now()}` : `?_=${Date.now()}`;
  const { data } = await client.get(`${url}${cacheBust}`, { responseType: "blob" });
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
