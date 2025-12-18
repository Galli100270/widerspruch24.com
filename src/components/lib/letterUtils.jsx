import { Letter } from "@/entities/Letter";

// Safe fetch by id without throwing 404s. Falls back to list search.
export async function fetchLetterById(letterId) {
  if (!letterId) return null;
  // Try targeted filter first
  try {
    const items = await Letter.filter({ id: letterId });
    if (Array.isArray(items) && items.length > 0) return items[0];
  } catch {
    // ignore and try list fallback
  }
  // Fallback: list all and find locally
  try {
    const all = await Letter.list();
    return all.find((l) => l.id === letterId) || null;
  } catch {
    return null;
  }
}