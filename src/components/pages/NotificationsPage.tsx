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
      setError(err?.message ?? "Failed to mark as read.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-slate-900 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-slate-600 text-sm">
            Updates about your bids and listings.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl border border-forest-200 bg-white text-forest-800 hover:bg-forest-50 text-sm disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="text-slate-600 text-sm">
            You have no notifications yet.
          </div>
        )}

        {items.map(n => (
          <div
            key={n.id}
            className={`rounded-2xl px-4 py-3 border ${n.isRead
                ? "bg-white border-slate-200"
                : "bg-forest-50 border-forest-300"
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
                <span className="text-xs text-slate-500">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
