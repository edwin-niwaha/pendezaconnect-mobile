import { API_BASE_URL } from "@/api/client";

export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase() || "development";

const LOCAL_API_HOSTS = ["localhost", "127.0.0.1", "10.0.2.2", "0.0.0.0"];

export function getProductionConfigError() {
  if (APP_ENV !== "production") return "";
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    return "Production builds require EXPO_PUBLIC_API_BASE_URL to be set.";
  }
  let host = "";
  try {
    host = new URL(API_BASE_URL).hostname;
  } catch {
    return "Production API URL is invalid.";
  }
  if (LOCAL_API_HOSTS.includes(host)) {
    return "Production builds cannot use a local development API URL.";
  }
  if (!API_BASE_URL.startsWith("https://")) {
    return "Production API URL must use HTTPS.";
  }
  return "";
}
