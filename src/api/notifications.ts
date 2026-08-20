import { api } from "@/api/client";

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
