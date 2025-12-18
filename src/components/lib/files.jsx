export async function getRemoteFileSize(url) {
  if (!url) return null;
  try {
    // Try HEAD first
    const head = await fetch(url, { method: "HEAD" });
    const len = head.headers.get("content-length");
    if (len) {
      const n = parseInt(len, 10);
      return Number.isFinite(n) ? n : null;
    }
  } catch {
    // ignore and try range fallback
  }
  try {
    // Range request fallback (some CDNs)
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    const cr = res.headers.get("Content-Range"); // e.g., bytes 0-0/12345
    if (cr && cr.includes("/")) {
      const total = cr.split("/").pop();
      const n = parseInt(total, 10);
      return Number.isFinite(n) ? n : null;
    }
  } catch {
    // give up
  }
  return null;
}