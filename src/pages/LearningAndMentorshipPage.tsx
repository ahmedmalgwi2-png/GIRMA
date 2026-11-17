import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, CheckCircle2, Search, Users, X } from 'lucide-react';
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
  INDUSTRIES,
  LEARNING_CATEGORIES,
  LearningProgress,
  LearningResource,
  MentorProfile,
  MentorshipRequest,
  NIGERIAN_STATES,
} from '../types/girma';
import { ResilientImage } from '../components/ResilientImage';
import mentorPortraitImg from '../assets/images/mentor_portrait_featured_1794660909070.jpg';

export const LearningCentrePage: React.FC<{
  navigate: (path: string) => void;
  initialId?: string;
  isAuthenticated: boolean;
}> = ({ navigate, initialId, isAuthenticated }) => {
  const { firebaseUser, account } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [progress, setProgress] = useState<Record<string, LearningProgress>>({});
  const [searchText, setSearchText] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState<LearningResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const resSnap = await getDocs(
          query(collection(db, 'learning_resources'), where('isPublished', '==', true))
        );
        const list = resSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LearningResource));
        const progMap: Record<string, LearningProgress> = {};
        if (firebaseUser && firebaseUser.emailVerified) {
          const progSnap = await getDocs(
            query(collection(db, 'learning_progress'), where('userId', '==', firebaseUser.uid))
          );
          for (const d of progSnap.docs) {
            const p = { id: d.id, ...d.data() } as LearningProgress;
            progMap[p.resourceId] = p;
          }
        }
        if (!active) return;
        setResources(list);
        setProgress(progMap);
        if (initialId) {
          const found = list.find((r) => r.id === initialId);
          if (found) setSelected(found);
        }
      } catch (err) {
        console.error('Error loading learning resources:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [firebaseUser, initialId]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!`${r.title} ${r.summary} ${r.category}`.toLowerCase().includes(q)) return false;
      }
      if (catFilter !== 'All' && r.category !== catFilter) return false;
      if (typeFilter !== 'All' && r.contentType !== typeFilter) return false;
      return true;
    });
  }, [resources, searchText, catFilter, typeFilter]);

  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const progressPercent =
    resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;

  const toggleProgress = async (
    resourceId: string,
    patch: { saved?: boolean; completed?: boolean }
  ) => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    const docId = `${firebaseUser.uid}_${resourceId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const current = progress[resourceId] || {
      id: docId,
      userId: firebaseUser.uid,
      resourceId,
      saved: false,
      completed: false,
    };
    const next: LearningProgress = {
      ...current,
      saved: patch.saved ?? current.saved,
      completed: patch.completed ?? current.completed,
    };
    try {
      await setDoc(
        doc(db, 'learning_progress', docId),
        {
          userId: next.userId,
          resourceId: next.resourceId,
          saved: next.saved,
          completed: next.completed,
          createdAt: current.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProgress((prev) => ({ ...prev, [resourceId]: next }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `learning_progress/${docId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Learning Centre</h2>
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] mt-1">
            Practical guides, courses, and playbooks tailored for African founders, SMEs, and students.
          </p>
        </div>
        {isAuthenticated && (
          <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl px-4 py-3 min-w-[220px] space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE]">
              <span>Learning Progress</span>
              <span className="font-mono tabular-nums text-[#123C32] dark:text-[#57C496]">
                {completedCount}/{resources.length} ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 bg-[#F8F7F1] dark:bg-[#17231F] rounded-full overflow-hidden">
              <div className="h-full bg-[#1F7A59]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#77817C] dark:text-[#9AA8A1] absolute left-3 top-3" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search courses, guides, topics..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-sm bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE]"
        >
          <option value="All">All Learning Categories</option>
          {LEARNING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-sm bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE]"
        >
          <option value="All">All Content Types</option>
          {['Article', 'Video', 'Tutorial', 'Downloadable Guide', 'Course', 'Practical Guide'].map(
            (t) => <option key={t} value={t}>{t}</option>
          )}
        </select>
      </div>

      {account?.interests && account.interests.length > 0 && (
        <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
          Recommended based on your interests: {account.interests.join(' · ')}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => <div key={i} className="h-44 rounded-xl bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-8 text-center text-sm text-[#77817C] dark:text-[#9AA8A1]">
          No published learning resources match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((res) => {
            const prog = progress[res.id || ''];
            return (
              <div key={res.id} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#77817C] dark:text-[#9AA8A1]">
                    <span className="font-semibold text-[#1F7A59] dark:text-[#57C496]">{res.category} · {res.contentType}</span>
                    {res.durationMinutes && (
                      <span className="font-mono tabular-nums">{res.durationMinutes} min</span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">{res.title}</h3>
                  <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] line-clamp-2">{res.summary}</p>
                </div>

                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    {prog?.completed && (
                      <span className="inline-flex items-center gap-1 text-[#238653] dark:text-[#57C496] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAuthenticated && res.id && (
                      <button
                        type="button"
                        onClick={() => toggleProgress(res.id!, { saved: !prog?.saved })}
                        aria-label="Save resource"
                        className={`p-2 rounded-lg border ${
                          prog?.saved
                            ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white border-[#123C32] dark:border-[#1F7A59]'
                            : 'border-[#17231F]/15 dark:border-white/15 text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected(res)}
                      className="px-4 py-2 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
                    >
                      Read Lesson
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121B18] h-full overflow-y-auto p-6 sm:p-8 space-y-6 border-l border-transparent dark:border-white/10">
            <div className="flex items-start justify-between gap-4 border-b border-[#17231F]/10 dark:border-white/10 pb-4">
              <div>
                <div className="text-xs font-semibold text-[#1F7A59] dark:text-[#57C496]">
                  {selected.category} · {selected.contentType}
                </div>
                <h3 className="font-display text-2xl font-bold text-[#17231F] dark:text-[#ECF1EE] mt-1">{selected.title}</h3>
                {selected.authorName && (
                  <p className="text-xs text-[#77817C] dark:text-[#9AA8A1] mt-1">By {selected.authorName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-[#17231F]/90 dark:text-[#ECF1EE]/90 leading-relaxed whitespace-pre-wrap">
              {selected.contentBody}
            </div>

            {isAuthenticated && selected.id && (
              <div className="pt-4 border-t border-[#17231F]/10 dark:border-white/10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleProgress(selected.id!, { completed: !progress[selected.id!]?.completed })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {progress[selected.id]?.completed ? 'Completed (Click to Unmark)' : 'Mark Lesson Completed'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const MentorshipPage: React.FC = () => {
  const { firebaseUser, account } = useAuth();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [tab, setTab] = useState<'directory' | 'requests' | 'apply'>('directory');
  const [expertiseFilter, setExpertiseFilter] = useState('');
  const [requestTarget, setRequestTarget] = useState<MentorProfile | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Mentor application form
  const [mBackground, setMBackground] = useState('');
  const [mIndustry, setMIndustry] = useState<string>(INDUSTRIES[0]);
  const [mExpertise, setMExpertise] = useState('');
  const [mYears, setMYears] = useState('5');
  const [mState, setMState] = useState<string>(account?.state || 'FCT - Abuja');
  const [mAvailability, setMAvailability] = useState('2 sessions / week');
  const [mBio, setMBio] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const mentorSnap = await getDocs(
          query(collection(db, 'mentor_profiles'), where('approvalStatus', '==', 'approved'))
        );
        if (!active) return;
        setMentors(mentorSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MentorProfile)));

        if (firebaseUser && firebaseUser.emailVerified) {
          const [sent, recv] = await Promise.all([
            getDocs(query(collection(db, 'mentorship_requests'), where('menteeId', '==', firebaseUser.uid))),
            getDocs(query(collection(db, 'mentorship_requests'), where('mentorOwnerId', '==', firebaseUser.uid))),
          ]);
          const map = new Map<string, MentorshipRequest>();
          for (const d of [...sent.docs, ...recv.docs]) {
            map.set(d.id, { id: d.id, ...d.data() } as MentorshipRequest);
          }
          if (active) setRequests(Array.from(map.values()));
        }
      } catch (err) {
        console.error('Error loading mentorship:', err);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const filteredMentors = useMemo(() => {
    if (!expertiseFilter.trim()) return mentors;
    const q = expertiseFilter.toLowerCase();
    return mentors.filter((m) =>
      `${m.fullName} ${m.background} ${m.industry} ${(m.expertise || []).join(' ')} ${m.state}`
        .toLowerCase()
        .includes(q)
    );
  }, [mentors, expertiseFilter]);

  const submitMentorshipRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !requestTarget?.id) return;
    try {
      const payload = {
        menteeId: firebaseUser.uid,
        menteeName: account?.fullName || 'GIRMA Member',
        mentorId: requestTarget.id,
        mentorOwnerId: requestTarget.ownerId,
        mentorName: requestTarget.fullName,
        topic: topic.trim(),
        message: message.trim(),
        status: 'pending' as const,
      };
      const ref = await addDoc(collection(db, 'mentorship_requests'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRequests((prev) => [{ id: ref.id, ...payload }, ...prev]);
      setRequestTarget(null);
      setTopic('');
      setMessage('');
      setNotice(`Mentorship request sent to ${requestTarget.fullName}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'mentorship_requests');
    }
  };

  const updateRequestStatus = async (reqId: string, status: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'mentorship_requests', reqId), {
        status,
        updatedAt: serverTimestamp(),
      });
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status } : r)));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `mentorship_requests/${reqId}`);
    }
  };

  const submitMentorApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    try {
      await setDoc(
        doc(db, 'mentor_profiles', `mentor_${firebaseUser.uid}`),
        {
          ownerId: firebaseUser.uid,
          fullName: account?.fullName || firebaseUser.displayName || 'Mentor Applicant',
          background: mBackground.trim(),
          expertise: mExpertise.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
          industry: mIndustry,
          yearsExperience: Math.max(0, Number(mYears) || 1),
          country: account?.country || 'Nigeria',
          state: mState,
          availability: mAvailability.trim(),
          bio: mBio.trim(),
          approvalStatus: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setNotice('Mentor profile submitted. It will appear publicly once approved by an administrator.');
      setTab('directory');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mentor_profiles/mentor_${firebaseUser.uid}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Mentorship &amp; Advisory</h2>
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] mt-1">
            Connect with admin-verified industry mentors across finance, agribusiness, technology, and operations.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('directory')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'directory' ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white' : 'text-[#77817C] dark:text-[#9AA8A1]'
            }`}
          >
            Verified Mentors
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'requests' ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white' : 'text-[#77817C] dark:text-[#9AA8A1]'
            }`}
          >
            Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('apply')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'apply' ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white' : 'text-[#77817C] dark:text-[#9AA8A1]'
            }`}
          >
            Apply as Mentor
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-[#123C32] dark:bg-[#1F7A59] text-white px-4 py-3 rounded-lg text-xs flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {tab === 'directory' && (
        <>
          <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4">
            <input
              type="search"
              value={expertiseFilter}
              onChange={(e) => setExpertiseFilter(e.target.value)}
              placeholder="Filter mentors by expertise, industry, or Nigerian state..."
              className="w-full px-3.5 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredMentors.map((m, idx) => (
              <div key={m.id} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#17231F]/10 dark:border-white/10">
                    {idx === 0 ? (
                      <ResilientImage
                        src={mentorPortraitImg}
                        alt={m.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#123C32]/10 dark:bg-[#1F7A59]/20 flex items-center justify-center text-[#123C32] dark:text-[#57C496]">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-semibold text-[#238653] dark:text-[#57C496]">
                      Verified Mentor · {m.yearsExperience} yrs exp
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">{m.fullName}</h3>
                    <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{m.background} · {m.state}</p>
                  </div>
                </div>
                <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">{m.bio}</p>
                <div className="text-xs text-[#17231F] dark:text-[#ECF1EE]">
                  Expertise: {(m.expertise || [m.industry]).join(' · ')}
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex items-center justify-between gap-4 text-xs">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">{m.availability}</span>
                  <button
                    type="button"
                    onClick={() => setRequestTarget(m)}
                    className="px-4 py-2 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white font-semibold whitespace-nowrap hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
                  >
                    Request Mentorship
                  </button>
                </div>
              </div>
            ))}
            {filteredMentors.length === 0 && (
              <div className="col-span-full bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-8 text-center text-sm text-[#77817C] dark:text-[#9AA8A1]">
                No verified mentors match that filter yet.
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl divide-y divide-[#17231F]/10 dark:divide-white/10">
          {requests.length === 0 ? (
            <p className="p-8 text-sm text-[#77817C] dark:text-[#9AA8A1] text-center">No mentorship requests yet.</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
                    {r.menteeName} → {r.mentorName} · Topic: <strong className="text-[#17231F] dark:text-[#ECF1EE]">{r.topic}</strong> · Status: <strong className="capitalize text-[#1F7A59] dark:text-[#57C496]">{r.status}</strong>
                  </div>
                  <p className="text-sm text-[#17231F] dark:text-[#ECF1EE]">{r.message}</p>
                </div>
                {r.mentorOwnerId === firebaseUser?.uid && r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => r.id && updateRequestStatus(r.id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg bg-[#238653] text-white text-xs font-semibold"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => r.id && updateRequestStatus(r.id, 'declined')}
                      className="px-3 py-1.5 rounded-lg border border-[#D94C4C]/30 dark:border-[#F87171]/35 text-[#D94C4C] dark:text-[#F87171] text-xs font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'apply' && (
        <form onSubmit={submitMentorApplication} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-4 max-w-2xl">
          <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">Apply to Become a Verified GIRMA Mentor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Professional Background</label>
              <input
                required
                value={mBackground}
                onChange={(e) => setMBackground(e.target.value)}
                placeholder="e.g., Agro-Export & Finance Specialist"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Industry</label>
              <select
                value={mIndustry}
                onChange={(e) => setMIndustry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-sm bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE]"
              >
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Expertise Areas (comma-separated)</label>
              <input
                required
                value={mExpertise}
                onChange={(e) => setMExpertise(e.target.value)}
                placeholder="Grant writing, Bookkeeping, Supply Chain"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Years of Experience</label>
              <input
                type="number"
                min={1}
                value={mYears}
                onChange={(e) => setMYears(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">State</label>
              <select
                value={mState}
                onChange={(e) => setMState(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 text-sm bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE]"
              >
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Availability</label>
              <input
                required
                value={mAvailability}
                onChange={(e) => setMAvailability(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Mentor Biography</label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={mBio}
              onChange={(e) => setMBio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE]"
            />
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]">
            Submit for Admin Approval
          </button>
        </form>
      )}

      {requestTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={submitMentorshipRequest} className="bg-white dark:bg-[#121B18] border border-transparent dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center text-[#17231F] dark:text-[#ECF1EE]">
              <h3 className="font-display text-lg font-bold">Request Mentorship: {requestTarget.fullName}</h3>
              <button type="button" onClick={() => setRequestTarget(null)} className="p-1 rounded-lg hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Topic</label>
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Grant Readiness & Financial Projections"
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Message</label>
              <textarea
                required
                minLength={5}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly describe your business or career goal..."
                className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]">
              Send Mentorship Request
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
