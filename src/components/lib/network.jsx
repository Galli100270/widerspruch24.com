export async function callWithRetry(asyncFn, retries = 2, baseDelayMs = 300) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      return await asyncFn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}