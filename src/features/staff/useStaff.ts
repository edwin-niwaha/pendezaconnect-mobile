import { useCallback } from "react";
import { listStaffPage } from "@/api/staff";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function useStaff(scope = "") {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listStaffPage({ page, scope, search }), [scope]);
  return usePaginatedResource(loader);
}
