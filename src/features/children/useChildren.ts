import { useCallback } from "react";
import { listChildren } from "@/api/children";
import { useSearchableResource } from "@/features/shared/useSearchableResource";

export function useChildren() {
  const loader = useCallback((search: string) => listChildren(search), []);
  return useSearchableResource(loader);
}
