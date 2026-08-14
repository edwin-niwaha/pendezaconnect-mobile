import { RowCard } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, joinMeta } from "@/utils/format";
import { FlatList, StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/constants/theme";
import { usePayments } from "./usePayments";

export function PaymentsScreen() {
  const { error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = usePayments();
  if (loading && !items.length) return <LoadingState />;
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <RowCard title={joinMeta([item.sponsor_name, formatCurrency(item.amount)])} subtitle={joinMeta([item.program_name || "Sponsor payment", formatDate(item.payment_date)])} meta={item.reference || item.sponsor_code} />}
      ListHeaderComponent={(
        <>
          <Text style={styles.title}>Payments</Text>
          <SearchBox value={search} onChangeText={setSearch} placeholder="Search payments" />
          <ResourceError message={error} />
        </>
      )}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No payments match your search." : "No payments found."} /> : null}
      ListFooterComponent={<PaginatedListFooter endText="All matching payments are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more payments..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
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
  root: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 36 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg }
});
