import { api } from "@/api/client";
import type { Client } from "@/types";

export async function uploadClientPhoto(clientId: number, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const form = new FormData();
  const name = asset.fileName || `client-${clientId}-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("picture", { uri: asset.uri, name, type } as unknown as Blob);

  const response = await api.post<Client>(`/clients/${clientId}/photos/`, form);
  return response.data;
}

export async function deleteClientPhoto(clientId: number) {
  const response = await api.delete<Client>(`/clients/${clientId}/photos/`);
  return response.data;
}
