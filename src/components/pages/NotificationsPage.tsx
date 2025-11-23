import { useEffect, useState } from "react";
import {
  api_getNotifications,
  api_markNotificationsRead,
  type BuyerNotification,
} from "../api/api";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const [items, setItems] = useState<BuyerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { items, unreadCount } = await api_getNotifications();
      setItems(items);
      setUnreadCount(unreadCount);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    try {
      await api_markNotificationsRead({ ids: [] });
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to mark as read.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 text-white space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-white/60 text-sm">
            Updates about your bids and listings.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg:white/15 text-sm"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-sm disabled:opacity-40"
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="text-white/60 text-sm">
            You have no notifications yet.
          </div>
        )}

        {items.map(n => (
          <div
            key={n.id}
            className={`rounded-2xl px-4 py-3 bg-slate-900/80 border ${
              n.isRead ? "border-transparent" : "border-forest-500"
            } flex items-start gap-3`}
          >
            <div className="mt-1">
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-forest-400 inline-block" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-sm">{n.title}</h2>
                <span className="text-xs text-white/50">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              <p className="text-sm text-white/80 mt-1">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
