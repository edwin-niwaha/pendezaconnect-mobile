import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { subscribeToPushTokenChanges, syncPushNotifications } from "@/features/notifications/notifications";
import { useNotificationsInbox } from "@/providers/NotificationProvider";

export function openNotification(data: Record<string, unknown>) {
  const event = typeof data.event === "string" ? data.event : "";
  const id = typeof data.record_id === "number" || /^\d+$/.test(String(data.record_id || "")) ? String(data.record_id) : "";
  if (["loan_submitted", "loan_updated", "loan_disbursed", "loan_balance", "loan_status_changed", "loan_payment_due", "loan_approval_required", "loan_disbursement_required"].includes(event) && id) {
    router.push(`/(tabs)/loans/${id}`);
  } else if (["payment_updated", "sponsorship_due"].includes(event)) {
    router.push("/(tabs)/payments");
  } else if (["savings_updated", "savings_request_submitted", "client_savings_changed"].includes(event)) {
    router.push("/(tabs)/savings");
  } else if (["inventory_low_stock", "inventory_out_of_stock"].includes(event)) {
    router.push("/(tabs)/inventory-alerts");
  } else if (event === "account_security_changed") {
    router.push("/(tabs)/account");
  } else {
    router.push("/(tabs)/notifications");
  }
}

export function NotificationCoordinator() {
  const { isAuthenticated } = useAuth();
  const { captureNotification, refresh } = useNotificationsInbox();
  const handledResponseIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncPushNotifications().catch(() => undefined);
    const subscription = subscribeToPushTokenChanges();
    return () => subscription.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void refresh();
      void syncPushNotifications().catch(() => undefined);
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    const handleResponse = async (response: Notifications.NotificationResponse) => {
      if (!isAuthenticated) return;
      const responseId = response.notification.request.identifier;
      if (handledResponseIds.current.has(responseId)) return;
      handledResponseIds.current.add(responseId);
      await captureNotification(response.notification, true);
      await refresh();
      openNotification(response.notification.request.content.data);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void handleResponse(response);
    });
    return () => subscription.remove();
  }, [captureNotification, isAuthenticated, refresh]);

  return null;
}
