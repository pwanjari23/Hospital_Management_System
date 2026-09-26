import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function HospitalAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/hospital-admin/dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: 'Patients',
      path: '/hospital-admin/patients',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'HOSPITAL_ADMIN':
        return 'Hospital Admin';
      case 'RECEPTIONIST':
        return 'Receptionist';
      case 'DOCTOR':
        return 'Doctor';
      case 'NURSE':
        return 'Nurse';
      case 'PHARMACIST':
        return 'Pharmacist';
      case 'LAB_STAFF':
        return 'Lab Staff';
      default:
        return role || 'Staff';
    }
  };

  const hospitalDisplayName = user?.hospitalName || 'Hospital Workspace';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header - Consistent Navy 900 Platform Header */}
      <header className="bg-navy-900 text-white border-b border-navy-800 sticky top-0 z-40 shadow-soft">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Platform & Hospital Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-xs text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">MediSync HMS</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#132A52] text-[#60A5FA] border border-[#1D3D72] uppercase tracking-wider">
                  {formatRoleLabel(user?.role)}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">
                {user?.name || 'Staff User'}
              </span>
              <span className="text-xs text-slate-400">
                {user?.email || ''}
              </span>
            </div>

            <div className="h-6 w-px bg-navy-800 hidden md:block" />

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition disabled:opacity-50"
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

      {/* Main Container: Full-height Sidebar + Outlet (Identical to SuperAdminLayout) */}
      <div className="flex-1 flex">
        {/* Desktop Full-Height Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 p-4 space-y-6">
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              MANAGEMENT
            </span>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          {/* Active Tenant Badge Card */}
          <div className="mt-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate">{hospitalDisplayName}</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Active Tenant Workspace &bull; <span className="font-medium text-slate-700">{formatRoleLabel(user?.role)}</span>
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
          >
            <div className="w-64 bg-white h-full p-4 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                    {hospitalDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-900 text-sm truncate max-w-[140px]">
                    {hospitalDisplayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="py-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-2">
                  Signed in as <strong className="text-slate-800">{user?.name}</strong>
                  <div className="text-[11px] text-blue-600 font-medium mt-0.5">{formatRoleLabel(user?.role)}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Page Outlet */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
