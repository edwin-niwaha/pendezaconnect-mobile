import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { syncPushNotifications } from "@/features/notifications/notifications";

function openNotification(data: Record<string, unknown>) {
  const event = typeof data.event === "string" ? data.event : "";
  const id = typeof data.record_id === "number" || /^\d+$/.test(String(data.record_id || "")) ? String(data.record_id) : "";
  if (["loan_submitted", "loan_updated", "loan_disbursed", "loan_balance"].includes(event) && id) {
    router.push(`/(tabs)/loans/${id}`);
  } else if (["payment_updated", "sponsorship_due"].includes(event)) {
    router.push("/(tabs)/payments");
  } else if (event === "savings_updated") {
    router.push("/(tabs)/savings");
  } else if (event === "account_security_changed") {
    router.push("/(tabs)/account");
  }
}

export function NotificationCoordinator() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) void syncPushNotifications().catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isAuthenticated) openNotification(response.notification.request.content.data);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && isAuthenticated) openNotification(response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  return null;
}
