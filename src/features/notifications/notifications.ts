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

// Android channel sounds are immutable; keep this ID aligned with the push server.
export const ACCOUNT_UPDATES_CHANNEL_ID = "account-updates-v3";
const NOTIFICATION_SOUND = "pendeza_chime.wav";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

async function prepareChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ACCOUNT_UPDATES_CHANNEL_ID, {
    name: "Account updates · Pendeza chime",
    description: "Loan, savings, inventory, payment, and account updates",
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: NOTIFICATION_SOUND,
    enableVibrate: true,
    vibrationPattern: [0, 160, 100, 160]
  });
}

async function registerDeviceToken(pushToken: Notifications.DevicePushToken) {
  const installation = await registerDeviceInstallation({
    app_version: Constants.expoConfig?.version || "unknown",
    installation_id: await getOrCreateInstallationId(),
    notifications_enabled: true,
    platform: Platform.OS as "android" | "ios",
    push_token: String(pushToken.data)
  });
  await saveInstallationRecordId(installation.id);
}

async function registerCurrentDevice() {
  if (!Device.isDevice || (Platform.OS !== "android" && Platform.OS !== "ios")) {
    throw new Error("Push notifications require a physical Android or iOS device.");
  }
  await prepareChannel();
  const token = await Notifications.getDevicePushTokenAsync();
  await registerDeviceToken(token);
}

export function subscribeToPushTokenChanges() {
  return Notifications.addPushTokenListener((token) => {
    void registerDeviceToken(token).catch(() => undefined);
  });
}

export async function enablePushNotifications() {
  // Android 13 requires a channel before prompting for notification permission.
  await prepareChannel();
  const permission = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true }
  });
  if (!permission.granted) throw new Error("Notification permission was not granted.");
  await registerCurrentDevice();
}

export async function syncPushNotifications() {
  await prepareChannel();
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
      data: { event: "loan_balance", record_id: loanId },
      sound: NOTIFICATION_SOUND
    },
    trigger: Platform.OS === "android" ? { channelId: ACCOUNT_UPDATES_CHANNEL_ID } : null
  });
  await saveLoanBalanceNoticeKey(noticeKey);
}

export async function presentServerNotification({ body, data, title }: { body: string; data: Record<string, unknown>; title: string }) {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await prepareChannel();
  await Notifications.scheduleNotificationAsync({
    content: { body, data, sound: NOTIFICATION_SOUND, title },
    trigger: Platform.OS === "android" ? { channelId: ACCOUNT_UPDATES_CHANNEL_ID } : null
  });
}
