const DEFAULT_FLAGS = {
  forms_v2: true,
  lazy_routes: true,
  error_unify: true,
};

function readFlags() {
  try {
    const raw = localStorage.getItem("w24_flags");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeFlags(flags) {
  try {
    localStorage.setItem("w24_flags", JSON.stringify(flags));
  } catch {}
}

export function getFlag(name) {
  const user = readFlags();
  return (name in user ? user[name] : DEFAULT_FLAGS[name]) ?? false;
}

export function setFlag(name, value) {
  const user = readFlags();
  user[name] = !!value;
  writeFlags(user);
}

export function getAllFlags() {
  const user = readFlags();
  return { ...DEFAULT_FLAGS, ...user };
}