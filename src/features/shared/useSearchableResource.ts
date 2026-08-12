import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";

export function useSearchableResource<T>(loader: (search: string) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await loader(search));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load data."));
    } finally {
      setLoading(false);
    }
  }, [loader, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return { error, items, loading, refresh: load, search, setSearch };
}
