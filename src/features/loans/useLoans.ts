import { useCallback, useEffect, useState } from "react";
import { listApprovalQueue, listLoans } from "@/api/loans";
import type { Loan } from "@/types";

export function useLoans() {
  const [items, setItems] = useState<Loan[]>([]);
  const [queue, setQueue] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [loans, approvals] = await Promise.all([listLoans(search), listApprovalQueue()]);
      setItems(loans);
      setQueue(approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load loans.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return { error, items, loading, queue, refresh: load, search, setSearch };
}
