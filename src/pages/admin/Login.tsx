import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  X,
  Headphones,
  Store,
  User,
  Phone,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { triggerHaptic } from '@/lib/haptics';

export default function Login() {
  const { signIn, signUp } = useAuth();

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Form State
  const [signupForm, setSignupForm] = useState({
    name: '',
    owner_name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    document.title = mode === 'signin' ? 'Sign In | Dishgaze Admin' : 'Register Restaurant | Dishgaze';
  }, [mode]);

  // 1-Click Quick Super Admin Login
  const handleQuickSuperAdminLogin = async () => {
    triggerHaptic('medium');
    setEmail('akshay44x@gmail.com');
    setPassword('Sayghar@3689#');
    setError(null);
    setLoading(true);

    const { error: signErr } = await signIn('akshay44x@gmail.com', 'Sayghar@3689#');
    setLoading(false);

    if (signErr) {
      triggerHaptic('alert');
      setError(signErr);
    } else {
      triggerHaptic('success');
    }
  };

  // 1-Click Quick Restaurant Demo Login
  const handleQuickDemoLogin = async () => {
    triggerHaptic('medium');
    setEmail('admin@resto.com');
    setPassword('Admin@123');
    setError(null);
    setLoading(true);

    const { error: signErr } = await signIn('admin@resto.com', 'Admin@123');
    setLoading(false);

    if (signErr) {
      triggerHaptic('alert');
      setError(signErr);
    } else {
      triggerHaptic('success');
    }
  };

  // Handle Sign In Submit
  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      triggerHaptic('alert');
      setError('Please enter both your email address and password.');
      return;
    }

    triggerHaptic('medium');
    setError(null);
    setLoading(true);

    const { error: signErr } = await signIn(email.trim(), password);
    setLoading(false);

    if (signErr) {
      triggerHaptic('alert');
      setError(signErr);
    } else {
      triggerHaptic('success');
    }
  }

  // Handle Sign Up Submit
  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!signupForm.name.trim()) {
      setError('Please enter your restaurant name.');
      return;
    }
    if (!signupForm.email.trim()) {
      setError('Please enter your business email.');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);

    const { error: signErr } = await signUp({
      name: signupForm.name.trim(),
      owner_name: signupForm.owner_name.trim(),
      email: signupForm.email.trim().toLowerCase(),
      mobile: signupForm.mobile.trim(),
      password: signupForm.password,
    });

    setLoading(false);

    if (signErr) {
      triggerHaptic('alert');
      setError(signErr);
    } else {
      triggerHaptic('success');
      setSuccessMsg('Restaurant registered successfully! Loading your dashboard...');
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#F8F7F3] via-[#FAF9F5] to-[#F1EDE4] text-slate-900 relative selection:bg-emerald-600 selection:text-white">
      {/* Background ambient glowing shapes */}
      <div className="pointer-events-none absolute -left-36 top-16 size-80 rounded-full bg-[#0F766E]/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 top-10 size-96 rounded-full bg-[#C59D5F]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 size-96 rounded-full bg-[#0F766E]/5 blur-3xl" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 px-4 sm:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0D665F] text-white shadow-lg shadow-[#0F766E]/20 transition-transform group-hover:scale-105">
            <UtensilsCrossed className="size-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
              Dish<span className="text-[#C59D5F]">Gaze</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Restaurant Portal
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white/80 border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-xs transition hover:bg-white"
        >
          <span>Customer Menu</span>
          <ArrowRight className="size-3" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="rounded-[32px] border border-[#E7E2D8] bg-[#FFFCF7]/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            {/* Header Icon & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#0D665F] text-white shadow-lg shadow-[#0F766E]/20 mb-3.5">
                <Store className="size-7" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {mode === 'signin' ? 'Restaurant Staff Sign In' : 'Register New Restaurant'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {mode === 'signin'
                  ? 'Access live table orders, menu control, and sales analytics'
                  : 'Start accepting digital table orders in minutes'}
              </p>
            </div>

            {/* Staff Portal Link Banner */}
            <div className="mb-4">
              <Link
                to="/staff/login"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 transition native-press text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Restaurant & Hotel Staff? Sign in here</span>
                </div>
                <span className="text-blue-600 font-extrabold">Staff Login →</span>
              </Link>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-2xl bg-slate-100/90 p-1 mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Restaurant
              </button>
            </div>

            {/* 1-Click Quick Demo Login Banner (Only in Sign In mode) */}
            {mode === 'signin' && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-left space-y-3">
                {/* Super Admin Quick Box */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                      <ShieldCheck className="size-3.5 text-amber-600" />
                      <span>Super Admin (All Restaurants)</span>
                    </div>
                    <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                      Super
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-mono font-medium mb-2">
                    akshay44x@gmail.com · Sayghar@3689#
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickSuperAdminLogin}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-slate-950 shadow-xs active:scale-[0.98] transition disabled:opacity-50"
                  >
                    <Sparkles className="size-3" />
                    <span>Login as Super Admin</span>
                  </button>
                </div>

                {/* Restaurant Demo Quick Box */}
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                      <Store className="size-3.5 text-emerald-600" />
                      <span>Restaurant Manager (Spice Garden)</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                      Demo
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono font-medium mb-2">
                    admin@resto.com · Admin@123
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-[0.98] transition disabled:opacity-50"
                  >
                    <Sparkles className="size-3" />
                    <span>Login as Restaurant Staff</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl p-3.5 mb-5 animate-in fade-in">
                <AlertCircle className="size-4 mt-0.5 shrink-0 text-rose-600" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-3.5 mb-5 animate-in fade-in">
                <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                <span className="font-semibold leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email or Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="akshay44x@gmail.com or admin@resto.com"
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span>Remember on this device</span>
                  </label>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#0D665F] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0F766E]/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Signing In…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                {/* Restaurant Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Restaurant / Cafe Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      required
                      placeholder="e.g. Spice Garden Restaurant"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Owner Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Owner / Manager Name
                  </label>
                  <div className="relative">
                    <User className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={signupForm.owner_name}
                      onChange={(e) => setSignupForm({ ...signupForm, owner_name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      placeholder="owner@myrestaurant.com"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Contact Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={signupForm.mobile}
                      onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      placeholder="Repeat password"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#0D665F] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0F766E]/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Registering Restaurant…</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Security note */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Secure SSL Encrypted Restaurant Portal</span>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-[#E7E2D8] bg-[#FFFCF7] p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500">Dishgaze Restaurant Support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="size-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 py-2 text-center">
              <div className="size-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
                <Headphones className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-900">Need Help Accessing Your Account?</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Contact the Dishgaze support team to verify your restaurant credentials and reset your password.
                </p>
              </div>

              <div className="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200 text-left space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Support Desk:</span>
                  <a
                    href="mailto:support@dishgaze.com?subject=Password%20Reset%20Request"
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    support@dishgaze.com
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <a
                  href="mailto:support@dishgaze.com?subject=Password%20Reset%20Request"
                  className="w-full rounded-xl bg-emerald-600 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition"
                >
                  <Mail className="size-3.5" />
                  <span>Email Support</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Dishgaze. Smart Restaurant QR Menu & Management System.</p>
      </footer>
    </div>
  );
}