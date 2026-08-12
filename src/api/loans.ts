import { api, listOf } from "@/api/client";
import type { Loan } from "@/types";

export async function listLoans(search = "") {
  const response = await api.get<Loan[] | { results: Loan[] }>("/loans/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listApprovalQueue() {
  const response = await api.get<Loan[]>("/loans/approval-queue/");
  return response.data;
}
