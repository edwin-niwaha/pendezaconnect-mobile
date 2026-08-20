import { api } from "@/api/client";

export async function sendFeedback(payload: { name: string; email: string; message: string }) {
  const response = await api.post<{ detail?: string }>("/feedback/", payload);
  return response.data;
}
