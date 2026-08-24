import { api } from "@/api/client";
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
