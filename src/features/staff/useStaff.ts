import { useCallback } from "react";
import { listStaff } from "@/api/staff";
import { useSearchableResource } from "@/features/shared/useSearchableResource";

export function useStaff() {
  const loader = useCallback((search: string) => listStaff(search), []);
  return useSearchableResource(loader);
}
