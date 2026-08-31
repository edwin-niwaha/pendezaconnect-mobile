import { api } from "@/api/client";
import { isAxiosError } from "axios";
import type { Paginated } from "@/types";

export type DeviceInstallationPayload = {
  installation_id: string;
  push_token: string;
  platform: "android" | "ios";
  app_version: string;
  notifications_enabled: boolean;
};

export async function registerDeviceInstallation(payload: DeviceInstallationPayload) {
  const response = await api.post<{ id: number }>("/device-installations/", payload);
  return response.data;
}

export async function deleteDeviceInstallation(id: number) {
  await api.delete(`/device-installations/${id}/`);
}

export type ServerNotification = {
  body: string;
  created_at: string;
  data: Record<string, unknown>;
  event: string;
  id: number;
  is_read: boolean;
  record_id?: number | null;
  title: string;
};

export async function listUserNotifications() {
  const response = await api.get<Paginated<ServerNotification> | ServerNotification[]>("/notifications/", { params: { page_size: 100 } });
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getUnreadNotificationCount() {
  const response = await api.get<{ count: number }>("/notifications/unread-count/");
  return response.data.count;
}

export async function markServerNotificationRead(id: number) {
  await api.post(`/notifications/${id}/read/`);
}

export async function markAllServerNotificationsRead() {
  await api.post("/notifications/read-all/");
}

export async function clearServerNotifications() {
  await api.delete("/notifications/clear/");
}

export type NotificationWorkQueue = {
  id: "activations" | "feedback" | "withdrawals";
  title: string;
  count: number;
  items: {
    id: string;
    title: string;
    body: string;
    web_path: string;
    amount?: string;
    client_id?: number;
  }[];
  links: { label: string; path: string }[];
};

export async function listNotificationWorkQueues() {
  try {
    const response = await api.get<{ queues: NotificationWorkQueue[] }>("/notifications/work-queues/");
    return response.data.queues;
  } catch (error) {
    // This is an optional capability that older API deployments do not expose.
    // Depending on the router configuration, an unavailable action can surface
    // as either 404 or 405. In both cases the inbox remains fully usable.
    if (isAxiosError(error) && [404, 405].includes(error.response?.status ?? 0)) {
      return [];
    }
    throw error;
  }
}
