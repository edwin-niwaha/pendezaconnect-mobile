import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { isClientAccount, isGuestAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Service = { accent: string; icon: IconName; route: Parameters<typeof router.push>[0]; title: string };

export function ServicesScreen() {
  const { user } = useAuth();
  if (isGuestAccount(user)) return <Redirect href="/(tabs)" />;
  const staff = isStaffAccount(user);
  const canUseSponsorship = staff || isSponsorAccount(user);
  const canUseLoans = staff || isClientAccount(user);
  const canUseSavings = staff || isClientAccount(user);

  const services: Service[] = [
    ...(canUseSponsorship ? [{ accent: "#db2777", icon: "heart" as const, route: "/(tabs)/sponsors" as const, title: "Sponsorship" }] : []),
    ...(staff ? [{ accent: "#d97706", icon: "school" as const, route: "/(tabs)/children" as const, title: "Children" }] : []),
    ...(staff ? [{ accent: "#0891b2", icon: "people" as const, route: "/(tabs)/clients" as const, title: "Clients" }] : []),
    ...(canUseLoans ? [{ accent: colors.accent, icon: "cash" as const, route: "/(tabs)/loans" as const, title: "Loans" }] : []),
    ...(canUseSavings ? [{ accent: "#16a34a", icon: "wallet" as const, route: "/(tabs)/savings" as const, title: "Savings" }] : []),
    ...(staff ? [{ accent: "#7c3aed", icon: "briefcase" as const, route: "/(tabs)/staff" as const, title: "Staff" }] : []),
    { accent: colors.primaryDark, icon: "chatbubble-ellipses", route: "/(tabs)/support", title: "Contact us" }
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="apps" color={colors.gold} size={25} /></View>
        <View style={styles.headerCopy}><Text style={styles.eyebrow}>Pendeza Connect</Text><Text style={styles.title}>Services</Text></View>
      </View>
      <View style={styles.grid}>
        {services.map((service) => <ServiceCard key={service.title} service={service} />)}
      </View>
    </Screen>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Pressable accessibilityLabel={service.title} accessibilityRole="button" onPress={() => router.push(service.route)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: `${service.accent}14` }]}><Ionicons name={service.icon} color={service.accent} size={24} /></View>
      <Text numberOfLines={2} style={styles.cardTitle}>{service.title}</Text>
      <View style={styles.arrow}><Ionicons name="arrow-forward" color={service.accent} size={16} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: { alignItems: "center", backgroundColor: "white", borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 28, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 28 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexBasis: "47%", flexGrow: 1, flexShrink: 1, justifyContent: "space-between", minHeight: 138, minWidth: 0, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.06, shadowRadius: 12 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900", lineHeight: 20, marginTop: spacing.md, paddingRight: 24 },
  eyebrow: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  grid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  header: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.sm, padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14 },
  headerCopy: { flex: 1 },
  headerIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18, height: 48, justifyContent: "center", width: 48 },
  iconWrap: { alignItems: "center", borderRadius: 16, height: 50, justifyContent: "center", width: 50 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  title: { color: "white", fontSize: 24, fontWeight: "900", marginTop: 2 }
});
