import { useCallback } from "react";
import { listClients } from "@/api/clients";
import { useSearchableResource } from "@/features/shared/useSearchableResource";

export function useClients() {
  const loader = useCallback((search: string) => listClients(search), []);
  return useSearchableResource(loader);
}
