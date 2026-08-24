import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import type { Sponsor } from "@/types";
import { joinMeta } from "@/utils/format";
import { useSponsors } from "./useSponsors";

const categories = [
  { label: "All", value: "all" },
  { label: "Child", value: "child" },
  { label: "Staff", value: "staff" },
  { label: "Family", value: "family" },
  { label: "General", value: "general" },
  { label: "One-time", value: "one_time" }
] as const;

function sponsorTitle(sponsor: Sponsor) {
  return sponsor.full_name || `${sponsor.first_name || ""} ${sponsor.last_name || ""}`.trim() || `Sponsor #${sponsor.id}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

function sponsorTypes(sponsor: Sponsor) {
  return [
    sponsor.is_child_sponsor ? "Child" : "",
    sponsor.is_staff_sponsor ? "Staff" : "",
    sponsor.is_family_supporter ? "Family" : "",
    sponsor.is_general_donor ? "General" : "",
    sponsor.is_one_time_donor ? "One-time" : ""
  ].filter(Boolean);
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const title = sponsorTitle(sponsor);
  const types = sponsorTypes(sponsor);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/(tabs)/sponsors/${sponsor.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(title)}</Text></View>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>{title}</Text>
          <Text numberOfLines={1} style={styles.identifier}>{sponsor.prefixed_id || `Sponsor #${sponsor.id}`}</Text>
        </View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </View>
      <View style={styles.tags}>
        {(types.length ? types : [sponsor.sponsorship_type || "Sponsor"]).map((type) => <View key={type} style={styles.tag}><Ionicons color="#be185d" name="heart" size={12} /><Text style={styles.tagText}>{type}</Text></View>)}
      </View>
      <View style={styles.contactRow}>
        <Ionicons color={colors.muted} name={sponsor.mobile_telephone ? "call-outline" : "mail-outline"} size={15} />
        <Text numberOfLines={1} style={styles.contact}>{joinMeta([sponsor.mobile_telephone, sponsor.email || "No contact recorded"])}</Text>
      </View>
    </Pressable>
  );
}

export function SponsorsOptimizedScreen() {
  const [category, setCategory] = useState("all");
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useSponsors(category);
  if (loading && !items.length) return <LoadingState />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <SponsorCard sponsor={item} />}
      ListHeaderComponent={(
        <>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}><Text style={styles.screenTitle}>Sponsorship</Text><Text style={styles.headingSubtitle}>Sponsors and support programmes</Text></View>
            <View style={styles.totalBadge}><Ionicons color="#be185d" name="heart" size={17} /><Text style={styles.totalValue}>{count}</Text></View>
          </View>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Search sponsors by name or email" />
          <View style={styles.filterHeading}><Text style={styles.filterLabel}>Support category</Text><Text style={styles.resultText}>{count} result{count === 1 ? "" : "s"}</Text></View>
          <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((item) => {
              const active = category === item.value;
              return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.value} onPress={() => setCategory(item.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>;
            })}
          </ScrollView>
          <ResourceError message={error} />
          <Text style={styles.sectionTitle}>Sponsor records</Text>
        </>
      )}
      ListEmptyComponent={!loading && !error ? <ResourceEmpty text={search ? "No sponsors match your search and selected category." : category === "all" ? "No sponsor records are available for your account." : "No sponsors are available in this category."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching sponsors are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more sponsorships..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
      contentContainerStyle={styles.content}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      removeClippedSubviews
      onRefresh={refresh}
      style={styles.root}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#fce7f3", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#be185d", fontSize: 15, fontWeight: "900" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  cardTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  contact: { color: colors.muted, flex: 1, fontSize: 12 },
  contactRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: 36 },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: "#be185d", borderColor: "#be185d" },
  filterHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  filterLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  headingCopy: { flex: 1 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg },
  headingSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  identifier: { color: colors.muted, fontSize: 12, marginTop: 3 },
  identity: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.995 }] },
  resultText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  root: { backgroundColor: colors.background, flex: 1 },
  screenTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.md, marginTop: spacing.lg },
  tag: { alignItems: "center", backgroundColor: "#fdf2f8", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  tagText: { color: "#9d174d", fontSize: 10, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  totalBadge: { alignItems: "center", backgroundColor: "#fce7f3", borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, minHeight: 42, paddingHorizontal: spacing.md },
  totalValue: { color: "#be185d", fontSize: 18, fontWeight: "900" }
});
