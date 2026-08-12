import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { clearTokens, getTokens, saveTokens } from "@/utils/storage";

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

export const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

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

async function refreshAccessToken() {
  const tokens = await getTokens();
  if (!tokens?.refresh) return null;
  const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: tokens.refresh }, { timeout: REQUEST_TIMEOUT_MS });
  const access = response.data?.access;
  if (!access) return null;
  await saveTokens({ access, refresh: tokens.refresh });
  return access;
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
      if (!access) {
        await clearTokens();
        return Promise.reject(error);
      }
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

  if (axios.isAxiosError(error)) {
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
