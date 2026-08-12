import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { getClientSavings, getOperationalSavings } from "@/api/savings";
import { useAuth } from "@/providers/AuthProvider";
import type { ClientSavings } from "@/types";
import { isStaffAccount } from "@/utils/roles";

export function useSavings() {
  const { user } = useAuth();
  const [data, setData] = useState<ClientSavings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      if (user?.account_type === "client" && user.client_id) {
        setData(await getClientSavings(user.client_id));
      } else if (isStaffAccount(user)) {
        setData(await getOperationalSavings());
      } else {
        setData({ accounts: [], transactions: [] });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load savings."));
    } finally {
      setLoading(false);
    }
  }, [user?.account_type, user?.client_id]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, refresh: load };
}
