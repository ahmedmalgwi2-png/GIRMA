import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicLayout } from './components/PublicLayout';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import {
  AboutPage,
  ContactPage,
  HowItWorksPage,
  PricingPage,
  PrivacyPage,
  TermsPage,
} from './pages/PublicPages';
import { LoginPage, OnboardingPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { FundingHubPage } from './pages/FundingHubPage';
import { BusinessDirectoryPage, MarketsPage } from './pages/DirectoryAndMarketsPage';
import { LearningCentrePage, MentorshipPage } from './pages/LearningAndMentorshipPage';
import { ToolkitPage } from './pages/ToolkitPage';
import { AssistantPage } from './pages/AssistantPage';
import {
  NotificationsPage,
  ProfileAndBusinessPage,
  SettingsPage,
} from './pages/ProfileNotificationsSettingsPage';
import { AdminConsolePage } from './pages/AdminConsolePage';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F7F1] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#17231F]/10 rounded-2xl p-8 space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#17231F]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#77817C] leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
            >
              Return to GIRMA Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'GIRMA — Where Potential Meets Access',
  '/about': 'About GIRMA',
  '/how-it-works': 'How GIRMA Works',
  '/explore': 'Explore Opportunities — GIRMA',
  '/funding': 'Funding Hub — GIRMA',
  '/directory': 'Business Directory — GIRMA',
  '/learn': 'Learning Centre — GIRMA',
  '/pricing': 'Plans & Pricing — GIRMA',
  '/contact': 'Contact — GIRMA',
  '/login': 'Sign In — GIRMA',
  '/register': 'Create Account — GIRMA',
  '/onboarding': 'Smart Onboarding — GIRMA',
  '/privacy': 'Privacy Policy — GIRMA',
  '/terms': 'Terms of Service — GIRMA',
  '/app': 'Dashboard Overview',
  '/app/opportunities': 'Opportunity Discovery Engine',
  '/app/saved': 'Saved Opportunities',
  '/app/applications': 'My Applications Tracker',
  '/app/funding': 'Funding Hub',
  '/app/directory': 'Business Directory',
  '/app/markets': 'Markets & B2B Connections',
  '/app/learn': 'Learning Centre',
  '/app/toolkit': 'Business Toolkit',
  '/app/assistant': 'Ask GIRMA AI Assistant',
  '/app/mentorship': 'Mentorship & Advisory',
  '/app/notifications': 'Notifications & Deadline Intelligence',
  '/app/profile': 'My Profile',
  '/app/business': 'Business Profile & Verification',
  '/app/settings': 'Settings & Privacy',
  '/app/admin': 'Admin Console',
};

