import { useCallback } from "react";
import { listPayments } from "@/api/payments";
import { useSearchableResource } from "@/features/shared/useSearchableResource";

export function usePayments() {
  const loader = useCallback((search: string) => listPayments(search), []);
  return useSearchableResource(loader);
}
