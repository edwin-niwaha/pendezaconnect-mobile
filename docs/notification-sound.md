# Pendeza notification chime

New push notifications and local loan-balance alerts use the original 1.35-second
three-note `pendeza_chime.wav`. Opening the inbox, reading messages, and fetching
historical messages do not generate extra sounds. OS notification permission,
volume, silent mode, Do Not Disturb, and channel preferences remain authoritative.

## Release requirements

- Build and install a new native app. The audio is bundled through the Expo
  notifications plugin and checked into Android `res/raw` for this native project.
- Deploy the matching change in `.backend-work/apps/users/notifications.py`:
  FCM Android `channel_id` is `account-updates-v3`, and `sound` is `pendeza_chime`.
  The backend checkout is a separate Git repository; a mobile commit does not
  include its changes. Do not deploy unrelated backend changes with this fix.
- Keep the channel ID aligned in app.json, notifications.ts, AndroidManifest.xml,
  MainApplication.kt, and the backend sender. A new channel is needed because
  Android does not allow changing a previously created channel's sound.
- The native Android application registers the channel before React starts, so
  background delivery does not depend on a JavaScript callback. Do not delete
  existing channels to override a user's preferences.
- Older app versions do not contain the custom sound/channel and may fall back to
  their existing/default system notification behavior.
- iOS bundles the sound for local notifications. The current server only sends
  Android pushes; remote iOS delivery needs an APNs implementation. Do not send
  the native APNs tokens to Firebase as though they were FCM registration tokens.

## Device verification

1. Install the new build, sign in, and enable Notifications in Account.
2. Trigger a real loan notification for that account with the app in the
   foreground, then repeat with it in the background and with the screen locked.
3. Confirm one chime and one inbox entry per notification; tap it and verify the
   loan opens. Confirm refreshing the inbox does not replay old notifications.
4. Turn the channel sound off or enable Do Not Disturb. Verify those preferences
   are respected. A force-stopped Android app may not receive pushes until opened.

Regenerate both audio copies with `node scripts/generate-notification-sound.cjs`.
Reference: https://docs.expo.dev/versions/v54.0.0/sdk/notifications/
