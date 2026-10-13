const developmentHosts = new Set(["localhost", "127.0.0.1"]);

export function isDevelopmentOrigin(value: string) {
  const url = new URL(value);
  return url.protocol === "http:" && developmentHosts.has(url.hostname);
}

export function appMatches(configuredUrl: string) {
  const origin = new URL(configuredUrl).origin;
  return isDevelopmentOrigin(origin)
    ? ["http://localhost/*", "http://127.0.0.1/*"]
    : [`${origin}/*`];
}

export function trustedAppOrigin(
  value: unknown,
  configuredUrl: string,
): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    const configured = new URL(configuredUrl).origin;
    if (
      url.origin === configured ||
      (isDevelopmentOrigin(configured) && isDevelopmentOrigin(url.origin))
    )
      return url.origin;
  } catch {
    /* Invalid or unavailable tab URLs are not application origins. */
  }
  return null;
}
