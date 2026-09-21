import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function SetupPage() {
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [healthMessage, setHealthMessage] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  const checkBackendHealth = useCallback(async () => {
    setHealthStatus('checking');
    try {
      const response = await api.get('/health');
      if (response.data && response.data.success) {
        setHealthStatus('connected');
        setHealthMessage(response.data.message || 'HMS API is running');
      } else {
        setHealthStatus('error');
        setHealthMessage('Unexpected response from health check');
      }
    } catch (err) {
      setHealthStatus('error');
      setHealthMessage(err.message || 'Unable to connect to backend server');
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
        {/* Logo / Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Hospital Management System
        </h1>

        <p className="mt-2 text-sm font-medium text-emerald-400 tracking-wide uppercase">
          Project Setup Successful
        </p>

        <p className="mt-3 text-xs text-slate-400">
          Foundation & development environment initialized (Step 1)
        </p>

        {/* Backend Status Card */}
        <div className="mt-8 pt-6 border-t border-slate-700/80">
          <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-left">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Backend Status
              </span>
              <span className="text-sm font-medium text-slate-200 mt-0.5 block">
                {healthStatus === 'checking' && 'Pinging /api/health...'}
                {healthStatus === 'connected' && (healthMessage || 'HMS API is running')}
                {healthStatus === 'error' && 'Unable to connect'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {healthStatus === 'checking' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Checking
                </span>
              )}
              {healthStatus === 'connected' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400"></span>
                  Connected
                </span>
              )}
              {healthStatus === 'error' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-400"></span>
                  Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Action / Refresh */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>{lastChecked ? `Last checked: ${lastChecked}` : ''}</span>
            <button
              onClick={checkBackendHealth}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
