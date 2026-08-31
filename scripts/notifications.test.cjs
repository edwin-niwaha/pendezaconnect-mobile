const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function setup(platform = "android", granted = true, previousNotice = null) {
  const calls = [];
  const notifications = {
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationVisibility: { PRIVATE: 0 },
    setNotificationHandler: (handler) => { notifications.handler = handler; },
    setNotificationChannelAsync: async (...args) => { calls.push(["channel", ...args]); },
    requestPermissionsAsync: async () => { calls.push(["permission"]); return { granted }; },
    getPermissionsAsync: async () => ({ granted }),
    getDevicePushTokenAsync: async () => { calls.push(["token"]); return { data: "device-token" }; },
    scheduleNotificationAsync: async (payload) => { calls.push(["schedule", payload]); }
  };
  const mocks = {
    "expo-constants": { default: { expoConfig: { version: "1.0.0" } } },
    "expo-device": { isDevice: true },
    "expo-notifications": notifications,
    "react-native": { Platform: { OS: platform } },
    "@/api/notifications": { registerDeviceInstallation: async () => ({ id: 1 }) },
    "@/utils/storage": {
      getOrCreateInstallationId: async () => "installation",
      saveInstallationRecordId: async () => {},
      getLoanBalanceNoticeKey: async () => previousNotice,
      saveLoanBalanceNoticeKey: async () => {}
    }
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/features/notifications/notifications.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const context = { exports: {}, require: (name) => {
    assert.ok(name in mocks, `Unexpected import: ${name}`);
    return mocks[name];
  } };
  vm.runInNewContext(compiled, context);
  return { api: context.exports, calls, notifications };
}

test("Android creates a custom-sound channel before requesting permission", async () => {
  const { api, calls } = setup();
  await api.enablePushNotifications();
  assert.equal(calls[0][0], "channel");
  assert.equal(calls[0][1], "account-updates-v3");
  assert.equal(calls[0][2].sound, "pendeza_chime.wav");
  assert.equal(calls[1][0], "permission");
  assert.ok(calls.find((call) => call[0] === "token"));
});

test("denied permission does not register a token or schedule an alert", async () => {
  const { api, calls } = setup("android", false);
  await assert.rejects(api.enablePushNotifications(), /not granted/);
  await api.notifyRunningLoanBalance({ amount: "100", loanId: 1, noticeKey: "new" });
  assert.ok(!calls.some(([kind]) => kind === "token" || kind === "schedule"));
});

test("local alerts use the chime on both platforms and retain the loan destination", async () => {
  for (const platform of ["android", "ios"]) {
    const { api, calls } = setup(platform);
    await api.notifyRunningLoanBalance({ amount: "100", loanId: 42, noticeKey: "new" });
    const payload = calls.find(([kind]) => kind === "schedule")[1];
    assert.equal(payload.content.sound, "pendeza_chime.wav");
    assert.equal(payload.content.data.record_id, 42);
    assert.equal(payload.content.data.event, "loan_balance");
    if (platform === "android") assert.equal(payload.trigger.channelId, "account-updates-v3");
    else assert.equal(payload.trigger, null);
  }
});

test("previously announced loan balances do not replay", async () => {
  const { api, calls } = setup("android", true, "seen");
  await api.notifyRunningLoanBalance({ amount: "100", loanId: 1, noticeKey: "seen" });
  assert.ok(!calls.some(([kind]) => kind === "schedule"));
});

test("foreground notifications request sound and visual presentation", async () => {
  const { notifications } = setup();
  const behavior = await notifications.handler.handleNotification();
  assert.equal(behavior.shouldPlaySound, true);
  assert.equal(behavior.shouldShowBanner, true);
  assert.equal(behavior.shouldShowList, true);
});
