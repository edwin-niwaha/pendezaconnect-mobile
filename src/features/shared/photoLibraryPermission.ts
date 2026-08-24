import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Android's system photo picker does not require broad media-library access.
 * Requesting a permission that is intentionally removed from the manifest
 * makes every library selection fail before the picker can open.
 */
export async function canChooseFromPhotoLibrary() {
  if (Platform.OS === "android" || Platform.OS === "web") return true;

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}
