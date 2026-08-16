import { Stack } from "expo-router";
import { colors } from "@/constants/theme";
import { PaymentsScreen } from "@/features/payments/PaymentsScreen";

export default function DonateScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "", headerTintColor: colors.text, headerStyle: { backgroundColor: colors.surface }, headerShadowVisible: false }} />
      <PaymentsScreen publicMode />
    </>
  );
}
