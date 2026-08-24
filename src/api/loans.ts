import { api, listOf , paginatedOf } from "@/api/client";
import type { Loan, LoanApplicationPayload, LoanDocument , Paginated } from "@/types";

export async function listLoans(search = "") {
  const response = await api.get<Loan[] | { results: Loan[] }>("/loans/", {
    params: search ? { search } : undefined
  });
  return listOf(response.data);
}

export async function listLoansPage({ page = 1, search = "", statuses = [] }: { page?: number; search?: string; statuses?: string[] }) {
  const response = await api.get<Loan[] | Paginated<Loan>>("/loans/", {
    params: { ...(search ? { search } : {}), ...(statuses.length ? { status: statuses.join(",") } : {}), page, page_size: 10 }
  });
  return paginatedOf(response.data, page, 10);
}

export async function listApprovalQueue() {
  const response = await api.get<Loan[]>("/loans/approval-queue/");
  return response.data;
}

function appendAsset(form: FormData, field: string, asset?: { uri: string; fileName?: string | null; mimeType?: string | null } | null) {
  if (!asset) return;
  form.append(field, {
    uri: asset.uri,
    name: asset.fileName || `${field}-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg"
  } as unknown as Blob);
}

function loanForm(payload: LoanApplicationPayload) {
  const form = new FormData();
  form.append("principal_amount", payload.principal_amount);
  form.append("loan_purpose", payload.loan_purpose);
  form.append("loan_period_months", payload.loan_period_months);
  if (payload.start_date) form.append("start_date", payload.start_date);
  if (payload.interest_rate) form.append("interest_rate", payload.interest_rate);
  if (payload.reason_for_approval) form.append("reason_for_approval", payload.reason_for_approval);
  appendAsset(form, "national_id", payload.national_id);
  appendAsset(form, "bank_statement", payload.bank_statement);
  return form;
}

export async function getLoan(loanId: number) {
  const response = await api.get<Loan>(`/loans/${loanId}/`);
  return response.data;
}

export async function applyForLoan(payload: LoanApplicationPayload) {
  const response = await api.post<Loan>("/loans/", loanForm(payload));
  return response.data;
}

export async function updateLoan(loanId: number, payload: Partial<LoanApplicationPayload>) {
  const response = await api.patch<Loan>(`/loans/${loanId}/`, payload);
  return response.data;
}

export async function approveLoan(loanId: number) {
  const response = await api.post<Loan>(`/loans/${loanId}/approve/`, {});
  return response.data;
}

export async function rejectLoan(loanId: number, reason: string) {
  const response = await api.post<Loan>(`/loans/${loanId}/reject/`, { reason });
  return response.data;
}

export async function disburseLoan(loanId: number) {
  const response = await api.post<Loan>(`/loans/${loanId}/disburse/`, {});
  return response.data;
}

export async function deleteLoan(loanId: number) {
  await api.delete(`/loans/${loanId}/`);
}

export async function uploadLoanDocuments(loanId: number, payload: Pick<LoanApplicationPayload, "national_id" | "bank_statement">) {
  const form = new FormData();
  appendAsset(form, "national_id", payload.national_id);
  appendAsset(form, "bank_statement", payload.bank_statement);
  const response = await api.post<LoanDocument[]>(`/loans/${loanId}/documents/`, form);
  return response.data;
}
