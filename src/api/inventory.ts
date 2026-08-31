import { api, listOf, paginatedOf } from "@/api/client";
import type { InventoryProduct, InventorySummary, Paginated, StockMovement } from "@/types";

export async function getInventorySummary() {
  return (await api.get<InventorySummary>("/inventory/summary/")).data;
}

export async function listInventoryPage({ page = 1, search = "", alerts = false }: { page?: number; search?: string; alerts?: boolean } = {}) {
  const response = await api.get<Paginated<InventoryProduct> | InventoryProduct[]>(alerts ? "/inventory/alerts/" : "/inventory/", { params: { page, search: search || undefined } });
  return paginatedOf(response.data, page);
}

export async function listStockMovements() {
  return listOf((await api.get<StockMovement[] | { results: StockMovement[] }>("/inventory/movements/")).data);
}
