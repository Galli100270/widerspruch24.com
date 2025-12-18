const errorBufferKey = "w24_error_buffer";
const formTelemetryKey = "w24_form_telemetry";

function pushError(evt) {
  const current = getErrorBuffer();
  current.push({
    ts: new Date().toISOString(),
    message: String(evt?.message || evt?.reason || evt),
    stack: evt?.error?.stack || evt?.reason?.stack || null,
    type: evt?.type || "error",
  });
  try {
    sessionStorage.setItem(errorBufferKey, JSON.stringify(current.slice(-200)));
  } catch {}
}

export function getErrorBuffer() {
  try {
    const raw = sessionStorage.getItem(errorBufferKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function initMonitoring() {
  if (window.__w24MonInit) return;
  window.__w24MonInit = true;

  const origConsoleError = console.error;
  console.error = (...args) => {
    try { pushError({ message: args.map(String).join(" "), type: "console.error" }); } catch {}
    origConsoleError(...args);
  };

  window.addEventListener("error", (e) => pushError(e));
  window.addEventListener("unhandledrejection", (e) => pushError(e));
}

export function recordFormEvent({ formId, field, stage, ok, code = null, extra = null }) {
  const payload = {
    ts: new Date().toISOString(),
    formId,
    field,
    stage,     // render_ok | input_ok | validate_ok | submit_ok | persist_ok
    ok: !!ok,
    code,
    extra,
  };
  try {
    const raw = sessionStorage.getItem(formTelemetryKey);
    const list = raw ? JSON.parse(raw) : [];
    list.push(payload);
    sessionStorage.setItem(formTelemetryKey, JSON.stringify(list.slice(-1000)));
  } catch {}
}

export function getFormTelemetry() {
  try {
    const raw = sessionStorage.getItem(formTelemetryKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearFormTelemetry() {
  try { sessionStorage.removeItem(formTelemetryKey); } catch {}
}