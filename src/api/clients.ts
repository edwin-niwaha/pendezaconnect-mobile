import { api, listOf , paginatedOf } from "@/api/client";
import type { Client , Paginated } from "@/types";

const clientCache = new Map<number, Client>();

function cacheClients(clients: Client[]) {
  clients.forEach((client) => clientCache.set(client.id, client));
  return clients;
}

export function getCachedClient(clientId: number) {
  return clientCache.get(clientId) ?? null;
}

export async function listClients(search = "") {
  const response = await api.get<Client[] | { results: Client[] }>("/clients/", {
    params: search ? { search } : undefined
  });
  return cacheClients(listOf(response.data));
}

export async function listClientsPage({ page = 1, search = "", view = "all" }: { page?: number; search?: string; view?: string }) {
  const response = await api.get<Client[] | Paginated<Client>>("/clients/", {
    params: { ...(search ? { search } : {}), ...(view !== "all" ? { view } : {}), page, page_size: 10 }
  });
  const result = paginatedOf(response.data, page, 10);
  cacheClients(result.results);
  return result;
}

export async function getClient(clientId: number) {
  const response = await api.get<Client>(`/clients/${clientId}/`);
  clientCache.set(response.data.id, response.data);
  return response.data;
}

export function cacheClient(client: Client) {
  clientCache.set(client.id, client);
  return client;
}
