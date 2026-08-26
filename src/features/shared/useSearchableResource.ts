import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/api/client";

export function useSearchableResource<T>(loader: (search: string) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!hasLoaded.current) setLoading(true);
    setError("");
    try {
      const nextItems = await loader(search);
      if (id === requestId.current) setItems(nextItems);
    } catch (err) {
      if (id === requestId.current) setError(getErrorMessage(err, "Unable to load data."));
    } finally {
      if (id === requestId.current) {
        hasLoaded.current = true;
        setLoading(false);
      }
    }
  }, [loader, search]);

  useEffect(() => {
    const timer = setTimeout(load, 600);
    return () => clearTimeout(timer);
  }, [load]);

  return { error, items, loading, refresh: load, search, setSearch };
}
