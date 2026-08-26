import { api, publicApi } from "@/api/client";
import type { AuthResponse, User } from "@/types";
import type { ImagePickerAsset } from "expo-image-picker";

export async function login(payload: { username: string; password: string }) {
  const response = await publicApi.post<AuthResponse>("/auth/login/", payload);
  return response.data;
}

export async function googleLogin(token: string, tokenType: "access" | "id" = "access") {
  const payload = tokenType === "id" ? { id_token: token } : { access_token: token };
  const response = await publicApi.post<AuthResponse>("/auth/google/", payload);
  return response.data;
}

export async function me() {
  const response = await api.get<User>("/auth/me/");
  return response.data;
}

export async function updateProfile(payload: Partial<Pick<User, "bio" | "email" | "first_name" | "last_name" | "username">>) {
  const response = await api.patch<User>("/auth/profile/", payload);
  return response.data;
}

export async function uploadAvatar(asset: ImagePickerAsset) {
  const formData = new FormData();
  formData.append("avatar", {
    name: asset.fileName || "avatar.jpg",
    type: asset.mimeType || "image/jpeg",
    uri: asset.uri
  } as unknown as Blob);
  const response = await api.post<User>("/auth/avatar/", formData);
  return response.data;
}

export async function changePassword(payload: { current_password: string; new_password: string; confirm_password: string }) {
  const response = await api.post<{ detail?: string }>("/auth/password/change/", payload);
  return response.data;
}

export async function requestPasswordReset(payload: { email: string }) {
  const response = await publicApi.post<{ detail?: string }>("/auth/password/reset/", payload);
  return response.data;
}

export async function logout(refresh: string) {
  await publicApi.post("/auth/logout/", { refresh });
}

export const authApi = { changePassword, googleLogin, login, logout, me, requestPasswordReset, updateProfile, uploadAvatar };
