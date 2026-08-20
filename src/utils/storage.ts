import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Tokens } from "@/types";

const TOKEN_KEY = "pendeza-connect.tokens";
const INSTALLATION_ID_KEY = "pendeza-connect.installation-id";
const INSTALLATION_RECORD_KEY = "pendeza-connect.installation-record";
const LOAN_BALANCE_NOTICE_KEY = "pendeza-connect.loan-balance-notice";

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

export async function getOrCreateInstallationId() {
  const existing = await getSecureValue(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  const id = `${random()}${random()}-${random()}-4${random().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${random().slice(1)}-${random()}${random()}${random()}`;
  await setSecureValue(INSTALLATION_ID_KEY, id);
  return id;
}

export async function saveInstallationRecordId(id: number) {
  await setSecureValue(INSTALLATION_RECORD_KEY, String(id));
}

export async function getInstallationRecordId() {
  const value = await getSecureValue(INSTALLATION_RECORD_KEY);
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function clearInstallationRecordId() {
  await deleteSecureValue(INSTALLATION_RECORD_KEY);
}

export async function getLoanBalanceNoticeKey() {
  return getSecureValue(LOAN_BALANCE_NOTICE_KEY);
}

export async function saveLoanBalanceNoticeKey(value: string) {
  await setSecureValue(LOAN_BALANCE_NOTICE_KEY, value);
}
