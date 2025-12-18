
import { Case } from "@/entities/Case";

const CACHE_PREFIX = "w24_case_cache_";
const FRESH_MS = 5 * 60 * 1000; // 5 Minuten frisch

export function getCachedCase(caseId) {
  if (!caseId) return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + caseId);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.data || null;
  } catch {
    return null;
  }
}

function setCachedCase(caseId, data) {
  if (!caseId || !data) return;
  try {
    localStorage.setItem(
      CACHE_PREFIX + caseId,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

// Replace fetchCaseById to avoid Case.get (prevents 404 logs)
async function fetchCaseById(caseId) {
  if (!caseId) return null;

  // 1) Sofortigen Cache liefern (UI wird sofort befüllt)
  try {
    const cachedRaw = localStorage.getItem(CACHE_PREFIX + caseId);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.data) {
        // falls älter, im Hintergrund aktualisieren (fire-and-forget)
        if (!cached.ts || Date.now() - cached.ts > FRESH_MS) {
          // Hintergrund-Refresh (nicht awaited)
          (async () => {
            try {
              const fresh = await Case.filter({ id: caseId });
              if (Array.isArray(fresh) && fresh[0]) {
                setCachedCase(caseId, fresh[0]);
              }
            } catch { /* ignore */ }
          })();
        }
        return cached.data;
      }
    }
  } catch {
    // Cache-Leseprobleme ignorieren
  }

  // 2) Netzwerk: gezielt per filter
  try {
    const items = await Case.filter({ id: caseId });
    if (Array.isArray(items) && items.length > 0) {
      setCachedCase(caseId, items[0]);
      return items[0];
    }
  } catch {
    // ignore and continue
  }

  // 3) Fallback: list und lokal suchen (vermeidet 404)
  try {
    const all = await Case.list();
    const found = all.find((c) => c.id === caseId) || null;
    if (found) {
      setCachedCase(caseId, found);
      return found;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Ensures required fields (origin) are present on updates.
 * - If the record cannot be found (deleted or no access), returns null and skips update.
 * - baseCase is optional and can be passed to avoid extra fetch.
 */
export async function updateCaseSafe(caseId, patch, baseCase = null) {
  const existing = baseCase || (caseId ? await fetchCaseById(caseId) : null);
  if (!existing || !existing.id) {
    // Do not attempt update if record is not found (prevents 404)
    return null;
  }

  let origin = patch?.origin || existing?.origin;
  if (!origin) {
    origin = existing?.letter_id ? "letter" : "scanner";
  }

  const data = { ...patch, origin };
  const updated = await Case.update(existing.id, data);
  // Cache aktualisieren (optimistic)
  setCachedCase(existing.id, { ...existing, ...data, ...updated });
  return updated;
}

export { fetchCaseById };
