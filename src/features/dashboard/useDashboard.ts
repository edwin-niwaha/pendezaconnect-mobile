import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { getDashboard } from "@/api/dashboard";
import type { Dashboard } from "@/types";

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, refresh: load };
}
