import { api, listOf } from "@/api/client";
import type { Sponsor } from "@/types";

export async function listSponsors(search = "") {
  const response = await api.get<Sponsor[] | { results: Sponsor[] }>("/sponsors/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}
