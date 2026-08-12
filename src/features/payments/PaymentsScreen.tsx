import { RowCard } from "@/components/Card";
import { LoadingState, Screen } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { ResourceEmpty, ResourceError } from "@/features/shared/ResourceStates";
import { formatCurrency, formatDate, joinMeta } from "@/utils/format";
import { usePayments } from "./usePayments";

export function PaymentsScreen() {
  const { error, items, loading, search, setSearch } = usePayments();
  if (loading && !items.length) return <LoadingState />;
  return (
    <Screen title="Payments">
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search payments" />
      <ResourceError message={error} />
      {items.length ? items.map((item) => (
        <RowCard key={item.id} title={joinMeta([item.sponsor_name, formatCurrency(item.amount)])} subtitle={joinMeta([item.program_name || "Sponsor payment", formatDate(item.payment_date)])} meta={item.reference || item.sponsor_code} />
      )) : <ResourceEmpty text="No payments found." />}
    </Screen>
  );
}
