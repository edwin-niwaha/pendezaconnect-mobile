import axios, { AxiosError, create, InternalAxiosRequestConfig, isAxiosError } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { clearTokens, getTokens, saveTokens } from "@/utils/storage";
import type { Paginated } from "@/types";

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000);

function getDevHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri || "";
  return String(hostUri).split(":")[0] || "";
}

function defaultDevBaseUrl() {
  const host = getDevHost();
  if (host) {
    const devHost = Platform.OS === "android" && ["localhost", "127.0.0.1"].includes(host) ? "10.0.2.2" : host;
    return `http://${devHost}:8000/api/v1`;
  }
  return Platform.OS === "android" ? "http://10.0.2.2:8000/api/v1" : "http://127.0.0.1:8000/api/v1";
}

export const API_BASE_URL = ENV_API_BASE_URL || defaultDevBaseUrl();

/** Resolve relative API media paths, which native image views cannot resolve themselves. */
export function resolveResourceUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return "";
  try {
    const apiUrl = new URL(API_BASE_URL);
    if (/^(?:file:|content:|data:|blob:)/i.test(url)) return url;
    const resolved = new URL(url.startsWith("/") ? url : url, apiUrl.origin);
    // Reverse proxies sometimes serialize same-host media links as HTTP even
    // though the public API is HTTPS; Android release builds reject those.
    if (apiUrl.protocol === "https:" && resolved.hostname === apiUrl.hostname) resolved.protocol = "https:";
    return resolved.toString();
  } catch {
    return url;
  }
}

export const api = create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

// Public endpoints must not receive a stale or expired bearer token. DRF will
// reject an invalid Authorization header before it evaluates AllowAny.
export const publicApi = create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: REQUEST_TIMEOUT_MS
});

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  config.headers = config.headers ?? {};
  if (tokens?.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  config.headers.Accept = "application/json";
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
const sessionInvalidationListeners = new Set<() => void>();

export function subscribeToSessionInvalidation(listener: () => void) {
  sessionInvalidationListeners.add(listener);
  return () => {
    sessionInvalidationListeners.delete(listener);
  };
}

async function invalidateSession() {
  await clearTokens();
  sessionInvalidationListeners.forEach((listener) => listener());
}

async function refreshAccessToken() {
  try {
    const tokens = await getTokens();
    if (!tokens?.refresh) {
      await invalidateSession();
      return null;
    }
    const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: tokens.refresh }, { timeout: REQUEST_TIMEOUT_MS });
    const access = response.data?.access;
    const refresh = response.data?.refresh || tokens.refresh;
    if (!access) {
      await invalidateSession();
      return null;
    }
    await saveTokens({ access, refresh });
    return access;
  } catch (error) {
    // Keep the session on transient connectivity/server failures. Only an
    // explicit token rejection proves that the refresh credential is invalid.
    if (isAxiosError(error) && [400, 401].includes(error.response?.status ?? 0)) {
      await invalidateSession();
    }
    throw error;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    if (!original || error.response?.status !== 401 || original._retry) return Promise.reject(error);
    original._retry = true;
    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const access = await refreshPromise;
      if (!access) return Promise.reject(error);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } finally {
      refreshPromise = null;
    }
  }
);

export function listOf<T>(data: T[] | { results: T[] }) {
  return Array.isArray(data) ? data : data.results;
}

export function paginatedOf<T>(data: T[] | Paginated<T>, page = 1, pageSize = 10): Paginated<T> {
  if (Array.isArray(data)) {
    const start = Math.max(page - 1, 0) * pageSize;
    const results = data.slice(start, start + pageSize);
    return {
      count: data.length,
      next: start + pageSize < data.length ? String(page + 1) : null,
      previous: page > 1 ? String(page - 1) : null,
      results
    };
  }
  return data;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  const stringify = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join(" ");
    if (typeof value === "object") {
      return Object.values(value as Record<string, unknown>).map(stringify).filter(Boolean).join(" ");
    }
    return String(value);
  };

  if (isAxiosError(error)) {
    if (!error.response) {
      return "Could not reach the server. Check your connection and try again.";
    }
    if (error.response?.status === 403) {
      return "You do not have permission to open this section.";
    }
    if (error.response?.status === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.response?.status === 404) {
      return "This information is unavailable.";
    }
    if (error.response?.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (error.response?.status >= 500) {
      return "The server had a problem. Please try again.";
    }
    const data = error.response?.data as { detail?: unknown; error?: unknown; non_field_errors?: unknown } | undefined;
    return stringify(data?.detail) || stringify(data?.error) || stringify(data?.non_field_errors) || stringify(data) || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
