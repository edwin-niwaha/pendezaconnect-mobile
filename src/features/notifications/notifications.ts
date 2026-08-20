import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { deleteDeviceInstallation, registerDeviceInstallation } from "@/api/notifications";
import {
  clearInstallationRecordId,
  getInstallationRecordId,
  getOrCreateInstallationId,
  getLoanBalanceNoticeKey,
  saveLoanBalanceNoticeKey,
  saveInstallationRecordId
} from "@/utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

async function prepareChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("account-updates", {
    name: "Account updates",
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
  });
}

async function registerCurrentDevice() {
  if (!Device.isDevice || (Platform.OS !== "android" && Platform.OS !== "ios")) {
    throw new Error("Push notifications require a physical Android or iOS device.");
  }
  await prepareChannel();
  const token = await Notifications.getDevicePushTokenAsync();
  const installation = await registerDeviceInstallation({
    app_version: Constants.expoConfig?.version || "unknown",
    installation_id: await getOrCreateInstallationId(),
    notifications_enabled: true,
    platform: Platform.OS,
    push_token: String(token.data)
  });
  await saveInstallationRecordId(installation.id);
}

export async function enablePushNotifications() {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted.");
  await registerCurrentDevice();
}

export async function syncPushNotifications() {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) await registerCurrentDevice();
}

export async function unregisterPushNotifications() {
  const id = await getInstallationRecordId();
  if (!id) return;
  await deleteDeviceInstallation(id);
  await clearInstallationRecordId();
}

export async function notifyRunningLoanBalance({ amount, loanId, noticeKey }: { amount: string; loanId: number; noticeKey: string }) {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted || await getLoanBalanceNoticeKey() === noticeKey) return;
  await prepareChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Running loan balance",
      body: `You currently have ${amount} outstanding. Open your loan to review repayment details.`,
      data: { event: "loan_balance", record_id: loanId }
    },
    trigger: null
  });
  await saveLoanBalanceNoticeKey(noticeKey);
}
