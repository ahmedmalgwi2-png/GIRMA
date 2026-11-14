import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, ShieldCheck } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AFRICAN_COUNTRIES,
  BUSINESS_STAGES,
  INDUSTRIES,
  NIGERIAN_STATES,
  NotificationItem,
  REGISTRATION_STATUSES,
  USER_CATEGORIES,
  UserCategory,
} from '../types/girma';

export const NotificationsPage: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const { firebaseUser, refreshProfile } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulerInfo, setSchedulerInfo] = useState<{ lastRun: string | null; timezone: string } | null>(null);

  const loadNotifications = async () => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', firebaseUser.uid)
        )
      );
      const toMs = (t: unknown) => {
        if (t && typeof (t as { toMillis?: () => number }).toMillis === 'function') {
          return (t as { toMillis: () => number }).toMillis();
        }
        if (t && typeof (t as { seconds?: number }).seconds === 'number') {
          return (t as { seconds: number }).seconds * 1000;
        }
        return 0;
      };
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as NotificationItem))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      setItems(sorted);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    fetch('/api/cron/deadlines/status')
      .then((r) => r.json())
      .then((d) => setSchedulerInfo(d))
      .catch(() => {});
  }, [firebaseUser]);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllRead = async () => {
    for (const item of items.filter((i) => !i.isRead && i.id)) {
      await markRead(item.id!);
    }
  };

  const runDeadlineScan = async () => {
    await fetch('/api/cron/deadlines', { method: 'POST' });
    await refreshProfile();
    await loadNotifications();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F]">
            Notifications &amp; Deadline Intelligence
          </h2>
          <p className="text-sm text-[#77817C] mt-1">
            Automated deduplicated alerts for 7-day, 3-day, and 1-day deadlines on saved or 60%+ matched opportunities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runDeadlineScan}
            className="px-4 py-2 rounded-lg border border-[#123C32]/25 bg-white text-xs font-semibold text-[#123C32]"
          >
            Run Deadline Check
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123C32] text-white text-xs font-semibold"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {schedulerInfo && (
        <div className="bg-white border border-[#17231F]/10 rounded-xl px-4 py-3 text-xs text-[#77817C] flex flex-wrap justify-between gap-2">
          <span>Deadline Intelligence Windows: 7 days, 3 days, 1 day before close · Threshold: 60%+ Match</span>
          <span>Timezone: {schedulerInfo.timezone}</span>
        </div>
      )}

      {loading ? (
        <div className="h-44 bg-white border border-[#17231F]/10 rounded-xl animate-pulse" />
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#17231F]/10 rounded-xl p-8 text-center space-y-2">
          <Bell className="w-6 h-6 text-[#77817C] mx-auto" />
          <p className="text-sm text-[#77817C]">No notifications yet. Save opportunities to activate deadline alerts.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#17231F]/10 rounded-xl divide-y divide-[#17231F]/10">
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                n.isRead ? 'opacity-75' : 'bg-[#F8F7F1]/50'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#1F7A59]">
                  {n.category} {!n.isRead && '· Unread'}
                </div>
                <h3 className="text-sm font-bold text-[#17231F]">{n.title}</h3>
                <p className="text-xs text-[#77817C]">{n.message}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.opportunityId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/app/opportunities?id=${n.opportunityId}`)}
                    className="px-3 py-1.5 rounded-lg border border-[#123C32]/25 text-xs font-semibold text-[#123C32]"
                  >
                    Open Opportunity
                  </button>
                )}
                {!n.isRead && n.id && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id!)}
                    className="px-3 py-1.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProfileAndBusinessPage: React.FC<{ section: 'profile' | 'business' }> = ({
  section,
}) => {
  const { firebaseUser, account, businessProfile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(account?.fullName || '');
  const [phone, setPhone] = useState(account?.phone || '');
  const [country, setCountry] = useState(account?.country || 'Nigeria');
  const [state, setState] = useState(account?.state || 'Adamawa');
  const [category, setCategory] = useState<UserCategory>(account?.category || 'Entrepreneur');
  const [interests, setInterests] = useState((account?.interests || []).join(', '));

  const [bizName, setBizName] = useState(businessProfile?.businessName || '');
  const [bizDesc, setBizDesc] = useState(businessProfile?.description || '');
  const [bizIndustry, setBizIndustry] = useState<string>(businessProfile?.industry || INDUSTRIES[0]);
  const [bizState, setBizState] = useState<string>(businessProfile?.state || account?.state || 'Adamawa');
  const [bizReg, setBizReg] = useState(businessProfile?.registrationStatus || REGISTRATION_STATUSES[0]);
  const [bizStage, setBizStage] = useState(businessProfile?.stage || BUSINESS_STAGES[1]);
  const [fundingNeed, setFundingNeed] = useState(String(businessProfile?.fundingNeedAmount || 0));
  const [products, setProducts] = useState((businessProfile?.products || []).join(', '));
  const [website, setWebsite] = useState(businessProfile?.website || '');

  // Verification submission
  const [docType, setDocType] = useState('CAC Certificate');
  const [regRef, setRegRef] = useState('');
  const [verifNotes, setVerifNotes] = useState('');

  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savePersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          fullName: fullName.trim(),
          email: firebaseUser.email || '',
          phone: phone.trim(),
          country,
          state,
          category,
          interests: interests.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15),
          plan: account?.plan || 'free',
          accountStatus: account?.accountStatus || 'active',
          onboardingCompleted: true,
          createdAt: account?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await refreshProfile();
      setNotice('Personal profile updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    const bizId = businessProfile?.id || `biz_${firebaseUser.uid}`;
    try {
      await setDoc(
        doc(db, 'business_profiles', bizId),
        {
          ownerId: firebaseUser.uid,
          businessName: bizName.trim(),
          description: bizDesc.trim(),
          industry: bizIndustry,
          country: account?.country || 'Nigeria',
          state: bizState,
          registrationStatus: bizReg,
          stage: bizStage,
          fundingNeedAmount: Number(fundingNeed) || 0,
          products: products.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
          website: website.trim(),
          verificationStatus: businessProfile?.verificationStatus || 'unverified',
          createdAt: businessProfile?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await refreshProfile();
      setNotice('Business profile saved. Note: Verification status requires admin review.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `business_profiles/${bizId}`);
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !businessProfile?.id) {
      setNotice('Save your Business Profile first before requesting verification.');
      return;
    }
    try {
      await addDoc(collection(db, 'verification_requests'), {
        userId: firebaseUser.uid,
        businessId: businessProfile.id,
        businessName: businessProfile.businessName,
        documentType: docType,
        registrationRef: regRef.trim(),
        notes: verifNotes.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRegRef('');
      setVerifNotes('');
      setNotice('Verification request submitted to GIRMA Administrators for review.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'verification_requests');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {notice && (
        <div className="bg-[#123C32] text-white px-4 py-3 rounded-lg text-xs flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {section === 'profile' && (
        <form onSubmit={savePersonalProfile} className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="font-display text-2xl font-bold text-[#17231F]">My Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {AFRICAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">State</label>
              {country === 'Nigeria' ? (
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                >
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as UserCategory)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {USER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Interests (comma-separated)</label>
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
          >
            {saving ? 'Saving...' : 'Save Personal Profile'}
          </button>
        </form>
      )}

      {/* Business Profile & Verification Section */}
      <form onSubmit={saveBusinessProfile} className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-[#17231F]">Business Profile</h2>
          <span className="text-xs font-semibold capitalize text-[#1F7A59]">
            Status: {businessProfile?.verificationStatus || 'unverified'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Business Name</label>
            <input
              required
              minLength={2}
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Industry</label>
            <select
              value={bizIndustry}
              onChange={(e) => setBizIndustry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">State</label>
            <select
              value={bizState}
              onChange={(e) => setBizState(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Registration Status</label>
            <select
              value={bizReg}
              onChange={(e) => setBizReg(e.target.value as (typeof REGISTRATION_STATUSES)[number])}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              {REGISTRATION_STATUSES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Business Stage</label>
            <select
              value={bizStage}
              onChange={(e) => setBizStage(e.target.value as (typeof BUSINESS_STAGES)[number])}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
            >
              {BUSINESS_STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Funding Need (₦)</label>
            <input
              type="number"
              min={0}
              value={fundingNeed}
              onChange={(e) => setFundingNeed(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Products (comma-separated)</label>
            <input
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Business Description (min 10 chars)</label>
          <textarea
            required
            minLength={10}
            rows={3}
            value={bizDesc}
            onChange={(e) => setBizDesc(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
        >
          Save Business Profile
        </button>
      </form>

      {/* Request Verification */}
      {businessProfile && businessProfile.verificationStatus !== 'verified' && (
        <form onSubmit={submitVerification} className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#123C32]" />
            <h3 className="font-display text-lg font-bold text-[#17231F]">
              Submit Business for Verification
            </h3>
          </div>
          <p className="text-xs text-[#77817C]">
            Verified businesses receive priority trust in the Business Directory. Registration alone never marks a business as verified.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                <option value="CAC Certificate">CAC Certificate (BN / RC)</option>
                <option value="SMEDAN Registration">SMEDAN Certificate</option>
                <option value="Local Government Trade Permit">Local Government Trade Permit</option>
                <option value="Cooperative Registration">Cooperative Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Registration / Reference Number</label>
              <input
                required
                value={regRef}
                onChange={(e) => setRegRef(e.target.value)}
                placeholder="e.g., RC-1948201 or BN-382910"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Additional Notes for Reviewer</label>
            <textarea
              rows={2}
              value={verifNotes}
              onChange={(e) => setVerifNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-lg bg-[#1F7A59] text-white text-xs font-semibold">
            Submit Verification Request
          </button>
        </form>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { firebaseUser, account, refreshProfile, sendRecoveryEmail } = useAuth();
  const [consentAi, setConsentAi] = useState(account?.consentAiContext ?? true);
  const [consentEmail, setConsentEmail] = useState(account?.consentEmailAlerts ?? true);
  const [language, setLanguage] = useState(account?.preferredLanguage || 'en');
  const [reminderDays, setReminderDays] = useState<number[]>(
    account?.deadlineReminderDays || [7, 3, 1]
  );
  const [notice, setNotice] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        consentAiContext: consentAi,
        consentEmailAlerts: consentEmail,
        preferredLanguage: language,
        deadlineReminderDays: reminderDays.length > 0 ? reminderDays : [7, 3, 1],
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      setNotice('Preferences updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display text-2xl font-bold text-[#17231F]">Settings &amp; Privacy</h2>

      {notice && (
        <div className="bg-[#123C32] text-white px-4 py-3 rounded-lg text-xs">{notice}</div>
      )}

      <form onSubmit={saveSettings} className="bg-white border border-[#17231F]/10 rounded-2xl p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="font-display text-base font-bold text-[#17231F]">AI Privacy &amp; Consent</h3>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={consentAi}
              onChange={(e) => setConsentAi(e.target.checked)}
              className="mt-1 accent-[#123C32]"
            />
            <span>
              Allow <strong>Ask GIRMA</strong> to reference my business/student profile and saved opportunities for personalized guidance.
            </span>
          </label>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#17231F]/10">
          <h3 className="font-display text-base font-bold text-[#17231F]">Deadline Intelligence &amp; Alerts</h3>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={consentEmail}
              onChange={(e) => setConsentEmail(e.target.checked)}
              className="mt-1 accent-[#123C32]"
            />
            <span>Receive email &amp; in-app alerts for high-match opportunity deadlines.</span>
          </label>
          <div className="flex flex-wrap gap-3 pt-1">
            {[7, 3, 1].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                  reminderDays.includes(d)
                    ? 'bg-[#123C32] text-white border-[#123C32]'
                    : 'bg-white border-[#17231F]/15 text-[#77817C]'
                }`}
              >
                {d} Day{d > 1 ? 's' : ''} Before Deadline
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-[#17231F]/10">
          <h3 className="font-display text-base font-bold text-[#17231F]">Language &amp; Regional Settings</h3>
          <p className="text-xs text-[#77817C]">Timezone: Africa/Lagos · Currency: Nigerian Naira (₦)</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ha' | 'yo' | 'ig' | 'fr')}
            className="px-3.5 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
          >
            <option value="en">English (Active)</option>
            <option value="ha">Hausa (Regional Localization Roadmap)</option>
            <option value="yo">Yoruba (Regional Localization Roadmap)</option>
            <option value="ig">Igbo (Regional Localization Roadmap)</option>
            <option value="fr">French (Regional Localization Roadmap)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-[#17231F]/10 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={async () => {
              if (firebaseUser?.email) {
                await sendRecoveryEmail(firebaseUser.email);
                setNotice(`Password reset link sent to ${firebaseUser.email}.`);
              }
            }}
            className="text-xs font-semibold text-[#123C32] hover:underline"
          >
            Send Password Reset Email
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
