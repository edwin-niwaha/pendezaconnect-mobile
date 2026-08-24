import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { syncPushNotifications } from "@/features/notifications/notifications";
import { useNotificationsInbox } from "@/providers/NotificationProvider";

export function openNotification(data: Record<string, unknown>) {
  const event = typeof data.event === "string" ? data.event : "";
  const id = typeof data.record_id === "number" || /^\d+$/.test(String(data.record_id || "")) ? String(data.record_id) : "";
  if (["loan_submitted", "loan_updated", "loan_disbursed", "loan_balance"].includes(event) && id) {
    router.push(`/(tabs)/loans/${id}`);
  } else if (["payment_updated", "sponsorship_due"].includes(event)) {
    router.push("/(tabs)/payments");
  } else if (["savings_updated", "savings_request_submitted"].includes(event)) {
    router.push("/(tabs)/savings");
  } else if (event === "account_security_changed") {
    router.push("/(tabs)/account");
  }
}

export function NotificationCoordinator() {
  const { isAuthenticated } = useAuth();
  const { captureNotification } = useNotificationsInbox();

  useEffect(() => {
    if (isAuthenticated) void syncPushNotifications().catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isAuthenticated) {
        void captureNotification(response.notification, true);
        openNotification(response.notification.request.content.data);
      }
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && isAuthenticated) {
        void captureNotification(response.notification, true);
        openNotification(response.notification.request.content.data);
      }
    });
    return () => subscription.remove();
  }, [captureNotification, isAuthenticated]);

  return null;
}
