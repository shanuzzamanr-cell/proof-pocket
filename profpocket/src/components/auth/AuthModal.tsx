import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound 
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    resetPassword,
    authLoading,
    authError,
    clearAuthError
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    clearAuthError();
    setLocalError(null);
    setResetSentSuccess(false);
  };

  const handleModeSwitch = (mode: 'login' | 'signup' | 'forgot_password') => {
    setAuthModalMode(mode);
    clearAuthError();
    setLocalError(null);
    setResetSentSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (authModalMode === 'forgot_password') {
      try {
        await resetPassword(email);
        setResetSentSuccess(true);
      } catch {
        // error set in context
      }
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (authModalMode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      try {
        await signUpWithEmail(email, password, name);
      } catch {
        // error set in context
      }
    } else {
      try {
        await signInWithEmail(email, password);
      } catch {
        // error set in context
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {authModalMode === 'login' ? 'Welcome Back' : authModalMode === 'signup' ? 'Create ProofPocket Account' : 'Reset Password'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {authModalMode === 'login' ? 'Sign in to access your cloud vault' : authModalMode === 'signup' ? 'Secure cross-device warranty sync' : 'We will send a reset link to your email'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Error Banner */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Success Banner for Password Reset */}
          {resetSentSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Password reset email sent</p>
                <p className="text-[11px] mt-0.5 text-emerald-700 dark:text-emerald-400">
                  Please check your inbox at <strong>{email}</strong> for instructions to reset your password.
                </p>
              </div>
            </div>
          )}

          {/* Google Sign-In Quick Action */}
          {authModalMode !== 'forgot_password' && (
            <div>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {/* Official Google 'G' icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
                    or with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {authModalMode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('forgot_password')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {authModalMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-10 mt-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {authModalMode === 'login'
                      ? 'Sign In to Vault'
                      : authModalMode === 'signup'
                      ? 'Create Free Account'
                      : 'Send Password Reset Email'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch mode links */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {authModalMode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            ) : authModalMode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Remember your credentials?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
