// src/pages/staff/StaffLoginPage.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
  ChefHat,
  BellRing,
  BedDouble,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function StaffLoginPage() {
  const { staffSignIn, user, restaurant } = useAuth();
  const navigate = useNavigate();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Staff Portal Sign In | Dishgaze';
  }, []);



  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      triggerHaptic('alert');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      triggerHaptic('alert');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');

    try {
      const res = await staffSignIn(cleanMobile, password);
      if (res.error) {
        triggerHaptic('alert');
        setError(res.error);
      } else {
        triggerHaptic('success');
        setSuccessMsg(`Welcome, ${res.staff?.full_name}! Redirecting to your dashboard...`);
        setTimeout(() => {
          navigate('/staff');
        }, 500);
      }
    } catch (err: any) {
      triggerHaptic('alert');
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col justify-between font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Dishgaze" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Dishgaze <span className="text-blue-600 dark:text-blue-400 font-black">Staff</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/admin"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Admin Sign In →
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 animate-scale-in">
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Staff Sign In</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your registered mobile number & password to access your role-specific dashboard.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 mb-5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 font-bold text-xs">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-16 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-500 outline-hidden transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Staff</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        Dishgaze Unified Restaurant & Hotel Management · Secure Staff Portal
      </footer>
    </div>
  );
}
