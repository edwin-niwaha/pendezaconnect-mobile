import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { clearServerNotifications, getUnreadNotificationCount, listUserNotifications, markAllServerNotificationsRead, markServerNotificationRead } from "@/api/notifications";

export type InboxNotification = {
  body: string;
  data: Record<string, unknown>;
  id: string;
  read: boolean;
  receivedAt: string;
  title: string;
};

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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const storageKey = `pendeza-connect.notifications.${user?.id ?? "guest"}`;

  const persist = useCallback(async (next: InboxNotification[]) => {
    setItems(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return () => { active = false; };
    }
    void Promise.allSettled([AsyncStorage.getItem(storageKey), listUserNotifications(), getUnreadNotificationCount()]).then(([localResult, serverResult, countResult]) => {
      if (!active) return;
      let localItems: InboxNotification[] = [];
      if (localResult.status === "fulfilled") {
        try { localItems = localResult.value ? JSON.parse(localResult.value) as InboxNotification[] : []; } catch { localItems = []; }
      }
      const serverItems: InboxNotification[] = serverResult.status === "fulfilled" ? serverResult.value.map((item) => ({ body: item.body, data: item.data, id: `server-${item.id}`, read: item.is_read, receivedAt: item.created_at, title: item.title })) : [];
      const serverKeys = new Set(serverItems.map((item) => `${item.data.event || ""}:${item.data.record_id || ""}:${item.title}`));
      const merged = [...serverItems, ...localItems.filter((item) => !serverKeys.has(`${item.data.event || ""}:${item.data.record_id || ""}:${item.title}`))].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, MAX_INBOX_ITEMS);
      setItems(merged);
      void AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      setServerUnreadCount(countResult.status === "fulfilled" ? countResult.value : serverItems.filter((item) => !item.read).length);
      setLoading(false);
    });
    return () => { active = false; };
  }, [isAuthenticated, storageKey]);

  const captureNotification = useCallback(async (notification: Notifications.Notification, read = false) => {
    if (!isAuthenticated) return;
    const content = notification.request.content;
    const nextItem: InboxNotification = {
      body: content.body || "Open Pendeza Connect to review this update.",
      data: content.data || {},
      id: notification.request.identifier,
      read,
      receivedAt: new Date().toISOString(),
      title: content.title || "Pendeza Connect update"
    };
    setItems((current) => {
      const existing = current.find((item) => item.id === nextItem.id);
      const next = [existing ? { ...nextItem, read: read || existing.read, receivedAt: existing.receivedAt } : nextItem, ...current.filter((item) => item.id !== nextItem.id)].slice(0, MAX_INBOX_ITEMS);
      void AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [isAuthenticated, storageKey]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const [serverResult, countResult] = await Promise.allSettled([listUserNotifications(), getUnreadNotificationCount()]);
    if (serverResult.status !== "fulfilled") return;
    const serverItems: InboxNotification[] = serverResult.value.map((item) => ({ body: item.body, data: item.data, id: `server-${item.id}`, read: item.is_read, receivedAt: item.created_at, title: item.title }));
    setItems((current) => {
      const serverKeys = new Set(serverItems.map((item) => `${item.data.event || ""}:${item.data.record_id || ""}:${item.title}`));
      const merged = [...serverItems, ...current.filter((item) => !item.id.startsWith("server-") && !serverKeys.has(`${item.data.event || ""}:${item.data.record_id || ""}:${item.title}`))].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, MAX_INBOX_ITEMS);
      void AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      return merged;
    });
    setServerUnreadCount(countResult.status === "fulfilled" ? countResult.value : serverItems.filter((item) => !item.read).length);
  }, [isAuthenticated, storageKey]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => { void captureNotification(notification); });
    return () => subscription.remove();
  }, [captureNotification]);

  const markRead = useCallback(async (id: string) => {
    const wasUnread = items.some((item) => item.id === id && !item.read);
    await persist(items.map((item) => item.id === id ? { ...item, read: true } : item));
    if (id.startsWith("server-")) {
      const serverId = Number(id.slice(7));
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
