import { useCallback } from "react";
import { listPaymentsPage } from "@/api/payments";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function usePayments(enabled = true) {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listPaymentsPage({ page, search }), []);
  return usePaginatedResource(loader, enabled);
}
