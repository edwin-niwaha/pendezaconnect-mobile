import { Platform } from "react-native";

export function normalizeUgandanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^2567\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^7\d{8}$/.test(digits)) return `0${digits}`;
  if (/^07\d{8}$/.test(digits)) return digits;
  return "";
}

export async function pickContactPhone() {
  let Contacts: typeof import("expo-contacts");
  try {
    Contacts = await import("expo-contacts");
  } catch {
    throw new Error("Contacts are not available in this app build. Rebuild and reinstall Pendeza Connect.");
  }
  if (Platform.OS === "android") {
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) throw new Error("Contact permission was not granted.");
  }
  const contact = await Contacts.presentContactPickerAsync();
  if (!contact) return null;
  const numbers = contact.phoneNumbers?.map((entry) => entry.number || "").filter(Boolean) ?? [];
  const normalized = numbers.map(normalizeUgandanPhone).find(Boolean);
  if (!normalized) throw new Error("That contact does not have a valid Ugandan mobile number.");
  return { name: contact.name || "", phone: normalized };
}
