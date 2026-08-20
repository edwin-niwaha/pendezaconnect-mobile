import { api, listOf , paginatedOf } from "@/api/client";
import type { Staff , Paginated } from "@/types";

export async function listStaff(search = "") {
  const response = await api.get<Staff[] | { results: Staff[] }>("/staff/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listStaffPage({ page = 1, scope = "", search = "" }: { page?: number; scope?: string; search?: string }) {
  const response = await api.get<Staff[] | Paginated<Staff>>("/staff/", {
    params: { ...(search ? { search } : {}), ...(scope ? { scope } : {}), page, page_size: 10 }
  });
  return paginatedOf(response.data, page, 10);
}

export async function getStaff(staffId: number) {
  const response = await api.get<Staff>(`/staff/${staffId}/`);
  return response.data;
}

export async function uploadStaffPhoto(staffId: number, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const form = new FormData();
  const name = asset.fileName || `staff-${staffId}-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("picture", { uri: asset.uri, name, type } as unknown as Blob);

  const response = await api.post<Staff>(`/staff/${staffId}/photos/`, form);
  return response.data;
}

export async function deleteStaffPhoto(staffId: number) {
  const response = await api.delete<Staff>(`/staff/${staffId}/photos/`);
  return response.data;
}
