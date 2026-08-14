import { api, listOf, paginatedOf } from "@/api/client";
import type { Child, ChildPhotoUpload, Paginated } from "@/types";

export async function listChildren(search = "") {
  const response = await api.get<Child[] | { results: Child[] }>("/children/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listChildrenPage({ page = 1, scope = "", search = "" }: { page?: number; scope?: string; search?: string }) {
  const response = await api.get<Child[] | Paginated<Child>>("/children/", {
    params: { ...(search ? { search } : {}), ...(scope ? { scope } : {}), page, page_size: 10 }
  });
  return paginatedOf(response.data, page, 10);
}

export async function getChild(childId: number) {
  const response = await api.get<Child>(`/children/${childId}/`);
  return response.data;
}

export async function uploadChildPhoto(childId: number, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const form = new FormData();
  const name = asset.fileName || `child-${childId}-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("picture", { uri: asset.uri, name, type } as unknown as Blob);

  const response = await api.post<ChildPhotoUpload>(`/children/${childId}/photos/`, form);
  return response.data;
}
