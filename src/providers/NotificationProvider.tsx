import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { clearServerNotifications, getUnreadNotificationCount, listUserNotifications, markAllServerNotificationsRead, markServerNotificationRead } from "@/api/notifications";
import type { ServerNotification } from "@/api/notifications";
import { presentServerNotification } from "@/features/notifications/notifications";

export type InboxNotification = {
  body: string;
  data: Record<string, unknown>;
  id: string;
  read: boolean;
  receivedAt: string;
  title: string;
};

function notificationData(item: ServerNotification) {
  return {
    ...item.data,
    event: item.data?.event ?? item.event,
    record_id: item.data?.record_id ?? item.record_id
  };
}

function serverInboxItem(item: ServerNotification): InboxNotification {
  return { body: item.body, data: notificationData(item), id: `server-${item.id}`, read: item.is_read, receivedAt: item.created_at, title: item.title };
}

function sameNotification(a: InboxNotification, b: InboxNotification) {
  return a.id === b.id || (String(a.data.event || "") === String(b.data.event || "")
    && String(a.data.record_id || "") === String(b.data.record_id || "")
    && a.title === b.title
    && a.body === b.body);
}

function isInboxNotification(value: unknown): value is InboxNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InboxNotification>;
  return typeof item.id === "string" && typeof item.title === "string"
    && typeof item.body === "string" && typeof item.read === "boolean"
    && typeof item.receivedAt === "string" && Boolean(item.data)
    && typeof item.data === "object" && !Array.isArray(item.data);
}

