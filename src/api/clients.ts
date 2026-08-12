import { api, listOf } from "@/api/client";
import type { Client } from "@/types";

export async function listClients(search = "") {
  const response = await api.get<Client[] | { results: Client[] }>("/clients/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}
