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
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const { resolvedTheme, toggleTheme } = useTheme();
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
      <div className="min-h-screen bg-[#F8F7F1] dark:bg-[#0B110F] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#121B18] border border-[#D94C4C]/30 rounded-xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Account Suspended</h1>
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
            Your GIRMA account is currently suspended by an administrator. Please contact support for review.
          </p>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="w-full py-2.5 px-4 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F1] dark:bg-[#0B110F] text-[#17231F] dark:text-[#ECF1EE] flex transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-[#121B18] border-r border-[#17231F]/10 dark:border-white/10">
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#17231F]/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-display text-xl font-bold tracking-tight text-[#123C32] dark:text-[#57C496]"
          >
            GIRMA
          </button>
          <span className="text-xs font-mono text-[#77817C] dark:text-[#9AA8A1] uppercase">
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
                    ? 'bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1]'
                    : 'text-[#17231F]/80 dark:text-[#ECF1EE]/80 hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] hover:text-[#123C32] dark:hover:text-[#57C496]'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-[#D6A84F] text-[#17231F]' : 'bg-[#123C32]/10 dark:bg-[#57C496]/15 text-[#123C32] dark:text-[#57C496]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-[#17231F]/10 dark:border-white/10 space-y-1">
            <button
              type="button"
              onClick={() => navigate('/app/applications')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentPath === '/app/applications' || currentPath === '/app/saved'
                  ? 'bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1]'
                  : 'text-[#17231F]/80 dark:text-[#ECF1EE]/80 hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] hover:text-[#123C32] dark:hover:text-[#57C496]'
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
                    : 'text-[#1F7A59] dark:text-[#57C496] hover:bg-[#1F7A59]/10 dark:hover:bg-[#1F7A59]/15'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-[#17231F]/10 dark:border-white/10 space-y-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] truncate">
              {account?.fullName || firebaseUser?.displayName || 'Member'}
            </p>
            <p className="text-xs text-[#77817C] dark:text-[#9AA8A1] truncate">
              {account?.category || 'Member'} · {account?.state || 'Nigeria'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-xs font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] transition-colors"
          >
            <span className="flex items-center gap-2">
              {resolvedTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-[#D6A84F]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#123C32]" />
              )}
              <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
            <span className="font-mono text-[10px] uppercase text-[#77817C] dark:text-[#9AA8A1]">
              {resolvedTheme}
            </span>
          </button>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-xs font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#121B18]/95 backdrop-blur-sm border-b border-[#17231F]/10 dark:border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="lg:hidden font-display text-lg font-bold text-[#123C32] dark:text-[#57C496] shrink-0"
            >
              GIRMA
            </button>
            <span className="lg:hidden text-[#77817C] dark:text-[#9AA8A1]">/</span>
            <h1 className="font-display text-base sm:text-lg font-semibold text-[#17231F] dark:text-[#ECF1EE] truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <Search className="w-4 h-4 text-[#77817C] dark:text-[#9AA8A1] absolute left-3 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search opportunities, grants..."
                aria-label="Global opportunity search"
                className="pl-9 pr-3 py-1.5 w-56 md:w-64 text-sm rounded-lg bg-[#F8F7F1] dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70 border border-[#17231F]/15 dark:border-white/15 focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
              />
            </form>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] text-[#17231F] dark:text-[#ECF1EE] min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D6A84F]" />
              ) : (
                <Moon className="w-4 h-4 text-[#123C32]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/notifications')}
              aria-label="Notifications"
              className="relative p-2 rounded-lg hover:bg-[#F8F7F1] dark:hover:bg-[#17231F] text-[#17231F] dark:text-[#ECF1EE] min-h-[40px] min-w-[40px] flex items-center justify-center"
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
          <div className="bg-[#E6A23C]/15 dark:bg-[#E6A23C]/10 border-b border-[#E6A23C]/30 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#17231F] dark:text-[#ECF1EE]">
              Please verify your email address ({firebaseUser.email}) to unlock saving opportunities, business profiles, and Ask GIRMA.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  setVerifyNotice('Verification email sent. Check your inbox and click Refresh Status.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold whitespace-nowrap"
              >
                Resend Verification
              </button>
              <button
                type="button"
                onClick={() => refreshProfile()}
                className="px-3 py-1.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496] whitespace-nowrap"
              >
                Refresh Status
              </button>
            </div>
            {verifyNotice && <span className="w-full text-xs text-[#123C32] dark:text-[#57C496]">{verifyNotice}</span>}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white dark:bg-[#121B18] border-t border-[#17231F]/10 dark:border-white/10 grid grid-cols-5"
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
                active ? 'text-[#123C32] dark:text-[#57C496] font-semibold' : 'text-[#77817C] dark:text-[#9AA8A1]'
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
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#77817C] dark:text-[#9AA8A1]"
        >
          {mobileMoreOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Menu Drawer */}
      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 bottom-16 z-30 bg-black/50 flex items-end">
          <div className="w-full bg-white dark:bg-[#121B18] rounded-t-2xl max-h-[75vh] overflow-y-auto p-5 space-y-2 border-t border-[#17231F]/10 dark:border-white/10">
            <div className="flex items-center justify-between pb-2 border-b border-[#17231F]/10 dark:border-white/10">
              <span className="font-display font-semibold text-base text-[#17231F] dark:text-[#ECF1EE]">All GIRMA Sections</span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="p-2 rounded-lg text-[#77817C] dark:text-[#9AA8A1]"
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
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F8F7F1] dark:bg-[#17231F] text-left text-xs font-medium text-[#17231F] dark:text-[#ECF1EE]"
                  >
                    <Icon className="w-4 h-4 text-[#123C32] dark:text-[#57C496] shrink-0" />
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
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F8F7F1] dark:bg-[#17231F] text-left text-xs font-medium text-[#17231F] dark:text-[#ECF1EE]"
              >
                <Briefcase className="w-4 h-4 text-[#123C32] dark:text-[#57C496] shrink-0" />
                <span>My Applications</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    navigate('/app/admin');
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-[#1F7A59]/10 dark:bg-[#1F7A59]/20 text-left text-xs font-semibold text-[#1F7A59] dark:text-[#6EE7B7]"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Admin Console</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full mt-2 py-2.5 px-3 rounded-lg border border-[#17231F]/15 dark:border-white/15 flex items-center justify-between text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE]"
            >
              <span>Theme Appearance</span>
              <span className="inline-flex items-center gap-1.5 text-[#123C32] dark:text-[#57C496]">
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#D6A84F]" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" /> Dark Mode
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => logout().then(() => navigate('/'))}
              className="w-full mt-2 py-2.5 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-xs font-semibold text-[#D94C4C] dark:text-[#F87171]"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
