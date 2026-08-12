import { api } from "@/api/client";
import { listClients } from "@/api/clients";
import type { ClientSavings, SavingsAccount, SavingsTransaction } from "@/types";

export async function getClientSavings(clientId: number) {
  const response = await api.get<ClientSavings>(`/clients/${clientId}/savings/`);
  return response.data;
}

export async function getOperationalSavings(search = "") {
  const clients = await listClients(search);
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
