import { useCallback } from "react";
import { listSponsorsPage } from "@/api/sponsors";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";

export function useSponsors(category = "all") {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listSponsorsPage({ page, search, category }), [category]);
  return usePaginatedResource(loader);
}
