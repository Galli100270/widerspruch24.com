export function trackEvent(name, props = {}) {
  try {
    // non-PII only
    const safe = {
      name,
      props,
      ts: new Date().toISOString()
    };
    // Send to console for now; can be extended to backend later
     
    console.log('[analytics]', JSON.stringify(safe));
  } catch {
    // ignore
  }
}