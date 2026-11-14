import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { seedEcosystemData } from '../lib/seedData';
import {
  AdminActivityLog,
  BusinessProfile,
  INDUSTRIES,
  LEARNING_CATEGORIES,
  LearningResource,
  MentorProfile,
  NotificationItem,
  OPPORTUNITY_CATEGORIES,
  Opportunity,
  OpportunityApplication,
  USER_CATEGORIES,
  UserAccount,
  VerificationRequest,
} from '../types/girma';

type AdminTab =
  | 'overview'
  | 'users'
  | 'opportunities'
  | 'verifications'
  | 'content'
  | 'analytics'
  | 'logs';

export const AdminConsolePage: React.FC = () => {
  const { firebaseUser, isAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userCatFilter, setUserCatFilter] = useState('All');

  // Create Opportunity Form
  const [oppForm, setOppForm] = useState({
    title: '',
    organizationName: '',
    category: OPPORTUNITY_CATEGORIES[0] as string,
    industry: INDUSTRIES[0] as string,
    country: 'Nigeria',
    deadlineDate: '2026-12-31',
    fundingAmountMax: '5000000',
    officialUrl: 'https://',
    description: '',
    verificationStatus: 'verified' as 'verified' | 'unverified',
  });

  // Create Learning Resource Form
  const [learnForm, setLearnForm] = useState({
    title: '',
    category: LEARNING_CATEGORIES[0] as string,
    contentType: 'Article' as LearningResource['contentType'],
    summary: '',
    contentBody: '',
    durationMinutes: '15',
  });

  // Announcement Form
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  const logAdminAction = async (action: string, targetType: string, targetId: string, details = '') => {
    if (!firebaseUser) return;
    try {
      await addDoc(collection(db, 'admin_activity_logs'), {
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || '',
        action,
        targetType,
        targetId,
        details: details.slice(0, 500),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not write audit log:', err);
    }
  };

  const loadAllAdminData = async () => {
    if (!firebaseUser || !firebaseUser.emailVerified || !isAdmin) return;
    setLoading(true);
    try {
      const [uS, bS, oS, aS, vS, mS, lS, nS, logS] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'business_profiles')),
        getDocs(collection(db, 'opportunities')),
        getDocs(collection(db, 'opportunity_applications')),
        getDocs(collection(db, 'verification_requests')),
        getDocs(collection(db, 'mentor_profiles')),
        getDocs(collection(db, 'learning_resources')),
        getDocs(collection(db, 'notifications')),
        getDocs(query(collection(db, 'admin_activity_logs'), orderBy('createdAt', 'desc'))),
      ]);
      setUsers(uS.docs.map((d) => ({ ...d.data() } as UserAccount)));
      setBusinesses(bS.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessProfile)));
      setOpportunities(oS.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity)));
      setApplications(aS.docs.map((d) => ({ id: d.id, ...d.data() } as OpportunityApplication)));
      setVerifications(vS.docs.map((d) => ({ id: d.id, ...d.data() } as VerificationRequest)));
      setMentors(mS.docs.map((d) => ({ id: d.id, ...d.data() } as MentorProfile)));
      setResources(lS.docs.map((d) => ({ id: d.id, ...d.data() } as LearningResource)));
      setNotifications(nS.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
      setLogs(logS.docs.map((d) => ({ id: d.id, ...d.data() } as AdminActivityLog)));
    } catch (err) {
      console.error('Admin load error:', err);
      setNotice(err instanceof Error ? err.message : 'Unable to load admin datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && firebaseUser?.emailVerified) {
      loadAllAdminData();
    }
  }, [isAdmin, firebaseUser]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.category] = (counts[u.category] || 0) + 1;
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [users]);

  const stateChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.state] = (counts[u.state] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [users]);

  const oppCatChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of opportunities) counts[o.category] = (counts[o.category] || 0) + 1;
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [opportunities]);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-[#D94C4C]/30 rounded-xl p-8 max-w-lg mx-auto text-center space-y-2">
        <h2 className="font-display text-xl font-bold text-[#17231F]">Administrator Access Required</h2>
        <p className="text-sm text-[#77817C]">
          This console is restricted to authorized GIRMA administrators.
        </p>
      </div>
    );
  }

  const handleSeed = async () => {
    if (!firebaseUser) return;
    const res = await seedEcosystemData(firebaseUser.uid);
    await logAdminAction('SEED_ECOSYSTEM', 'platform_settings', 'global', `Seeded ${res.seededCount} records`);
    setNotice(`Seeded ${res.seededCount} development ecosystem records into Firestore.`);
    await loadAllAdminData();
  };

  const toggleSuspendUser = async (u: UserAccount) => {
    const nextStatus = u.accountStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        accountStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await logAdminAction(
        nextStatus === 'suspended' ? 'SUSPEND_USER' : 'RESTORE_USER',
        'users',
        u.uid,
        u.email
      );
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, accountStatus: nextStatus } : x)));
      setNotice(`User ${u.fullName} is now ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${u.uid}`);
    }
  };

  const grantAdminRole = async (u: UserAccount) => {
    try {
      await setDoc(doc(db, 'admins', u.uid), {
        uid: u.uid,
        email: u.email,
        createdAt: serverTimestamp(),
      });
      await logAdminAction('GRANT_ADMIN', 'admins', u.uid, u.email);
      setNotice(`Granted admin permission to ${u.email}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${u.uid}`);
    }
  };

  const createOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      const payload = {
        title: oppForm.title.trim(),
        organizationName: oppForm.organizationName.trim(),
        category: oppForm.category,
        industry: oppForm.industry,
        country: oppForm.country,
        eligibleStates: ['All States'],
        deadlineDate: oppForm.deadlineDate,
        fundingAmountMin: 0,
        fundingAmountMax: Number(oppForm.fundingAmountMax) || 0,
        fundingCurrency: 'NGN',
        officialUrl: oppForm.officialUrl.trim(),
        description: oppForm.description.trim(),
        verificationStatus: oppForm.verificationStatus,
        status: 'published' as const,
        isSeedData: false,
        createdBy: firebaseUser.uid,
      };
      const ref = await addDoc(collection(db, 'opportunities'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAdminAction('CREATE_OPPORTUNITY', 'opportunities', ref.id, payload.title);
      setOppForm({ ...oppForm, title: '', organizationName: '', description: '' });
      setNotice('Live opportunity published.');
      await loadAllAdminData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'opportunities');
    }
  };

  const updateOpportunityStatus = async (opp: Opportunity, status: Opportunity['status']) => {
    if (!opp.id) return;
    await updateDoc(doc(db, 'opportunities', opp.id), {
      status,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction('UPDATE_OPPORTUNITY_STATUS', 'opportunities', opp.id, status);
    setOpportunities((prev) => prev.map((o) => (o.id === opp.id ? { ...o, status } : o)));
  };

  const toggleOpportunityVerified = async (opp: Opportunity) => {
    if (!opp.id) return;
    const next = opp.verificationStatus === 'verified' ? 'unverified' : 'verified';
    await updateDoc(doc(db, 'opportunities', opp.id), {
      verificationStatus: next,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction('VERIFY_OPPORTUNITY', 'opportunities', opp.id, next);
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opp.id ? { ...o, verificationStatus: next } : o))
    );
  };

  const deleteOpportunity = async (id: string) => {
    await deleteDoc(doc(db, 'opportunities', id));
    await logAdminAction('DELETE_OPPORTUNITY', 'opportunities', id);
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  };

  const reviewVerification = async (
    req: VerificationRequest,
    decision: 'approved' | 'rejected' | 'info_requested',
    notes: string
  ) => {
    if (!req.id || !firebaseUser) return;
    try {
      await updateDoc(doc(db, 'verification_requests', req.id), {
        status: decision,
        adminNotes: notes || `Reviewed by admin (${decision})`,
        reviewedBy: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
      const bizStatus =
        decision === 'approved' ? 'verified' : decision === 'rejected' ? 'rejected' : 'pending';
      await updateDoc(doc(db, 'business_profiles', req.businessId), {
        verificationStatus: bizStatus,
        verificationNotes: notes,
        updatedAt: serverTimestamp(),
      });
      await logAdminAction('REVIEW_BUSINESS_VERIFICATION', 'business_profiles', req.businessId, decision);
      setNotice(`Business "${req.businessName}" marked as ${bizStatus}.`);
      await loadAllAdminData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `verification_requests/${req.id}`);
    }
  };

  const reviewMentor = async (m: MentorProfile, approvalStatus: 'approved' | 'rejected') => {
    if (!m.id) return;
    await updateDoc(doc(db, 'mentor_profiles', m.id), {
      approvalStatus,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction('REVIEW_MENTOR', 'mentor_profiles', m.id, approvalStatus);
    setMentors((prev) => prev.map((x) => (x.id === m.id ? { ...x, approvalStatus } : x)));
  };

  const createLearningResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const ref = await addDoc(collection(db, 'learning_resources'), {
      title: learnForm.title.trim(),
      category: learnForm.category,
      contentType: learnForm.contentType,
      summary: learnForm.summary.trim(),
      contentBody: learnForm.contentBody.trim(),
      durationMinutes: Number(learnForm.durationMinutes) || 10,
      authorName: 'GIRMA Editorial',
      isPublished: true,
      createdBy: firebaseUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAdminAction('CREATE_LEARNING_RESOURCE', 'learning_resources', ref.id, learnForm.title);
    setLearnForm({ ...learnForm, title: '', summary: '', contentBody: '' });
    setNotice('Learning resource published.');
    await loadAllAdminData();
  };

  const sendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    for (const u of users.slice(0, 50)) {
      await addDoc(collection(db, 'notifications'), {
        userId: u.uid,
        category: 'Administrative Announcements',
        title: announcementTitle.trim(),
        message: announcementBody.trim(),
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
    await logAdminAction('BROADCAST_ANNOUNCEMENT', 'notifications', 'all', announcementTitle);
    setAnnouncementTitle('');
    setAnnouncementBody('');
    setNotice('Announcement dispatched to active user inboxes.');
  };

  const entrepreneursCount = users.filter((u) =>
    ['Entrepreneur', 'Small Business Owner', 'Startup Founder'].includes(u.category)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F]">GIRMA Admin Console</h2>
          <p className="text-sm text-[#77817C] mt-1">
            Platform operations, business &amp; opportunity verification, real-time analytics, and audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          className="px-4 py-2 rounded-lg bg-[#D6A84F] text-[#17231F] text-xs font-semibold hover:bg-[#D6A84F]/90 whitespace-nowrap"
        >
          Initialize / Refresh Development Seed Data
        </button>
      </div>

      {notice && (
        <div className="bg-[#123C32] text-white px-4 py-3 rounded-lg text-xs flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white border border-[#17231F]/10 rounded-xl p-1.5">
        {(
          [
            ['overview', 'Overview'],
            ['users', 'Users'],
            ['opportunities', 'Opportunities'],
            ['verifications', 'Verifications & Mentors'],
            ['content', 'Content & Alerts'],
            ['analytics', 'Analytics'],
            ['logs', 'Audit Logs'],
          ] as [AdminTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
              tab === id ? 'bg-[#123C32] text-white' : 'text-[#77817C] hover:text-[#17231F]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-white border border-[#17231F]/10 animate-pulse" />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                ['Total Users', users.length],
                ['Entrepreneurs / SMEs', entrepreneursCount],
                ['Businesses', businesses.length],
                ['Verified Businesses', businesses.filter((b) => b.verificationStatus === 'verified').length],
                ['Pending Verifications', verifications.filter((v) => v.status === 'pending').length],
                ['Total Opportunities', opportunities.length],
                ['Active Opportunities', opportunities.filter((o) => o.status === 'published').length],
                ['Expired Opportunities', opportunities.filter((o) => o.status === 'expired').length],
                ['Saved / Tracked Apps', applications.length],
                ['Unread Notifications', notifications.filter((n) => !n.isRead).length],
              ].map(([label, val]) => (
                <div key={String(label)} className="bg-white border border-[#17231F]/10 rounded-xl p-4">
                  <div className="text-xs text-[#77817C]">{label}</div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-[#123C32] mt-1">
                    {val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, or state..."
                  className="px-3.5 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <select
                  value={userCatFilter}
                  onChange={(e) => setUserCatFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                >
                  <option value="All">All Categories</option>
                  {USER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#17231F]/10 text-[#77817C]">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17231F]/10">
                    {users
                      .filter((u) => {
                        if (userCatFilter !== 'All' && u.category !== userCatFilter) return false;
                        if (
                          userSearch.trim() &&
                          !`${u.fullName} ${u.email} ${u.state}`.toLowerCase().includes(userSearch.toLowerCase())
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .map((u) => (
                        <tr key={u.uid}>
                          <td className="py-3 pr-4 font-semibold">{u.fullName}</td>
                          <td className="py-3 pr-4 text-[#77817C]">{u.email}</td>
                          <td className="py-3 pr-4">{u.category}</td>
                          <td className="py-3 pr-4">{u.state}</td>
                          <td className="py-3 pr-4 capitalize">{u.accountStatus}</td>
                          <td className="py-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSuspendUser(u)}
                              className="px-2.5 py-1 rounded border border-[#17231F]/15 font-semibold"
                            >
                              {u.accountStatus === 'suspended' ? 'Restore' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              onClick={() => grantAdminRole(u)}
                              className="px-2.5 py-1 rounded border border-[#123C32]/25 text-[#123C32] font-semibold"
                            >
                              Make Admin
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'opportunities' && (
            <div className="space-y-6">
              <form onSubmit={createOpportunity} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">Publish New Opportunity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    required
                    value={oppForm.title}
                    onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                    placeholder="Opportunity Title"
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                  <input
                    required
                    value={oppForm.organizationName}
                    onChange={(e) => setOppForm({ ...oppForm, organizationName: e.target.value })}
                    placeholder="Organization Name"
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                  <select
                    value={oppForm.category}
                    onChange={(e) => setOppForm({ ...oppForm, category: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {OPPORTUNITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={oppForm.industry}
                    onChange={(e) => setOppForm({ ...oppForm, industry: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <input
                    type="date"
                    required
                    value={oppForm.deadlineDate}
                    onChange={(e) => setOppForm({ ...oppForm, deadlineDate: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm font-mono"
                  />
                  <input
                    type="number"
                    value={oppForm.fundingAmountMax}
                    onChange={(e) => setOppForm({ ...oppForm, fundingAmountMax: e.target.value })}
                    placeholder="Max Funding (₦)"
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm font-mono tabular-nums"
                  />
                  <input
                    required
                    value={oppForm.officialUrl}
                    onChange={(e) => setOppForm({ ...oppForm, officialUrl: e.target.value })}
                    placeholder="Official Application URL"
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                  <select
                    value={oppForm.verificationStatus}
                    onChange={(e) =>
                      setOppForm({ ...oppForm, verificationStatus: e.target.value as 'verified' | 'unverified' })
                    }
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    <option value="verified">Verified Source</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={oppForm.description}
                  onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                  placeholder="Full opportunity description & eligibility summary..."
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold">
                  Publish Opportunity
                </button>
              </form>

              <div className="bg-white border border-[#17231F]/10 rounded-xl divide-y divide-[#17231F]/10">
                {opportunities.map((o) => (
                  <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-sm text-[#17231F]">{o.title}</div>
                      <div className="text-[#77817C]">
                        {o.organizationName} · {o.status} · {o.verificationStatus} · Due {o.deadlineDate}
                        {o.isSeedData && ' · Development Seed'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleOpportunityVerified(o)}
                        className="px-2.5 py-1.5 rounded border border-[#17231F]/15 font-semibold"
                      >
                        {o.verificationStatus === 'verified' ? 'Unverify' : 'Verify Source'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateOpportunityStatus(o, o.status === 'published' ? 'draft' : 'published')
                        }
                        className="px-2.5 py-1.5 rounded border border-[#17231F]/15 font-semibold"
                      >
                        {o.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOpportunityStatus(o, 'expired')}
                        className="px-2.5 py-1.5 rounded border border-[#E6A23C]/40 text-[#E6A23C] font-semibold"
                      >
                        Mark Expired
                      </button>
                      <button
                        type="button"
                        onClick={() => o.id && deleteOpportunity(o.id)}
                        className="px-2.5 py-1.5 rounded border border-[#D94C4C]/40 text-[#D94C4C] font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'verifications' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">Business Verification Queue</h3>
                {verifications.length === 0 ? (
                  <p className="text-sm text-[#77817C]">No business verification requests submitted yet.</p>
                ) : (
                  <div className="divide-y divide-[#17231F]/10">
                    {verifications.map((v) => (
                      <div key={v.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div>
                          <div className="text-sm font-bold text-[#17231F]">{v.businessName}</div>
                          <div className="text-[#77817C]">
                            {v.documentType} · Ref: <span className="font-mono">{v.registrationRef}</span> · Status: <strong>{v.status}</strong>
                          </div>
                          {v.notes && <p className="mt-1 text-[#17231F]">{v.notes}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => reviewVerification(v, 'approved', 'Documents verified by GIRMA Admin')}
                            className="px-3 py-1.5 rounded bg-[#238653] text-white font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewVerification(v, 'info_requested', 'Please clarify CAC registration number')}
                            className="px-3 py-1.5 rounded border border-[#E6A23C] text-[#E6A23C] font-semibold"
                          >
                            Request Info
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewVerification(v, 'rejected', 'Could not verify submitted registration')}
                            className="px-3 py-1.5 rounded border border-[#D94C4C] text-[#D94C4C] font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">Mentor Approvals</h3>
                <div className="divide-y divide-[#17231F]/10">
                  {mentors.map((m) => (
                    <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="text-sm font-bold text-[#17231F]">{m.fullName}</span>
                        <span className="text-[#77817C] ml-2">
                          {m.background} · {m.state} · Status: <strong>{m.approvalStatus}</strong>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => reviewMentor(m, 'approved')}
                          className="px-3 py-1.5 rounded bg-[#238653] text-white font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewMentor(m, 'rejected')}
                          className="px-3 py-1.5 rounded border border-[#D94C4C] text-[#D94C4C] font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={createLearningResource} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">Publish Learning Resource</h3>
                <input
                  required
                  value={learnForm.title}
                  onChange={(e) => setLearnForm({ ...learnForm, title: e.target.value })}
                  placeholder="Lesson Title"
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={learnForm.category}
                    onChange={(e) => setLearnForm({ ...learnForm, category: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {LEARNING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={learnForm.contentType}
                    onChange={(e) =>
                      setLearnForm({ ...learnForm, contentType: e.target.value as LearningResource['contentType'] })
                    }
                    className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {['Article', 'Video', 'Tutorial', 'Downloadable Guide', 'Course', 'Practical Guide'].map(
                      (t) => <option key={t} value={t}>{t}</option>
                    )}
                  </select>
                </div>
                <input
                  required
                  value={learnForm.summary}
                  onChange={(e) => setLearnForm({ ...learnForm, summary: e.target.value })}
                  placeholder="Short summary"
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <textarea
                  required
                  minLength={10}
                  rows={4}
                  value={learnForm.contentBody}
                  onChange={(e) => setLearnForm({ ...learnForm, contentBody: e.target.value })}
                  placeholder="Lesson content..."
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold">
                  Publish Resource ({resources.length} total)
                </button>
              </form>

              <form onSubmit={sendAnnouncement} className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">Broadcast Platform Announcement</h3>
                <input
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <textarea
                  required
                  rows={4}
                  value={announcementBody}
                  onChange={(e) => setAnnouncementBody(e.target.value)}
                  placeholder="Message delivered to user notification inboxes..."
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                />
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#1F7A59] text-white text-xs font-semibold">
                  Send Announcement
                </button>
              </form>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold">Users by Category (Live Database)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#123C32" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold">Top States Distribution (Live Database)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1F7A59" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold">Opportunities by Category (Live Database)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={oppCatChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#D6A84F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="bg-white border border-[#17231F]/10 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-lg font-bold">Administrative Audit Logs</h3>
              {logs.length === 0 ? (
                <p className="text-sm text-[#77817C]">No audit actions recorded yet.</p>
              ) : (
                <div className="divide-y divide-[#17231F]/10 text-xs">
                  {logs.map((l) => (
                    <div key={l.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                      <span>
                        <strong className="font-mono text-[#123C32]">{l.action}</strong> · {l.targetType}/{l.targetId} · {l.details}
                      </span>
                      <span className="text-[#77817C]">{l.adminEmail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
