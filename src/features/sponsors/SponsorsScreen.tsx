export { SponsorsOptimizedScreen as SponsorsScreen } from "./SponsorsOptimizedScreen";
/*
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState, Screen } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { joinMeta } from "@/utils/format";
import { useSponsors } from "./useSponsors";

export function SponsorsScreen() {
  const { error, items, loading, search, setSearch } = useSponsors();
  if (loading && !items.length) return <LoadingState />;

  const childSponsors = items.filter((item) => item.is_child_sponsor).length;
  const staffSponsors = items.filter((item) => item.is_staff_sponsor).length;

  return (
    <Screen title="Sponsorship">
      <FeatureCard
        accent="#db2777"
        icon="heart"
        subtitle="Review sponsor records, giving categories, and payment visibility for authorized accounts."
        title="Sponsorship overview"
        value={items.length}
        meta={joinMeta([`${childSponsors} child sponsors`, `${staffSponsors} staff sponsors`])}
      />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search sponsors" />
      <ResourceError message={error} />
      <SectionHeader title="Sponsor records" subtitle="Sensitive sponsor data stays limited by backend permissions." />
      {items.length ? items.map((item) => {
        const title = item.full_name || `${item.first_name} ${item.last_name}`.trim();
        const sponsorTypes = [
          item.is_child_sponsor ? "Child" : "",
          item.is_staff_sponsor ? "Staff" : "",
          item.is_family_supporter ? "Family" : "",
          item.is_general_donor ? "General" : "",
          item.is_one_time_donor ? "One-time" : ""
        ].filter(Boolean);
        return (
          <Pressable key={item.id} onPress={() => router.push(`/(tabs)/sponsors/${item.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.rowTop}>
              <Text style={styles.title}>{title}</Text>
              <StatusBadge tone={item.is_child_sponsor || item.is_staff_sponsor ? "success" : "info"} text={sponsorTypes[0] || "Sponsor"} />
            </View>
            <Text style={styles.subtitle}>{joinMeta([item.prefixed_id, item.email || "No email", item.mobile_telephone])}</Text>
            <Text style={styles.meta}>{sponsorTypes.length ? sponsorTypes.join(" · ") : item.sponsorship_type || "Sponsor"}</Text>
          </Pressable>
        );
      }) : <ResourceEmpty text="No sponsor records available for your account." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  meta: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  pressed: { opacity: 0.78 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" }
});
*/
