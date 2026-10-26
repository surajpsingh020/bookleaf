import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BookOpen, Shield, LogOut, Radio, UserCheck, ChevronDown, Check } from 'lucide-react';

interface NavbarProps {
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isConnected }) => {
  const { user, logout, switchUser } = useAuth();
  const [demoUsers, setDemoUsers] = useState<any>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    api.getDemoUsers().then((res) => setDemoUsers(res)).catch(() => {});
  }, []);

  const handleQuickSwitch = async (email: string, pass: string) => {
    setIsSwitching(true);
    try {
      await switchUser(email, pass);
      setShowSwitchModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">BookLeaf</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Publishing
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {user?.role === 'admin' ? 'Operations & Author Support Hub' : 'Author Portal & Royalty Dashboard'}
              </p>
            </div>
          </div>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-4">
            {/* Realtime SSE Connection Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'Live real-time updates active via SSE' : 'Reconnecting to stream...'}
            >
              <Radio className={`h-3.5 w-3.5 ${isConnected ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
              <span>{isConnected ? 'Live Sync Active' : 'Connecting...'}</span>
            </div>

            {/* Quick Demo Switcher Pill for Hiring Evaluators */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchModal(!showSwitchModal)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 transition"
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden md:inline">Quick Test Switcher</span>
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>

              {showSwitchModal && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">1-Click Evaluator Switcher</p>
                    <p className="text-[11px] text-slate-500">Switch roles without typing passwords</p>
                  </div>

                  <div className="p-1 space-y-1 max-h-80 overflow-y-auto">
                    {/* Admin Switch */}
                    <button
                      onClick={() => handleQuickSwitch('admin@bookleafpub.com', 'admin123')}
                      disabled={isSwitching}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                        user?.role === 'admin'
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                        <div>
                          <p className="font-medium">Operations Admin</p>
                          <p className="text-[10px] text-slate-400">admin@bookleafpub.com</p>
                        </div>
                      </div>
                      {user?.role === 'admin' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>

                    <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Sample Authors ({demoUsers?.authors?.length || 0})
                    </div>

                    {demoUsers?.authors?.map((a: any) => {
                      const isCurrent = user?.authorId === a.authorId;
                      return (
                        <button
                          key={a.authorId}
                          onClick={() => handleQuickSwitch(a.email, demoUsers?.defaultAuthorPassword || 'password123')}
                          disabled={isSwitching}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left transition ${
                            isCurrent
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{a.name}</p>
                            <p className="text-[10px] text-slate-400">{a.email}</p>
                          </div>
                          {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