function GirmaRouter() {
  const { firebaseUser, authLoading } = useAuth();
  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setLocationState({ pathname: url.pathname, search: url.search });
    window.scrollTo({ top: 0 });
  }, []);

  const currentPath =
    locationState.pathname.length > 1 && locationState.pathname.endsWith('/')
      ? locationState.pathname.slice(0, -1)
      : locationState.pathname;

  const searchParams = new URLSearchParams(locationState.search);
  const queryText = searchParams.get('q') || '';
  const selectedId = searchParams.get('id') || searchParams.get('highlight') || undefined;

  useEffect(() => {
    document.title = ROUTE_TITLES[currentPath] || 'GIRMA — Growth, Innovation, Resources, Markets and Access';
  }, [currentPath]);

  const isAppRoute = currentPath === '/app' || currentPath.startsWith('/app/');

  useEffect(() => {
    if (!authLoading && isAppRoute && !firebaseUser) {
      navigate('/login');
    }
  }, [authLoading, isAppRoute, firebaseUser, navigate]);

  if (isAppRoute) {
    if (authLoading || !firebaseUser) {
      return (
        <div className="min-h-screen bg-[#F8F7F1] flex items-center justify-center p-6">
          <div className="text-sm font-medium text-[#77817C]">Loading your GIRMA workspace...</div>
        </div>
      );
    }

    const shellTitle = ROUTE_TITLES[currentPath] || 'Workspace';
    let pageNode: React.ReactNode = <DashboardPage navigate={navigate} />;

    switch (currentPath) {
      case '/app':
        pageNode = <DashboardPage navigate={navigate} />;
        break;
      case '/app/opportunities':
        pageNode = (
          <OpportunitiesPage
            navigate={navigate}
            initialQuery={queryText}
            initialSelectedId={selectedId}
            mode="all"
          />
        );
        break;
      case '/app/saved':
        pageNode = (
          <OpportunitiesPage
            navigate={navigate}
            initialQuery={queryText}
            initialSelectedId={selectedId}
            mode="saved"
          />
        );
        break;
      case '/app/applications':
        pageNode = (
          <OpportunitiesPage
            navigate={navigate}
            initialQuery={queryText}
            initialSelectedId={selectedId}
            mode="applications"
          />
        );
        break;
      case '/app/funding':
        pageNode = <FundingHubPage navigate={navigate} isAuthenticated />;
        break;
      case '/app/directory':
        pageNode = <BusinessDirectoryPage navigate={navigate} isAuthenticated />;
        break;
      case '/app/markets':
        pageNode = <MarketsPage navigate={navigate} />;
        break;
      case '/app/learn':
        pageNode = (
          <LearningCentrePage navigate={navigate} initialId={selectedId} isAuthenticated />
        );
        break;
      case '/app/toolkit':
        pageNode = <ToolkitPage />;
        break;
      case '/app/assistant':
        pageNode = <AssistantPage navigate={navigate} />;
        break;
      case '/app/mentorship':
        pageNode = <MentorshipPage />;
        break;
      case '/app/notifications':
        pageNode = <NotificationsPage navigate={navigate} />;
        break;
      case '/app/profile':
        pageNode = <ProfileAndBusinessPage section="profile" />;
        break;
      case '/app/business':
        pageNode = <ProfileAndBusinessPage section="business" />;
        break;
      case '/app/settings':
        pageNode = <SettingsPage />;
        break;
      case '/app/admin':
        pageNode = <AdminConsolePage />;
        break;
      default:
        pageNode = <DashboardPage navigate={navigate} />;
        break;
    }

    return (
      <AppShell currentPath={currentPath} navigate={navigate} title={shellTitle}>
        {pageNode}
      </AppShell>
    );
  }

  let publicNode: React.ReactNode;
  switch (currentPath) {
    case '/':
      publicNode = <LandingPage navigate={navigate} />;
      break;
    case '/about':
      publicNode = <AboutPage navigate={navigate} />;
      break;
    case '/how-it-works':
      publicNode = <HowItWorksPage navigate={navigate} />;
      break;
    case '/explore':
      publicNode = (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <OpportunitiesPage
            navigate={navigate}
            initialQuery={queryText}
            initialSelectedId={selectedId}
            mode="all"
          />
        </div>
      );
      break;
    case '/funding':
      publicNode = (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <FundingHubPage navigate={navigate} isAuthenticated={Boolean(firebaseUser)} />
        </div>
      );
      break;
    case '/directory':
      publicNode = (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <BusinessDirectoryPage navigate={navigate} isAuthenticated={Boolean(firebaseUser)} />
        </div>
      );
      break;
    case '/learn':
      publicNode = (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <LearningCentrePage
            navigate={navigate}
            initialId={selectedId}
            isAuthenticated={Boolean(firebaseUser)}
          />
        </div>
      );
      break;
    case '/pricing':
      publicNode = <PricingPage navigate={navigate} />;
      break;
    case '/contact':
      publicNode = <ContactPage />;
      break;
    case '/login':
      publicNode = <LoginPage navigate={navigate} />;
      break;
    case '/register':
      publicNode = <RegisterPage navigate={navigate} />;
      break;
    case '/onboarding':
      publicNode = <OnboardingPage navigate={navigate} />;
      break;
    case '/privacy':
      publicNode = <PrivacyPage />;
      break;
    case '/terms':
      publicNode = <TermsPage />;
      break;
    default:
      publicNode = <LandingPage navigate={navigate} />;
      break;
  }

  return (
    <PublicLayout currentPath={currentPath} navigate={navigate}>
      {publicNode}
    </PublicLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GirmaRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
