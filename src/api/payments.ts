import { api, listOf } from "@/api/client";
import type { Payment } from "@/types";

export async function listPayments(search = "") {
  const response = await api.get<Payment[] | { results: Payment[] }>("/payments/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}
