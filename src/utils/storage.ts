import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Tokens } from "@/types";

const TOKEN_KEY = "pendeza-connect.tokens";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

async function setSecureValue(key: string, value: string) {
  if (Platform.OS === "web") {
    if (canUseBrowserStorage()) window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureValue(key: string) {
  if (Platform.OS === "web") {
    return canUseBrowserStorage() ? window.localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureValue(key: string) {
  if (Platform.OS === "web") {
    if (canUseBrowserStorage()) window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveTokens(tokens: Tokens) {
  await setSecureValue(TOKEN_KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<Tokens | null> {
  const raw = await getSecureValue(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function clearTokens() {
  await deleteSecureValue(TOKEN_KEY);
}
