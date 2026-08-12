import { api } from "@/api/client";
import type { AuthResponse, User } from "@/types";

export async function login(payload: { username: string; password: string }) {
  const response = await api.post<AuthResponse>("/auth/login/", payload);
  return response.data;
}

export async function googleLogin(idToken: string) {
  const response = await api.post<AuthResponse>("/auth/google/", { id_token: idToken });
  return response.data;
}

export async function me() {
  const response = await api.get<User>("/auth/me/");
  return response.data;
}

export const authApi = { googleLogin, login, me };
