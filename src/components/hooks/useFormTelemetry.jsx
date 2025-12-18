import { useEffect } from "react";
import { recordFormEvent } from "@/components/lib/monitoring";

export function useFormTelemetry(formId, fields = []) {
  useEffect(() => {
    // mark render ok for fields
    fields.forEach((f) => recordFormEvent({ formId, field: f, stage: "render_ok", ok: true }));
  }, [formId, fields]);

  const mark = ({ field, stage, ok, code = null, extra = null }) =>
    recordFormEvent({ formId, field, stage, ok, code, extra });

  return { mark };
}