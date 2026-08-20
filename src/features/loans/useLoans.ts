import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { listApprovalQueue, listLoansPage } from "@/api/loans";
import { usePaginatedResource } from "@/features/shared/usePaginatedResource";
import type { Loan } from "@/types";

export function useLoans() {
  const loader = useCallback(({ page, search }: { page: number; search: string }) => listLoansPage({ page, search }), []);
  const resource = usePaginatedResource(loader);
  const [queue, setQueue] = useState<Loan[]>([]);
  const [queueError, setQueueError] = useState("");

  const loadQueue = useCallback(async () => {
    setQueueError("");
    try {
      setQueue(await listApprovalQueue());
    } catch (err) {
      setQueueError(getErrorMessage(err, "Unable to load approval queue."));
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const refresh = useCallback(async () => {
    await Promise.all([resource.refresh(), loadQueue()]);
  }, [loadQueue, resource]);

  return { ...resource, error: resource.error || queueError, queue, refresh };
}
