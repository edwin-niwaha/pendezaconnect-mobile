import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { getInventorySummary, listInventoryPage, listStockMovements } from "@/api/inventory";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";
import type { InventorySummary, StockMovement } from "@/types";

export function useInventory(alerts = false) {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listInventoryPage({ page, search, alerts }), [alerts]);
  const resource = usePaginatedResource(loader);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [metaError, setMetaError] = useState("");
  const loadMeta = useCallback(async () => {
    try {
      const [nextSummary, nextMovements] = await Promise.all([getInventorySummary(), alerts ? Promise.resolve([]) : listStockMovements()]);
      setSummary(nextSummary); setMovements(nextMovements); setMetaError("");
    } catch (error) { setMetaError(getErrorMessage(error, "Unable to load inventory summary.")); }
  }, [alerts]);
  useEffect(() => { void loadMeta(); }, [loadMeta]);
  const refresh = useCallback(async () => { await Promise.all([resource.refresh(), loadMeta()]); }, [loadMeta, resource]);
  return { ...resource, error: resource.error || metaError, movements, refresh, summary };
}
