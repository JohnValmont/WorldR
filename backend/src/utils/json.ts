export function safeParseJSON(value: any, fallback: any = {}) {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}
