import { Redirect } from "expo-router";
import { LoadingState } from "@/components/Screen";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) return <LoadingState />;
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/auth/login"} />;
}