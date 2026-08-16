import { api, listOf } from "@/api/client";
import { paginatedOf } from "@/api/client";
import type { Paginated, Payment } from "@/types";

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

export type MobileMoneyStatus = "PENDING" | "SUCCESSFUL" | "FAILED";
export type MobileMoneyTransaction = { reference_id: string; status: MobileMoneyStatus; amount: number | string; currency: string; phone: string; message?: string; reason?: string; updated_at?: string };
export type MobileMoneyPaymentPayload = { amount: number; phone: string; name?: string; email?: string };

export async function initiateMobileMoneyPayment(payload: MobileMoneyPaymentPayload) {
  const response = await api.post<MobileMoneyTransaction>("/payments/mobile-money/initiate/", payload);
  return response.data;
}

export async function getMobileMoneyPaymentStatus(referenceId: string) {
  const response = await api.get<MobileMoneyTransaction>(`/payments/mobile-money/${referenceId}/status/`);
  return response.data;
}
