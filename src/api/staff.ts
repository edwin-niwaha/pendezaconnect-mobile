import { api, listOf } from "@/api/client";
import type { Staff } from "@/types";

export async function listStaff(search = "") {
  const response = await api.get<Staff[] | { results: Staff[] }>("/staff/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}
