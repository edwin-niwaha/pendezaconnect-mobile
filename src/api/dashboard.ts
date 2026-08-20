import { api } from "@/api/client";
import type { Dashboard } from "@/types";

export async function getDashboard() {
  const response = await api.get<Dashboard>("/dashboard/");
  return response.data;
}
