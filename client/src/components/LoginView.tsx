import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-emerald-500 items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 mb-4">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">BookLeaf Publishing</h2>
        <p className="mt-2 text-sm text-slate-400">Author Support & Operations Communication Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. priya.sharma@email.com"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Evaluator Access Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>One-Click Evaluator Testing</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Select any pre-configured test account to load credentials:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@bookleafpub.com', 'admin123')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">Operations Admin (BookLeaf Desk)</p>
                    <p className="text-[11px] text-slate-400">Triage queue, AI draft reviews, category overrides</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('priya.sharma@email.com', 'password123')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg group-hover:bg-sky-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">Priya Sharma (Author - 2 Titles)</p>
                    <p className="text-[11px] text-slate-400">Published books, pending royalty: ₹3,570</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                  Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('sneha.kulkarni@email.com', 'password123')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">Sneha Kulkarni (Production Edge Case)</p>
                    <p className="text-[11px] text-slate-400">Has book currently in "Cover Design" stage</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                  Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('kavita.deshmukh@email.com', 'password123')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">Kavita Deshmukh (Sub-Threshold Edge Case)</p>
                    <p className="text-[11px] text-slate-400">Pending royalty ₹850 (&lt; ₹1,000 policy rollover)</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  Fill
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
