import { API_BASE_URL } from "@/api/client";

export function getBackendBaseUrl() {
  return API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");
}

export function backendUrl(path: string) {
  const base = getBackendBaseUrl().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
