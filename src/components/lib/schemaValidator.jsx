import { Case } from "@/entities/Case";
import { Letter } from "@/entities/Letter";

// Minimal-Validator: required + type-check
export function validateAgainstSchema(schema, data) {
  const errors = [];

  // required
  const required = Array.isArray(schema.required) ? schema.required : [];
  required.forEach((key) => {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      errors.push({ path: key, code: "required", message: `Feld "${key}" ist erforderlich.` });
    }
  });

  // type checks (shallow)
  const props = schema.properties || {};
  Object.keys(props).forEach((key) => {
    if (data[key] === undefined || data[key] === null) return;
    const def = props[key];
    const t = def.type;
    if (t === "string" && typeof data[key] !== "string") {
      errors.push({ path: key, code: "type_string", message: `Feld "${key}" muss Text sein.` });
    }
    if (t === "number" && typeof data[key] !== "number") {
      errors.push({ path: key, code: "type_number", message: `Feld "${key}" muss eine Zahl sein.` });
    }
    if (t === "integer" && !Number.isInteger(data[key])) {
      errors.push({ path: key, code: "type_integer", message: `Feld "${key}" muss eine ganze Zahl sein.` });
    }
    if (t === "boolean" && typeof data[key] !== "boolean") {
      errors.push({ path: key, code: "type_boolean", message: `Feld "${key}" muss Ja/Nein sein.` });
    }
    if (t === "array" && !Array.isArray(data[key])) {
      errors.push({ path: key, code: "type_array", message: `Feld "${key}" muss eine Liste sein.` });
    }
    if (t === "object" && typeof data[key] !== "object") {
      errors.push({ path: key, code: "type_object", message: `Feld "${key}" muss ein Objekt sein.` });
    }
  });

  return errors;
}

export async function getEntitySchema(entityName) {
  if (entityName === "Case" && typeof Case.schema === "function") return Case.schema();
  if (entityName === "Letter" && typeof Letter.schema === "function") return Letter.schema();
  return null;
}

export async function validateEntityData(entityName, data) {
  const schema = await getEntitySchema(entityName);
  if (!schema) return [];
  return validateAgainstSchema(schema, data);
}