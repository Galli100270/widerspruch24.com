export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readIndex() {
  try {
    const raw = localStorage.getItem("w24_snapshot_index");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  try {
    localStorage.setItem("w24_snapshot_index", JSON.stringify(list.slice(0, 30))); // begrenze auf 30 Einträge
  } catch {}
}

export function saveSnapshot(label, extra = {}) {
  try {
    const key = `w24_snapshot_${label}`;
    const payload = {
      label,
      ts: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "",
      language: (typeof localStorage !== "undefined" && localStorage.getItem("widerspruch24_language")) || "de",
      guest_token: (typeof localStorage !== "undefined" && localStorage.getItem("w24_guest")) || null,
      session: (() => {
        const data = {};
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (!k) continue;
            if (k.startsWith("scan_progress_")) data[k] = sessionStorage.getItem(k);
          }
        } catch {}
        return data;
      })(),
      extra
    };
    localStorage.setItem(key, JSON.stringify(payload));
    const idx = readIndex();
    if (!idx.find((e) => e === label)) {
      idx.unshift(label);
      writeIndex(idx);
    }
    return true;
  } catch {
    return false;
  }
}

export function saveDailySnapshotOnce(extra = {}) {
  try {
    const today = getTodayKey();
    const key = `w24_snapshot_${today}`;
    if (!localStorage.getItem(key)) {
      saveSnapshot(today, extra);
    }
  } catch {}
}

export function listSnapshots() {
  return readIndex();
}

export function loadSnapshot(label) {
  try {
    const raw = localStorage.getItem(`w24_snapshot_${label}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}