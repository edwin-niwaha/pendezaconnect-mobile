/** Open only same-origin review pages; never transfer the app's API token. */
export function workQueueWebUrl(apiBaseUrl: string, path: string) {
  const base = new URL(apiBaseUrl);
  const target = new URL(path, base.origin);
  if (!path.startsWith("/") || path.startsWith("//") || target.origin !== base.origin || !["https:", "http:"].includes(target.protocol)) {
    throw new Error("Invalid review page");
  }
  return target.toString();
}
