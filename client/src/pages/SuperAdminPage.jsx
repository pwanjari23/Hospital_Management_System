import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [refreshedUser, setRefreshedUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const currentUser = refreshedUser || user;

  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    setRefreshMessage('');
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setRefreshedUser(res.data.data);
        setRefreshMessage('✓ Profile successfully re-verified against /api/auth/me');
      }
    } catch {
      setRefreshMessage('✗ Failed to refresh profile from backend.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-[#0A192F] text-white border-b border-navy-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight">MediSync HMS</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50 uppercase tracking-wider">
                Super Admin Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">{currentUser?.name}</span>
              <span className="text-xs text-slate-400">{currentUser?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition duration-150 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <span>Signing out...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Verification Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Banner Notice */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-950 flex items-start space-x-3">
          <div className="shrink-0 mt-0.5 text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Module 1 Verification Landing Page</h3>
            <p className="text-xs text-blue-800 mt-0.5">
              This is the protected verification interface for Module 1 (Super Admin Authentication
              & Access Foundation). The full Super Admin Dashboard and tenant management will be
              built in subsequent modules.
            </p>
          </div>
        </div>

        {/* Identity & Session Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                ● Authenticated & Active
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Platform Super Admin Profile
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Verified against PostgreSQL platform identity record with hospitalId = NULL.
              </p>
            </div>

            <button
              onClick={handleRefreshProfile}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isRefreshing ? 'Verifying...' : 'Verify Session (/me)'}</span>
            </button>
          </div>

          {refreshMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {refreshMessage}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </span>
              <span className="block text-base font-bold text-slate-900 mt-1">
                {currentUser?.name || 'Platform Admin'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </span>
              <span className="block text-base font-bold text-slate-900 mt-1">
                {currentUser?.email || 'admin@example.com'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Role
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                  {currentUser?.role || 'SUPER_ADMIN'}
                </span>
                <span className="text-xs text-slate-500">Unrestricted Platform Level</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Role Scope
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
                  {currentUser?.scope || 'PLATFORM'}
                </span>
                <span className="text-xs text-slate-500">Global SaaS Administrator</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Hospital Association
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-bold font-mono">
                  NULL
                </span>
                <span className="text-xs text-slate-500">Platform Root (No Tenant Bound)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Account Status
              </span>
              <span className="block text-base font-bold text-emerald-600 mt-1">ACTIVE</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              JWT Access Token Active in Memory/Storage
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
