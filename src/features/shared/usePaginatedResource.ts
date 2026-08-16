import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/api/client";
import type { Paginated } from "@/types";

type Loader<T> = (params: { page: number; search: string }) => Promise<Paginated<T>>;

export function usePaginatedResource<T>(loader: Loader<T>, enabled = true) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const requestId = useRef(0);

  const loadPage = useCallback(
    async (page: number, mode: "initial" | "refresh" | "more" = "initial") => {
      const id = ++requestId.current;
      if (mode === "more") {
        setLoadingMore(true);
        setLoadMoreError("");
      } else if (mode === "refresh") {
        setRefreshing(true);
        setError("");
        setLoadMoreError("");
      } else {
        setLoading(true);
        setError("");
        setLoadMoreError("");
      }

      try {
        const response = await loader({ page, search });
        if (id !== requestId.current) return;
        setCount(response.count);
        setNextPage(response.next ? page + 1 : null);
        setItems((current) => (mode === "more" ? [...current, ...response.results] : response.results));
      } catch (err) {
        if (id !== requestId.current) return;
        const message = getErrorMessage(err, "Unable to load data.");
        if (mode === "more") {
          setLoadMoreError(message);
        } else {
          setError(message);
          if (mode === "initial") setItems([]);
        }
      } finally {
        if (id !== requestId.current) return;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [loader, search]
  );

  useEffect(() => {
    requestId.current += 1;
    if (!enabled) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setNextPage(null);
      void loadPage(1, "initial");
    }, 600);
    return () => clearTimeout(timer);
  }, [enabled, loadPage]);

  const refresh = useCallback(() => loadPage(1, "refresh"), [loadPage]);

  const loadMore = useCallback(() => {
    if (!nextPage || loading || refreshing || loadingMore) return;
    void loadPage(nextPage, "more");
  }, [loadPage, loading, loadingMore, nextPage, refreshing]);

  return {
    count,
    error,
    hasMore: Boolean(nextPage),
    items,
    loadMore,
    loadMoreError,
    loading,
    loadingMore,
    refresh,
    refreshing,
    search,
    setSearch
  };
}
