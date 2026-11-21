export function toPlain(value) {
  if (!value) return value ?? null;

  if (Array.isArray(value)) return value.map(toPlain);

  const source = typeof value.toObject === "function" ? value.toObject() : value;

  if (source === null || typeof source !== "object") return source;
  if (source instanceof Date) return source.toISOString();

  const output = {};
  for (const [key, raw] of Object.entries(source)) {
    if (key === "__v") continue;
    if (key === "_id") {
      output.id = String(raw);
      continue;
    }
    output[key] = toPlain(raw);
  }
  return output;
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return toPlain(rest);
}
