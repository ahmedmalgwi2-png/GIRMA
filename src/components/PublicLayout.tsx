import React, { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface PublicLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentPath,
  navigate,
  children,
}) => {
  const { firebaseUser } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Explore', path: '/explore' },
    { label: 'Funding Hub', path: '/funding' },
    { label: 'Directory', path: '/directory' },
    { label: 'Learning', path: '/learn' },
    { label: 'Pricing', path: '/pricing' },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F1] text-[#17231F] dark:bg-[#0B110F] dark:text-[#ECF1EE] transition-colors">
      <header className="sticky top-0 z-40 bg-[#F8F7F1]/95 dark:bg-[#0B110F]/95 backdrop-blur-sm border-b border-[#17231F]/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="font-display text-xl font-bold tracking-tight text-[#123C32] dark:text-[#57C496] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F7A59]"
          >
            GIRMA
          </button>

          {/* Zone 2: Concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#17231F]/75 dark:text-[#ECF1EE]/75">
            {navItems.map((item) => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#123C32] dark:text-[#57C496] border-[#123C32] dark:border-[#57C496] font-semibold'
                      : 'border-transparent hover:text-[#123C32] dark:hover:text-[#6EE7B7] hover:border-[#123C32]/30 dark:hover:border-[#57C496]/40'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary CTA + Mobile toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav(firebaseUser ? '/app' : '/register')}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1] hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser ? 'Dashboard' : 'Get Started'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 rounded-lg text-[#123C32] dark:text-[#57C496] hover:bg-[#123C32]/10 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#17231F]/10 dark:border-white/10 bg-white dark:bg-[#121B18] px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNav('/about')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]"
            >
              About GIRMA
            </button>
            <button
              type="button"
              onClick={() => handleNav('/how-it-works')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]"
            >
              <span>Appearance</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123C32] dark:text-[#57C496]">
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" /> Dark Mode
                  </>
                )}
              </span>
            </button>
            <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex flex-col gap-2">
              {!firebaseUser && (
                <button
                  type="button"
                  onClick={() => handleNav('/login')}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 text-sm font-semibold text-[#123C32] dark:text-[#57C496]"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={() => handleNav(firebaseUser ? '/app' : '/register')}
                className="w-full px-4 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-sm font-semibold text-[#F8F7F1]"
              >
                {firebaseUser ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#17231F]/10 dark:border-white/10 bg-white dark:bg-[#121B18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2 space-y-3">
              <div className="font-display text-xl font-bold text-[#123C32] dark:text-[#57C496]">GIRMA</div>
              <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] max-w-md leading-relaxed">
                Growth, Innovation, Resources, Markets and Access. Built to ensure African potential does not go to waste simply because access was missing.
              </p>
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
                Initial launch: Northern Nigeria · Expanding across Nigeria &amp; Africa · WAT (Africa/Lagos)
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-[#77817C] dark:text-[#9AA8A1]">
                <li><button type="button" onClick={() => handleNav('/explore')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Explore Opportunities</button></li>
                <li><button type="button" onClick={() => handleNav('/funding')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Funding Hub</button></li>
                <li><button type="button" onClick={() => handleNav('/directory')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Business Directory</button></li>
                <li><button type="button" onClick={() => handleNav('/learn')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Learning Centre</button></li>
                <li><button type="button" onClick={() => handleNav('/pricing')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Plans &amp; Pricing</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-3">Organization</h3>
              <ul className="space-y-2 text-sm text-[#77817C] dark:text-[#9AA8A1]">
                <li><button type="button" onClick={() => handleNav('/about')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">About GIRMA</button></li>
                <li><button type="button" onClick={() => handleNav('/how-it-works')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">How It Works</button></li>
                <li><button type="button" onClick={() => handleNav('/contact')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Contact</button></li>
                <li><button type="button" onClick={() => handleNav('/privacy')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Privacy Policy</button></li>
                <li><button type="button" onClick={() => handleNav('/terms')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Terms of Service</button></li>
                <li><button type="button" onClick={() => handleNav('/login')} className="hover:text-[#123C32] dark:hover:text-[#57C496]">Member Sign In</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[#17231F]/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#77817C] dark:text-[#9AA8A1]">
            <span>© {new Date().getFullYear()} GIRMA Technologies · Where Potential Meets Access · Founder: Ahmed Malgwi</span>
            <div className="flex flex-wrap items-center gap-4">
              <span>Currency: Nigerian Naira (₦) · English (Hausa, Yoruba, Igbo &amp; French roadmap)</span>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-[#F8F7F1] dark:bg-[#17231F] text-[#17231F] dark:text-[#ECF1EE] font-medium hover:border-[#123C32]/40 dark:hover:border-[#57C496]/50 transition-colors"
              >
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#D6A84F]" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#123C32]" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
