import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  Landmark,
  MessageSquare,
  Users,
  Wrench,
} from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
  calculateProfileCompletion,
  computeGirmaMatch,
  formatNaira,
} from '../lib/matchingEngine';
import {
  LearningResource,
  MentorProfile,
  NotificationItem,
  Opportunity,
  OpportunityApplication,
} from '../types/girma';

interface DashboardPageProps {
  navigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { firebaseUser, account, businessProfile, studentProfile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      if (!firebaseUser) return;
      try {
        const [oppSnap, learnSnap, mentorSnap] = await Promise.all([
          getDocs(query(collection(db, 'opportunities'), where('status', '==', 'published'), limit(25))),
          getDocs(query(collection(db, 'learning_resources'), where('isPublished', '==', true), limit(4))),
          getDocs(query(collection(db, 'mentor_profiles'), where('approvalStatus', '==', 'approved'), limit(4))),
        ]);

        let appDocs: OpportunityApplication[] = [];
        let notifDocs: NotificationItem[] = [];
        if (firebaseUser.emailVerified) {
          const [appSnap, notifSnap] = await Promise.all([
            getDocs(query(collection(db, 'opportunity_applications'), where('userId', '==', firebaseUser.uid))),
            getDocs(query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid), limit(8))),
          ]);
          appDocs = appSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OpportunityApplication));
          notifDocs = notifSnap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
        }

        if (!active) return;
        setOpportunities(oppSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity)));
        setApplications(appDocs);
        setNotifications(notifDocs);
        setResources(learnSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LearningResource)));
        setMentors(mentorSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MentorProfile)));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(account, businessProfile, studentProfile),
    [account, businessProfile, studentProfile]
  );

  const isEntrepreneur = ['Entrepreneur', 'Small Business Owner', 'Startup Founder'].includes(
    account?.category || ''
  );
  const isStudent = ['Student', 'Graduate'].includes(account?.category || '');

  const matchedOpportunities = useMemo(() => {
    const scored = opportunities.map((opp) => ({
      opp,
      match: computeGirmaMatch(opp, account, businessProfile, studentProfile),
    }));

    if (isStudent) {
      const studentPriority = new Set([
        'Scholarships',
        'Fellowships',
        'Internships',
        'Business Competitions',
        'Training Programmes',
        'Jobs',
      ]);
      scored.sort((a, b) => {
        const aBoost = studentPriority.has(a.opp.category) ? 15 : 0;
        const bBoost = studentPriority.has(b.opp.category) ? 15 : 0;
        return b.match.score + bBoost - (a.match.score + aBoost);
      });
    } else {
      scored.sort((a, b) => b.match.score - a.match.score);
    }
    return scored;
  }, [opportunities, account, businessProfile, studentProfile, isStudent]);

  const fundingOpportunities = useMemo(
    () =>
      matchedOpportunities.filter(({ opp }) =>
        ['Grants', 'Business Funding', 'Loans', 'Government Empowerment Programmes'].includes(opp.category) ||
        Boolean(opp.fundingType)
      ),
    [matchedOpportunities]
  );

  const upcomingDeadlines = useMemo(
    () =>
      matchedOpportunities
        .filter(({ match }) => match.daysUntilDeadline !== null && match.daysUntilDeadline >= 0)
        .sort((a, b) => (a.match.daysUntilDeadline ?? 999) - (b.match.daysUntilDeadline ?? 999))
        .slice(0, 4),
    [matchedOpportunities]
  );

  const businessChecklist = [
    { label: 'Complete core user & regional profile', done: profileCompletion >= 60 },
    { label: 'Add public Business Profile in Directory', done: Boolean(businessProfile?.businessName) },
    {
      label: 'Formalize CAC / business registration',
      done: Boolean(businessProfile && businessProfile.registrationStatus !== 'Unregistered'),
    },
    { label: 'Submit business verification request', done: businessProfile?.verificationStatus === 'verified' },
    { label: 'Track at least one funding or grant opportunity', done: applications.length > 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-xl bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome & Profile Completion */}
      <section className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#1F7A59] dark:text-[#57C496]">
            {account?.category || 'Member'} · {account?.state || 'Nigeria'}, {account?.country || 'Nigeria'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
            Welcome back, {account?.fullName || firebaseUser?.displayName || 'Founder'}.
          </h2>
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] max-w-2xl">
            {isStudent
              ? 'Your dashboard prioritizes scholarships, fellowships, internships, competitions, and career-ready training matched to your academic profile.'
              : 'Your dashboard tracks matched funding, upcoming deadlines, business readiness, and regional market connections.'}
          </p>
        </div>

        <div className="min-w-[240px] bg-[#F8F7F1] dark:bg-[#17231F] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE]">
            <span>Profile Completion</span>
            <span className="font-mono tabular-nums text-[#123C32] dark:text-[#57C496]">{profileCompletion}%</span>
          </div>
          <div className="h-2 bg-white dark:bg-[#0B110F] rounded-full overflow-hidden border border-[#17231F]/10 dark:border-white/10">
            <div
              className="h-full bg-[#1F7A59] dark:bg-[#57C496] transition-all"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate(profileCompletion < 100 ? '/onboarding' : '/app/profile')}
            className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
          >
            {profileCompletion < 100 ? 'Complete Remaining Profile Fields' : 'Review My Profile'}
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Find Opportunities', sub: 'GIRMA Match', icon: Compass, path: '/app/opportunities' },
          { label: 'Ask GIRMA AI', sub: 'Proposals & Strategy', icon: MessageSquare, path: '/app/assistant' },
          { label: 'Business Toolkit', sub: 'Calculators & PDF', icon: Wrench, path: '/app/toolkit' },
          { label: 'Funding Hub', sub: 'Grants & Loans', icon: Landmark, path: '/app/funding' },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.path)}
              className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 text-left hover:border-[#123C32]/40 dark:hover:border-[#57C496]/50 transition-colors space-y-1.5"
            >
              <Icon className="w-4 h-4 text-[#123C32] dark:text-[#57C496]" />
              <div className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE]">{q.label}</div>
              <div className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{q.sub}</div>
            </button>
          );
        })}
      </section>

      {/* Entrepreneur Summary & Checklist OR Student Priority Highlight */}
      {isEntrepreneur && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">Business Profile Summary</h3>
              <button
                type="button"
                onClick={() => navigate('/app/business')}
                className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline whitespace-nowrap"
              >
                Manage Business Profile
              </button>
            </div>
            {businessProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[#77817C] dark:text-[#9AA8A1] block">Business Name</span>
                  <span className="font-semibold text-[#17231F] dark:text-[#ECF1EE]">{businessProfile.businessName}</span>
                </div>
                <div>
                  <span className="text-xs text-[#77817C] dark:text-[#9AA8A1] block">Industry &amp; Stage</span>
                  <span className="font-medium text-[#17231F] dark:text-[#ECF1EE]">
                    {businessProfile.industry} · {businessProfile.stage}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#77817C] dark:text-[#9AA8A1] block">Funding Need</span>
                  <span className="font-mono tabular-nums font-semibold text-[#123C32] dark:text-[#57C496]">
                    {formatNaira(businessProfile.fundingNeedAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#77817C] dark:text-[#9AA8A1] block">Verification Status</span>
                  <span className="font-medium capitalize text-[#17231F] dark:text-[#ECF1EE]">
                    {businessProfile.verificationStatus}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#F8F7F1] dark:bg-[#17231F] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">
                  Add your business profile to unlock accurate GIRMA Match scoring and public Directory listing.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/business')}
                  className="px-4 py-2 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Create Business Profile
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-3">
            <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">Business Readiness Checklist</h3>
            <ul className="space-y-2.5">
              {businessChecklist.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      item.done ? 'text-[#238653] dark:text-[#57C496]' : 'text-[#77817C]/40 dark:text-[#9AA8A1]/35'
                    }`}
                  />
                  <span className={item.done ? 'text-[#17231F] dark:text-[#ECF1EE]' : 'text-[#77817C] dark:text-[#9AA8A1]'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Recommended Opportunities (GIRMA Match) + Deadlines */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">
                {isStudent ? 'Priority Student & Graduate Matches' : 'Recommended Opportunities (GIRMA Match)'}
              </h3>
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">Ranked by transparent eligibility and relevance score.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/opportunities')}
              className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {matchedOpportunities.length === 0 ? (
            <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] py-6">
              No published opportunities available yet. Administrators can publish opportunities from the Admin Console.
            </p>
          ) : (
            <div className="divide-y divide-[#17231F]/10 dark:divide-white/10">
              {matchedOpportunities.slice(0, 4).map(({ opp, match }) => (
                <div key={opp.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#77817C] dark:text-[#9AA8A1]">
                      <span className="font-semibold text-[#1F7A59] dark:text-[#57C496]">{opp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Match {match.score}%</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Due {opp.deadlineDate}</span>
                    </div>
                    <h4 className="font-semibold text-[#17231F] dark:text-[#ECF1EE] text-sm sm:text-base">{opp.title}</h4>
                    <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{match.reasons[0]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/opportunities?id=${opp.id}`)}
                    className="px-4 py-2 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:bg-[#123C32] dark:hover:bg-[#1F7A59] hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    Inspect Match
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines & Tracked Applications */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">Upcoming Deadlines</h3>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">No active deadlines right now.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingDeadlines.map(({ opp, match }) => (
                  <li key={opp.id} className="pb-3 border-b border-[#17231F]/10 dark:border-white/10 last:border-b-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/opportunities?id=${opp.id}`)}
                      className="text-left w-full group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            (match.daysUntilDeadline ?? 99) <= 3
                              ? 'text-[#D94C4C] dark:text-[#F87171]'
                              : 'text-[#E6A23C] dark:text-[#FBBF24]'
                          }`}
                        >
                          {match.daysUntilDeadline === 0
                            ? 'Closes today'
                            : `${match.daysUntilDeadline}d left`}
                        </span>
                        <span className="font-mono text-[#77817C] dark:text-[#9AA8A1] tabular-nums">{opp.deadlineDate}</span>
                      </div>
                      <p className="text-sm font-medium text-[#17231F] dark:text-[#ECF1EE] group-hover:text-[#123C32] dark:group-hover:text-[#57C496] mt-1 line-clamp-1">
                        {opp.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#123C32] dark:text-[#57C496]" />
                <span>Saved &amp; Tracked</span>
              </h3>
              <button
                type="button"
                onClick={() => navigate('/app/applications')}
                className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
              >
                Tracker ({applications.length})
              </button>
            </div>
            {applications.length === 0 ? (
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
                Save opportunities while browsing to track drafts, required documents, and outcomes.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {applications.slice(0, 3).map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="font-medium text-[#17231F] dark:text-[#ECF1EE] truncate">{app.opportunityTitle || app.opportunityId}</span>
                    <span className="text-[#1F7A59] dark:text-[#57C496] font-medium shrink-0">{app.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Funding Opportunities + Notifications + Learning + Mentors */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#17231F] dark:text-[#ECF1EE]">Funding Highlights</h3>
            <button
              type="button"
              onClick={() => navigate('/app/funding')}
              className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
            >
              Funding Hub
            </button>
          </div>
          {fundingOpportunities.slice(0, 3).map(({ opp }) => (
            <div key={opp.id} className="pb-3 border-b border-[#17231F]/10 dark:border-white/10 last:border-b-0 last:pb-0 space-y-1">
              <p className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] line-clamp-1">{opp.title}</p>
              <p className="font-mono text-xs tabular-nums text-[#1F7A59] dark:text-[#57C496]">
                {opp.fundingAmountMax ? `Up to ${formatNaira(opp.fundingAmountMax, opp.fundingCurrency)}` : opp.fundingType}
              </p>
            </div>
          ))}
          {fundingOpportunities.length === 0 && (
            <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">Funding programmes will appear here once published.</p>
          )}
        </div>

        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#17231F] dark:text-[#ECF1EE] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#123C32] dark:text-[#57C496]" />
              <span>Recommended Learning</span>
            </h3>
            <button
              type="button"
              onClick={() => navigate('/app/learn')}
              className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
            >
              Learning Centre
            </button>
          </div>
          {resources.slice(0, 3).map((res) => (
            <button
              key={res.id}
              type="button"
              onClick={() => navigate(`/app/learn?id=${res.id}`)}
              className="w-full text-left pb-3 border-b border-[#17231F]/10 dark:border-white/10 last:border-b-0 last:pb-0 space-y-1 block"
            >
              <p className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] hover:text-[#123C32] dark:hover:text-[#57C496] line-clamp-1">
                {res.title}
              </p>
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
                {res.category} · {res.contentType}
              </p>
            </button>
          ))}
          {resources.length === 0 && (
            <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">Learning modules will appear once published.</p>
          )}
        </div>

        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#17231F] dark:text-[#ECF1EE] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#123C32] dark:text-[#57C496]" />
              <span>Verified Mentors &amp; Alerts</span>
            </h3>
            <button
              type="button"
              onClick={() => navigate('/app/mentorship')}
              className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
            >
              Mentorship
            </button>
          </div>
          {mentors.slice(0, 2).map((m) => (
            <div key={m.id} className="pb-2 border-b border-[#17231F]/10 dark:border-white/10 space-y-0.5">
              <p className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE]">{m.fullName}</p>
              <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{m.background} · {m.state}</p>
            </div>
          ))}
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[#77817C] dark:text-[#9AA8A1]">
              <Bell className="w-3.5 h-3.5" />
              <span>Unread notifications: {notifications.filter((n) => !n.isRead).length}</span>
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/notifications')}
              className="font-semibold text-[#123C32] dark:text-[#57C496] hover:underline"
            >
              Open Inbox
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
