import { useCallback } from "react";
import { listChildrenPage } from "@/api/children";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function useChildren(scope = "") {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listChildrenPage({ page, scope, search }), [scope]);
  return usePaginatedResource(loader);
}
