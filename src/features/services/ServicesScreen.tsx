import { router } from "expo-router";
import { FeatureCard, SectionHeader } from "@/components/Polished";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { isClientAccount, isSponsorAccount, isStaffAccount } from "@/utils/roles";

export function ServicesScreen() {
  const { user } = useAuth();
  const staff = isStaffAccount(user);
  const canUseSponsorship = staff || isSponsorAccount(user);
  const canUseLoans = staff || isClientAccount(user);
  const canUseSavings = staff || isClientAccount(user);

  return (
    <Screen>
      <SectionHeader title="Focused modules" subtitle="Fewer tabs, clearer paths. Only allowed services are shown for your account." />
      {canUseSponsorship ? (
        <FeatureCard accent="#db2777" icon="heart" onPress={() => router.push("/(tabs)/sponsors")} subtitle="Sponsors, child support, and giving history." title="Sponsorship" />
      ) : null}
      {canUseLoans ? (
        <FeatureCard accent={colors.accent} icon="cash" onPress={() => router.push("/(tabs)/loans")} subtitle="Loan statuses, balances, due dates, and repayment visibility." title="Loans" />
      ) : null}
      {canUseSavings ? (
        <FeatureCard accent="#16a34a" icon="wallet" onPress={() => router.push("/(tabs)/savings")} subtitle="Savings balances, accounts, and recent transaction activity." title="Savings" />
      ) : null}
      {staff ? (
        <FeatureCard accent={colors.primaryDark} icon="camera" onPress={() => router.push("/(tabs)/children")} subtitle="Capture and upload child profile photos in the field." title="Child photos" />
      ) : null}
    </Screen>
  );
}
