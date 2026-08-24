import { api, listOf , paginatedOf } from "@/api/client";
import type { Client , Paginated } from "@/types";

export async function listClients(search = "") {
  const response = await api.get<Client[] | { results: Client[] }>("/clients/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listClientsPage({ page = 1, search = "", view = "all" }: { page?: number; search?: string; view?: string }) {
  const response = await api.get<Client[] | Paginated<Client>>("/clients/", {
    params: { ...(search ? { search } : {}), ...(view !== "all" ? { view } : {}), page, page_size: 10 }
  });
  return paginatedOf(response.data, page, 10);
}

export async function getClient(clientId: number) {
  const response = await api.get<Client>(`/clients/${clientId}/`);
  return response.data;
}
