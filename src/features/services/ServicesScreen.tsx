import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { isClientAccount, isGuestAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Service = { accent: string; icon: IconName; route: Parameters<typeof router.push>[0]; subtitle: string; title: string };

export function ServicesScreen() {
  const { user } = useAuth();
  if (isGuestAccount(user)) return <Redirect href="/(tabs)" />;
  const staff = isStaffAccount(user);
  const canUseSponsorship = staff || isSponsorAccount(user);
  const canUseLoans = staff || isClientAccount(user);
  const canUseSavings = staff || isClientAccount(user);

  const services: Service[] = [
    ...(canUseSponsorship ? [{ accent: "#db2777", icon: "heart" as const, route: "/(tabs)/sponsors" as const, subtitle: "Sponsors & support", title: "Sponsorship" }] : []),
    ...(staff ? [{ accent: "#d97706", icon: "school" as const, route: "/(tabs)/children" as const, subtitle: "Profiles & welfare", title: "Children" }] : []),
    ...(staff ? [{ accent: "#0891b2", icon: "people" as const, route: "/(tabs)/clients" as const, subtitle: "Client directory", title: "Clients" }] : []),
    ...(canUseLoans ? [{ accent: colors.accent, icon: "cash" as const, route: "/(tabs)/loans" as const, subtitle: "Applications & balances", title: "Loans" }] : []),
    ...(canUseSavings ? [{ accent: "#16a34a", icon: "wallet" as const, route: "/(tabs)/savings" as const, subtitle: "Deposits & requests", title: "Savings" }] : []),
    ...(staff ? [{ accent: "#7c3aed", icon: "briefcase" as const, route: "/(tabs)/staff" as const, subtitle: "Team directory", title: "Staff" }] : []),
    { accent: colors.primaryDark, icon: "chatbubble-ellipses", route: "/(tabs)/support", subtitle: "Help & feedback", title: "Contact us" }
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="apps" color={colors.gold} size={25} /></View>
        <View style={styles.headerCopy}><Text style={styles.eyebrow}>Pendeza Connect</Text><Text style={styles.title}>Services</Text><Text style={styles.headerSubtitle}>Everything you need, in one place</Text></View>
      </View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Quick access</Text><Text style={styles.serviceCount}>{services.length} services</Text></View>
      <View style={styles.grid}>
        {services.map((service) => <ServiceCard key={service.title} service={service} />)}
      </View>
    </Screen>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Pressable accessibilityLabel={service.title} accessibilityRole="button" onPress={() => router.push(service.route)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${service.accent}14` }]}><Ionicons name={service.icon} color={service.accent} size={20} /></View>
        <Ionicons name="chevron-forward" color="#94a3b8" size={17} />
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>{service.title}</Text>
      <Text numberOfLines={1} style={styles.cardSubtitle}>{service.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexGrow: 1, flexShrink: 1, minHeight: 104, minWidth: 0, padding: spacing.md, shadowColor: "#0f172a", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.04, shadowRadius: 8 },
  cardSubtitle: { color: colors.muted, fontSize: 10, marginTop: 2 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  grid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  header: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.sm, padding: spacing.md, shadowColor: "#064e3b", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.16, shadowRadius: 12 },
  headerCopy: { flex: 1 },
  headerIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  headerSubtitle: { color: "#ccfbf1", fontSize: 11, marginTop: 2 },
  iconWrap: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  serviceCount: { color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "white", fontSize: 21, fontWeight: "900", marginTop: 1 }
});
