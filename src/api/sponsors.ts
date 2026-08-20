import { api, listOf , paginatedOf } from "@/api/client";
import type { Sponsor, SponsorPayments , Paginated } from "@/types";

export async function listSponsors(search = "") {
  const response = await api.get<Sponsor[] | { results: Sponsor[] }>("/sponsors/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listSponsorsPage({ page = 1, search = "" }: { page?: number; search?: string }) {
  const response = await api.get<Sponsor[] | Paginated<Sponsor>>("/sponsors/", {
    params: { ...(search ? { search } : {}), page, page_size: 10 }
  });
  return paginatedOf(response.data, page, 10);
}

export async function getSponsor(sponsorId: number) {
  const response = await api.get<Sponsor>(`/sponsors/${sponsorId}/`);
  return response.data;
}

export async function getSponsorPayments(sponsorId: number) {
  const response = await api.get<SponsorPayments>(`/sponsors/${sponsorId}/payments/`);
  return response.data;
}
