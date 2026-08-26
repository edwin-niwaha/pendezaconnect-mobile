import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LoadingState } from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { isGuestAccount } from "@/utils/roles";
import { useNotificationsInbox } from "@/providers/NotificationProvider";

const icons = {
  index: "grid-outline",
  services: "apps-outline",
  sponsors: "heart-outline",
  clients: "people-outline",
  "client-photos": "image-outline",
  "child-photos": "images-outline",
  children: "camera-outline",
  "staff-photos": "camera-outline",
  staff: "briefcase-outline",
  loans: "cash-outline",
  savings: "wallet-outline",
  payments: "receipt-outline",
  support: "help-circle-outline",
  account: "person-circle-outline"
} as const;

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
}

function HeaderBackButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
      <Ionicons name="arrow-back" color={colors.text} size={24} />
    </Pressable>
  );
}

function NotificationBell() {
  const { unreadCount } = useNotificationsInbox();
  const count = unreadCount > 99 ? "99+" : String(unreadCount);
  return <Pressable accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} accessibilityRole="button" onPress={() => router.push("/(tabs)/notifications")} style={styles.bell}><Ionicons color={colors.text} name={unreadCount ? "notifications" : "notifications-outline"} size={23} />{unreadCount ? <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View> : null}</Pressable>;
}

export default function TabsLayout() {
  const { ready, isAuthenticated, user } = useAuth();
  if (!ready) return <LoadingState />;
  if (!isAuthenticated) return <Redirect href="/auth/login" />;

  return (
    <Tabs screenOptions={({ route }) => ({
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      headerLeft: route.name === "index" ? undefined : () => <HeaderBackButton />,
      headerRight: () => <NotificationBell />,
      headerStyle: { backgroundColor: colors.surface },
      headerTitle: route.name === "index" ? "Home" : "",
      headerTitleStyle: { color: colors.text },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"} color={color} size={size} />
    })}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services", href: isGuestAccount(user) ? null : undefined }} />
      <Tabs.Screen name="sponsors" options={{ title: "Sponsorship", href: null }} />
      <Tabs.Screen name="sponsors/[id]" options={{ title: "Sponsor Details", href: null }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", href: null }} />
      <Tabs.Screen name="clients/[id]" options={{ title: "Client Details", href: null }} />
      <Tabs.Screen name="client-photos" options={{ title: "Client Photos", href: null }} />
      <Tabs.Screen name="child-photos" options={{ title: "Child Photos", href: null }} />
      <Tabs.Screen name="children" options={{ title: "Children", href: null }} />
      <Tabs.Screen name="children/[id]" options={{ title: "Child Details", href: null }} />
      <Tabs.Screen name="staff-photos" options={{ title: "Staff Photos", href: null }} />
      <Tabs.Screen name="staff" options={{ title: "Staff", href: null }} />
      <Tabs.Screen name="staff/[id]" options={{ title: "Staff Details", href: null }} />
      <Tabs.Screen name="loans" options={{ title: "Loans", href: null }} />
      <Tabs.Screen name="loans/[id]" options={{ title: "Loan Details", href: null }} />
      <Tabs.Screen name="savings" options={{ title: "Savings", href: null }} />
      <Tabs.Screen name="savings/[id]" options={{ title: "Savings Details", href: null }} />
      <Tabs.Screen name="payments" options={{ title: "Payments", href: null }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications", href: null }} />
      <Tabs.Screen name="support" options={{ title: "Contact us", href: null }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 9, borderWidth: 2, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 2, position: "absolute", right: 7, top: 3 },
  badgeText: { color: "white", fontSize: 9, fontWeight: "900" },
  bell: { alignItems: "center", height: 44, justifyContent: "center", marginRight: spacing.sm, width: 44 }
});
