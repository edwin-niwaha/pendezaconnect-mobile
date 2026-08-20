import { useCallback } from "react";
import { listClientsPage } from "@/api/clients";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function useClients() {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listClientsPage({ page, search }), []);
  return usePaginatedResource(loader);
}
