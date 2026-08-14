import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import type { Sponsor } from "@/types";
import { joinMeta } from "@/utils/format";
import { useSponsors } from "./useSponsors";

export function SponsorsOptimizedScreen() {
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useSponsors();
  if (loading && !items.length) return <LoadingState />;

  const childSponsors = items.filter((item) => item.is_child_sponsor).length;
  const staffSponsors = items.filter((item) => item.is_staff_sponsor).length;

  function renderHeader() {
    return (
      <>
        <Text style={styles.screenTitle}>Sponsorship</Text>
        <FeatureCard
          accent="#db2777"
          icon="heart"
          subtitle="Review sponsor records, giving categories, and payment visibility for authorized accounts."
          title="Sponsorship overview"
          value={count || items.length}
          meta={joinMeta([`${childSponsors} child in current page`, `${staffSponsors} staff in current page`])}
        />
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search sponsors" />
        <ResourceError message={error} />
        <SectionHeader title="Your sponsorships" subtitle="Showing a small page first; more records load as needed." />
      </>
    );
  }

  function renderSponsor({ item }: { item: Sponsor }) {
    const title = item.full_name || `${item.first_name} ${item.last_name}`.trim();
    const sponsorTypes = [
      item.is_child_sponsor ? "Child" : "",
      item.is_staff_sponsor ? "Staff" : "",
      item.is_family_supporter ? "Family" : "",
      item.is_general_donor ? "General" : "",
      item.is_one_time_donor ? "One-time" : ""
    ].filter(Boolean);

    return (
      <Pressable onPress={() => router.push(`/(tabs)/sponsors/${item.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.rowTop}>
          <Text style={styles.title}>{title}</Text>
          <StatusBadge tone={item.is_child_sponsor || item.is_staff_sponsor ? "success" : "info"} text={sponsorTypes[0] || "Sponsor"} />
        </View>
        <Text style={styles.subtitle}>{joinMeta([item.prefixed_id, item.email || "No email", item.mobile_telephone])}</Text>
        <Text style={styles.meta}>{sponsorTypes.length ? sponsorTypes.join(" - ") : item.sponsorship_type || "Sponsor"}</Text>
      </Pressable>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderSponsor}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loading && !error ? <ResourceEmpty text={search ? "No sponsors match your search." : "No sponsor records available for your account."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching sponsors are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more sponsorships..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      onRefresh={refresh}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 36 },
  meta: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  pressed: { opacity: 0.78 },
  root: { backgroundColor: colors.background, flex: 1 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  screenTitle: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  title: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" }
});
