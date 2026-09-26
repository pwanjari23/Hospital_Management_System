import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [portal, setPortal] = useState('hospital'); // 'hospital' | 'superadmin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        const from = location.state?.from?.pathname?.startsWith('/super-admin')
          ? location.state.from.pathname
          : '/super-admin/dashboard';
        navigate(from, { replace: true });
      } else {
        const from = location.state?.from?.pathname?.startsWith('/hospital-admin')
          ? location.state.from.pathname
          : '/hospital-admin/dashboard';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const isHospital = portal === 'hospital';
      const result = await login(email.trim(), password, isHospital);
      const targetRole = result.user?.role;
      const destination = location.state?.from?.pathname || (
        targetRole === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/hospital-admin/dashboard'
      );
      navigate(destination, { replace: true });
    } catch (err) {
      const apiErrorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.email ||
        err.response?.data?.errors?.password ||
        (err.code === 'ERR_NETWORK'
          ? 'Unable to connect to the healthcare server. Please check your network connection.'
          : 'Invalid email or password.');

      setGeneralError(apiErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC]">
      {/* LEFT SECTION: Platform Healthcare Branding (Hidden on small mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A192F] relative flex-col justify-between p-12 xl:p-16 text-white overflow-hidden">
        {/* Subtle background abstract geometry */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600 blur-3xl"></div>
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-500 blur-3xl"></div>
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-sky-400 blur-3xl"></div>
        </div>

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              {/* Medical Cross Icon */}
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">MediSync HMS</span>
              <span className="block text-xs uppercase tracking-widest text-blue-300 font-medium">
                Enterprise SaaS
              </span>
            </div>
          </div>
        </div>

        {/* Central Narrative */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-xs font-medium text-blue-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Platform Operations Hub</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            One connected platform for smarter healthcare operations.
          </h1>

          <p className="text-slate-300 text-base xl:text-lg leading-relaxed font-normal">
            Secure multi-tenant hospital infrastructure powering patient care, clinical
            administration, and seamless tenant governance with enterprise isolation.
          </p>

          {/* Value Badges */}
          <div className="pt-4 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-white">Strict Tenant Isolation</h4>
              <p className="text-xs text-slate-400 mt-0.5">PostgreSQL row and schema isolation</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-blue-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-white">High Availability</h4>
              <p className="text-xs text-slate-400 mt-0.5">Reliable 24/7 hospital uptime</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} MediSync SaaS Platform</span>
          <span>Security Level: SOC2 / HIPAA Ready</span>
        </div>
      </div>

      {/* RIGHT SECTION: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 xl:p-16">
        <div className="w-full max-w-md">
          {/* Mobile branding header */}
          <div className="lg:hidden flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">MediSync HMS</span>
              <span className="block text-xs uppercase tracking-wider text-slate-500 font-medium">
                Hospital Platform
              </span>
            </div>
          </div>

          {/* Elevated Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-elevated p-8 sm:p-10">
            {/* Portal Switcher Tabs */}
            <div className="flex p-1 mb-6 bg-slate-100/90 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPortal('hospital');
                  setGeneralError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-150 ${
                  portal === 'hospital'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hospital Staff & Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortal('superadmin');
                  setGeneralError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-150 ${
                  portal === 'superadmin'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Super Admin
              </button>
            </div>

            {/* Card Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {portal === 'hospital'
                  ? 'Sign in to your hospital workspace (Admin, Reception, Doctor, Nurse)'
                  : 'Sign in to platform super-administration'}
              </p>
            </div>

            {/* General Error Alert */}
            {generalError && (
              <div
                className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 flex items-start space-x-3 animate-fadeIn"
                role="alert"
                aria-live="assertive"
              >
                <div className="shrink-0 mt-0.5 text-rose-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="text-sm font-medium">{generalError}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    placeholder="admin@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border text-slate-900 text-sm rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      errors.email
                        ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    placeholder="••••••••••••"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={`block w-full pl-11 pr-12 py-3 bg-slate-50 border text-slate-900 text-sm rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  {/* Show/Hide password toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      // Eye Slash
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      // Eye
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>

            {/* Subtext info */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                {portal === 'hospital'
                  ? 'Secure access for authorized hospital staff & medical administrators.'
                  : 'Protected system for authorized platform administrators only.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