type NotificationContextValue = {
  clearAll: () => Promise<void>;
  captureNotification: (notification: Notifications.Notification, read?: boolean) => Promise<void>;
  items: InboxNotification[];
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const MAX_INBOX_ITEMS = 100;

function safeNotificationId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isServerNotificationId(value: unknown) {
  return safeNotificationId(value).startsWith("server-");
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const knownServerIds = useRef(new Set<number>());
  const storageKey = `pendeza-connect.notifications.${user?.id ?? "guest"}`;

  const persist = useCallback(async (next: InboxNotification[]) => {
    setItems(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    setServerUnreadCount(0);
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return () => { active = false; };
    }
    void Promise.allSettled([AsyncStorage.getItem(storageKey), listUserNotifications(), getUnreadNotificationCount()]).then(([localResult, serverResult, countResult]) => {
      if (!active) return;
      let localItems: InboxNotification[] = [];
      if (localResult.status === "fulfilled") {
        try {
          const cached: unknown = localResult.value ? JSON.parse(localResult.value) : [];
          localItems = Array.isArray(cached) ? cached.filter(isInboxNotification) : [];
        } catch { localItems = []; }
      }
      const serverItems: InboxNotification[] = serverResult.status === "fulfilled" ? serverResult.value.map(serverInboxItem) : [];
      knownServerIds.current = new Set(serverResult.status === "fulfilled" ? serverResult.value.map((item) => item.id) : []);
      const merged = [...serverItems, ...localItems.filter((item) => (serverResult.status !== "fulfilled" || !isServerNotificationId(item.id)) && !serverItems.some((serverItem) => sameNotification(serverItem, item)))].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, MAX_INBOX_ITEMS);
      setItems(merged);
      void AsyncStorage.setItem(storageKey, JSON.stringify(merged)).catch(() => undefined);
      setServerUnreadCount(countResult.status === "fulfilled" ? countResult.value : serverItems.filter((item) => !item.read).length);
      setLoading(false);
    });
    return () => { active = false; };
  }, [isAuthenticated, storageKey]);

  const captureNotification = useCallback(async (notification: Notifications.Notification, read = false) => {
    if (!isAuthenticated) return;
    const content = notification.request.content;
    const identifier = safeNotificationId(notification.request.identifier);
    const event = safeNotificationId(content.data?.event);
    const recordId = safeNotificationId(content.data?.record_id);
    const nextItem: InboxNotification = {
      body: content.body || "Open Pendeza Connect to review this update.",
      data: content.data || {},
      id: identifier || `local-${event || "notification"}-${recordId || Date.now()}`,
      read,
      receivedAt: new Date().toISOString(),
      title: content.title || "Pendeza Connect update"
    };
    setItems((current) => {
      const existing = current.find((item) => sameNotification(item, nextItem));
      const mergedItem = existing ? { ...existing, read: read || existing.read } : nextItem;
      const next = [mergedItem, ...current.filter((item) => !sameNotification(item, nextItem))].slice(0, MAX_INBOX_ITEMS);
      void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
    if (read) {
      const serverItems = await listUserNotifications().catch(() => []);
      const matching = serverItems.find((item) => !item.is_read && sameNotification(serverInboxItem(item), nextItem));
      if (matching) {
        const marked = await markServerNotificationRead(matching.id).then(() => true, () => false);
        if (marked) setServerUnreadCount((count) => Math.max(0, count - 1));
      }
    }
  }, [isAuthenticated, storageKey]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const [serverResult, countResult] = await Promise.allSettled([listUserNotifications(), getUnreadNotificationCount()]);
    if (serverResult.status !== "fulfilled") return;
    const newNotifications = serverResult.value.filter((item) => !knownServerIds.current.has(item.id));
    serverResult.value.forEach((item) => knownServerIds.current.add(item.id));
    const serverItems: InboxNotification[] = serverResult.value.map(serverInboxItem);
    setItems((current) => {
      const merged = [...serverItems, ...current.filter((item) => !isServerNotificationId(item.id) && !serverItems.some((serverItem) => sameNotification(serverItem, item)))].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, MAX_INBOX_ITEMS);
      void AsyncStorage.setItem(storageKey, JSON.stringify(merged)).catch(() => undefined);
      return merged;
    });
    setServerUnreadCount(countResult.status === "fulfilled" ? countResult.value : serverItems.filter((item) => !item.read).length);
    // If remote push delivery is delayed, active users still receive an
    // immediate banner and the configured sound when inbox polling finds it.
    newNotifications.slice(0, 3).forEach((item) => {
      void presentServerNotification({ body: item.body, data: notificationData(item), title: item.title }).catch(() => undefined);
    });
  }, [isAuthenticated, storageKey]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => { void captureNotification(notification); });
    return () => subscription.remove();
  }, [captureNotification]);

  const markRead = useCallback(async (id: string) => {
    const notificationId = safeNotificationId(id);
    if (!notificationId) return;
    const wasUnread = items.some((item) => item.id === notificationId && !item.read);
    await persist(items.map((item) => item.id === notificationId ? { ...item, read: true } : item));
    if (isServerNotificationId(notificationId)) {
      const serverId = Number(notificationId.slice(7));
      if (Number.isInteger(serverId)) await markServerNotificationRead(serverId).catch(() => undefined);
      if (wasUnread) setServerUnreadCount((count) => Math.max(0, count - 1));
    }
  }, [items, persist]);
  const markAllRead = useCallback(async () => {
    await persist(items.map((item) => ({ ...item, read: true })));
    setServerUnreadCount(0);
    await markAllServerNotificationsRead().catch(() => undefined);
  }, [items, persist]);
  const clearAll = useCallback(async () => {
    await persist([]);
    setServerUnreadCount(0);
    await clearServerNotifications().catch(() => undefined);
  }, [persist]);
  const localUnreadCount = items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
  const unreadCount = Math.max(serverUnreadCount, localUnreadCount);
  const value = useMemo(() => ({ captureNotification, clearAll, items, loading, markAllRead, markRead, refresh, unreadCount }), [captureNotification, clearAll, items, loading, markAllRead, markRead, refresh, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationsInbox() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotificationsInbox must be used inside NotificationProvider.");
  return value;
}
