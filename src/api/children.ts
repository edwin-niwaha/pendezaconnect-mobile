import { api, listOf } from "@/api/client";
import type { Child, ChildPhotoUpload } from "@/types";

export async function listChildren(search = "") {
  const response = await api.get<Child[] | { results: Child[] }>("/children/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function uploadChildPhoto(childId: number, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const form = new FormData();
  const name = asset.fileName || `child-${childId}-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("picture", { uri: asset.uri, name, type } as unknown as Blob);

  const response = await api.post<ChildPhotoUpload>(`/children/${childId}/photos/`, form);
  return response.data;
}
