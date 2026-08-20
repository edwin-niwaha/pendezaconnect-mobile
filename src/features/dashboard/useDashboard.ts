import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { getDashboard } from "@/api/dashboard";
import type { Dashboard } from "@/types";

export function useDashboard(enabled = true) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, refresh: load };
}
