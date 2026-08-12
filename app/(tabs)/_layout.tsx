import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { LoadingState } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

const icons = {
  index: "grid-outline",
  services: "apps-outline",
  sponsors: "heart-outline",
  clients: "people-outline",
  children: "camera-outline",
  staff: "briefcase-outline",
  loans: "cash-outline",
  savings: "wallet-outline",
  payments: "receipt-outline",
  account: "person-circle-outline"
} as const;

export default function TabsLayout() {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) return <LoadingState />;
  if (!isAuthenticated) return <Redirect href="/auth/login" />;

  return (
    <Tabs screenOptions={({ route }) => ({
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"} color={color} size={size} />
    })}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services" }} />
      <Tabs.Screen name="sponsors" options={{ title: "Sponsorship", href: null }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", href: null }} />
      <Tabs.Screen name="children" options={{ title: "Children", href: null }} />
      <Tabs.Screen name="staff" options={{ title: "Staff", href: null }} />
      <Tabs.Screen name="loans" options={{ title: "Loans", href: null }} />
      <Tabs.Screen name="savings" options={{ title: "Savings", href: null }} />
      <Tabs.Screen name="payments" options={{ title: "Payments", href: null }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
