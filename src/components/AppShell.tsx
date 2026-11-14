import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Store,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';

interface AppShellProps {
  currentPath: string;
  navigate: (path: string) => void;
  title: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPath,
  navigate,
  title,
  children,
}) => {
  const { firebaseUser, account, isAdmin, logout, resendVerificationEmail, refreshProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const unread = snap.docs.filter((d) => d.data().isRead === false).length;
        setUnreadCount(unread);
      },
      () => {
        setUnreadCount(0);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const navLinks = [
    { label: 'Overview', path: '/app', icon: LayoutDashboard },
    { label: 'Discover Opportunities', path: '/app/opportunities', icon: Compass },
    { label: 'Funding Hub', path: '/app/funding', icon: Landmark },
    { label: 'Business Directory', path: '/app/directory', icon: Building2 },
    { label: 'Markets', path: '/app/markets', icon: Store },
    { label: 'Learning Centre', path: '/app/learn', icon: BookOpen },
    { label: 'Business Toolkit', path: '/app/toolkit', icon: Wrench },
    { label: 'Mentorship', path: '/app/mentorship', icon: Users },
    { label: 'AI Assistant', path: '/app/assistant', icon: MessageSquare },
    { label: 'Notifications', path: '/app/notifications', icon: Bell, badge: unreadCount },
    { label: 'My Profile', path: '/app/profile', icon: User },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    if (q) {
      navigate(`/app/opportunities?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/app/opportunities');
    }
  };

  if (account?.accountStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-[#F8F7F1] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#D94C4C]/30 rounded-xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#17231F]">Account Suspended</h1>
          <p className="text-sm text-[#77817C] leading-relaxed">
            Your GIRMA account is currently suspended by an administrator. Please contact support for review.
          </p>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="w-full py-2.5 px-4 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F1] text-[#17231F] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#17231F]/10">
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#17231F]/10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-display text-xl font-bold tracking-tight text-[#123C32]"
          >
            GIRMA
          </button>
          <span className="text-xs font-mono text-[#77817C] uppercase">
            {account?.plan || 'free'}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === '/app'
                ? currentPath === '/app'
                : currentPath.startsWith(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#123C32] text-[#F8F7F1]'
                    : 'text-[#17231F]/80 hover:bg-[#F8F7F1] hover:text-[#123C32]'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-[#D6A84F] text-[#17231F]' : 'bg-[#123C32]/10 text-[#123C32]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-[#17231F]/10 space-y-1">
            <button
              type="button"
              onClick={() => navigate('/app/applications')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/app/applications' || currentPath === '/app/saved'
                  ? 'bg-[#123C32] text-[#F8F7F1]'
                  : 'text-[#17231F]/80 hover:bg-[#F8F7F1] hover:text-[#123C32]'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>My Applications</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/app/admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  currentPath.startsWith('/app/admin')
                    ? 'bg-[#1F7A59] text-white'
                    : 'text-[#1F7A59] hover:bg-[#1F7A59]/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-[#17231F]/10 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#17231F] truncate">
              {account?.fullName || firebaseUser?.displayName || 'Member'}
            </p>
            <p className="text-xs text-[#77817C] truncate">
              {account?.category || 'Member'} · {account?.state || 'Nigeria'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs font-medium text-[#17231F] hover:bg-[#F8F7F1] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#17231F]/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="lg:hidden font-display text-lg font-bold text-[#123C32] shrink-0"
            >
              GIRMA
            </button>
            <span className="lg:hidden text-[#77817C]">/</span>
            <h1 className="font-display text-base sm:text-lg font-semibold text-[#17231F] truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <Search className="w-4 h-4 text-[#77817C] absolute left-3 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search opportunities, grants..."
                aria-label="Global opportunity search"
                className="pl-9 pr-3 py-1.5 w-56 md:w-64 text-sm rounded-lg bg-[#F8F7F1] border border-[#17231F]/15 focus:outline-none focus:border-[#1F7A59]"
              />
            </form>
            <button
              type="button"
              onClick={() => navigate('/app/notifications')}
              aria-label="Notifications"
              className="relative p-2 rounded-lg hover:bg-[#F8F7F1] text-[#17231F] min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 font-mono text-[10px] bg-[#D94C4C] text-white rounded px-1 tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {firebaseUser && !firebaseUser.emailVerified && (
          <div className="bg-[#E6A23C]/15 border-b border-[#E6A23C]/30 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#17231F]">
              Please verify your email address ({firebaseUser.email}) to unlock saving opportunities, business profiles, and Ask GIRMA.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  setVerifyNotice('Verification email sent. Check your inbox and click Refresh Status.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold whitespace-nowrap"
              >
                Resend Verification
              </button>
              <button
                type="button"
                onClick={() => refreshProfile()}
                className="px-3 py-1.5 rounded-lg border border-[#123C32]/25 bg-white text-xs font-semibold text-[#123C32] whitespace-nowrap"
              >
                Refresh Status
              </button>
            </div>
            {verifyNotice && <span className="w-full text-xs text-[#123C32]">{verifyNotice}</span>}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t border-[#17231F]/10 grid grid-cols-5"
      >
        {[
          { label: 'Home', path: '/app', icon: LayoutDashboard },
          { label: 'Explore', path: '/app/opportunities', icon: Compass },
          { label: 'Toolkit', path: '/app/toolkit', icon: Wrench },
          { label: 'Ask AI', path: '/app/assistant', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            item.path === '/app' ? currentPath === '/app' : currentPath.startsWith(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                navigate(item.path);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-[#123C32] font-semibold' : 'text-[#77817C]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen((v) => !v)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#77817C]"
        >
          {mobileMoreOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Menu Drawer */}
      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 bottom-16 z-30 bg-black/40 flex items-end">
          <div className="w-full bg-white rounded-t-2xl max-h-[75vh] overflow-y-auto p-5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#17231F]/10">
              <span className="font-display font-semibold text-base">All GIRMA Sections</span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="p-2 rounded-lg text-[#77817C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setMobileMoreOpen(false);
                      navigate(item.path);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F8F7F1] text-left text-xs font-medium text-[#17231F]"
                  >
                    <Icon className="w-4 h-4 text-[#123C32] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  navigate('/app/applications');
                }}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F8F7F1] text-left text-xs font-medium text-[#17231F]"
              >
                <Briefcase className="w-4 h-4 text-[#123C32] shrink-0" />
                <span>My Applications</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    navigate('/app/admin');
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-[#1F7A59]/10 text-left text-xs font-semibold text-[#1F7A59]"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Admin Console</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/'))}
              className="w-full mt-3 py-2.5 rounded-lg border border-[#17231F]/15 text-xs font-semibold text-[#D94C4C]"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
