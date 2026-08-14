import { api, listOf } from "@/api/client";
import type { Payment } from "@/types";
import { paginatedOf } from "@/api/client";
import type { Paginated } from "@/types";

export async function listPayments(search = "") {
  const response = await api.get<Payment[] | { results: Payment[] }>("/payments/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listPaymentsPage({ page = 1, search = "" }: { page?: number; search?: string }) {
  const response = await api.get<Payment[] | Paginated<Payment>>("/payments/", {
    params: { ...(search ? { search } : {}), page }
  });
  return paginatedOf(response.data);
}
