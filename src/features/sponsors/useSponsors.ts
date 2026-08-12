import { useCallback } from "react";
import { listSponsors } from "@/api/sponsors";
import { useSearchableResource } from "@/features/shared/useSearchableResource";

export function useSponsors() {
  const loader = useCallback((search: string) => listSponsors(search), []);
  return useSearchableResource(loader);
}
