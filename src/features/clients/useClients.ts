import { useCallback } from "react";
import { listClientsPage } from "@/api/clients";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function useClients(view = "all") {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listClientsPage({ page, search, view }), [view]);
  return usePaginatedResource(loader);
}
