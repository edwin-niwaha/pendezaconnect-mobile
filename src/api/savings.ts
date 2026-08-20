import { api, publicApi } from "@/api/client";
import { listClientsPage } from "@/api/clients";
import type { ClientSavings, SavingsAccount, SavingsTransaction } from "@/types";

export async function getClientSavings(clientId: number) {
  const response = await api.get<ClientSavings>(`/clients/${clientId}/savings/`);
  return response.data;
}

export type SavingsRequestPayload = {
  amount: string;
  notes?: string;
  payment_method: "mobile_money" | "bank_transfer" | "cash" | "cheque";
  reference?: string;
  transaction_type: "deposit" | "withdrawal";
};

export async function submitSavingsRequest(clientId: number, payload: SavingsRequestPayload) {
  const response = await api.post(`/clients/${clientId}/savings/requests/`, payload);
  return response.data;
}

export async function initiateMobileMoneyDeposit(clientId: number, payload: { amount: string; phone: string; notes?: string }) {
  // Savings deposits use the same collection endpoint as the working web
  // payment flow. The previous client-specific route is not exposed by the API.
  const response = await publicApi.post("/payments/mobile-money/initiate/", {
    amount: Number(payload.amount),
    client_id: clientId,
    notes: payload.notes,
    payment_purpose: "savings_deposit",
    phone: payload.phone
  });
  return response.data as { detail?: string; message?: string; reference?: string; reference_id?: string; status?: string };
}

export async function getOperationalSavings(search = "") {
  const clientsPage = await listClientsPage({ page: 1, search });
  const clients = clientsPage.results;
  const accounts: SavingsAccount[] = clients.map((client) => ({
    id: client.id,
    client: client.id,
    client_name: client.full_name,
    account_number: client.reg_number || client.prefixed_id,
    opening_date: "",
    status: "active",
    balance: String(client.savings_balance ?? 0)
  }));
  return { accounts, transactions: [] as SavingsTransaction[] };
}
