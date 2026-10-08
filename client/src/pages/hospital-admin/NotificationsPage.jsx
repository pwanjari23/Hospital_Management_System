import React, { useState, useEffect, useCallback } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, UNREAD, HIGH
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 15 };
      if (activeTab === 'UNREAD') params.unreadOnly = true;
      if (activeTab === 'HIGH') params.priority = 'HIGH';

      const res = await getNotifications(params);
      setNotifications(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleMarkOne = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Gracefully silent
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Gracefully silent
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time clinical, operational, and administrative notifications for your hospital.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition self-start sm:self-auto flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: 'All Notifications' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'HIGH', label: 'High Priority & Urgent' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List / Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading notifications...
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-rose-600 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="font-semibold text-slate-700">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">You are all caught up with recent updates.</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition hover:bg-slate-50/80 ${
                  !n.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full block ${
                        !n.isRead ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        n.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                        n.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {n.priority}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {n.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-3xl">
                      {n.message}
                    </p>

                    {n.patient && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Patient: <strong className="text-slate-600">{n.patient.firstName} {n.patient.lastName || ''}</strong> ({n.patient.uhid})
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    className="shrink-0 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
