import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { computeGirmaMatch, formatNaira } from '../lib/matchingEngine';
import {
  AFRICAN_COUNTRIES,
  APPLICATION_STATUSES,
  ApplicationStatus,
  BUSINESS_STAGES,
  INDUSTRIES,
  NIGERIAN_STATES,
  OPPORTUNITY_CATEGORIES,
  Opportunity,
  OpportunityApplication,
} from '../types/girma';

interface OpportunitiesPageProps {
  navigate: (path: string) => void;
  initialQuery?: string;
  initialSelectedId?: string;
  mode?: 'all' | 'saved' | 'applications';
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({
  navigate,
  initialQuery = '',
  initialSelectedId,
  mode = 'all',
}) => {
  const { firebaseUser, account, businessProfile, studentProfile, getIdToken } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Record<string, OpportunityApplication>>({});
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState(initialQuery);
  const [catFilter, setCatFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [minFunding, setMinFunding] = useState('');
  const [sortBy, setSortBy] = useState<'relevant' | 'closing' | 'funding' | 'recent'>('relevant');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<{
    summary: string;
    actionChecklist: string[];
    cautionNote: string;
  } | null>(null);
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false);

  useEffect(() => {
    setSearchText(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const oppSnap = await getDocs(
          query(collection(db, 'opportunities'), where('status', '==', 'published'))
        );
        const list = oppSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity));

        let appMap: Record<string, OpportunityApplication> = {};
        if (firebaseUser && firebaseUser.emailVerified) {
          const appSnap = await getDocs(
            query(collection(db, 'opportunity_applications'), where('userId', '==', firebaseUser.uid))
          );
          for (const d of appSnap.docs) {
            const data = { id: d.id, ...d.data() } as OpportunityApplication;
            appMap[data.opportunityId] = data;
          }
        }

        if (!active) return;
        setOpportunities(list);
        setApplications(appMap);

        if (initialSelectedId) {
          const found = list.find((o) => o.id === initialSelectedId);
          if (found) {
            setSelectedOpp(found);
            setNotesDraft(appMap[found.id || '']?.notes || '');
          }
        }
      } catch (err) {
        console.error('Error loading opportunities:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [firebaseUser, initialSelectedId]);

  const enriched = useMemo(() => {
    return opportunities
      .map((opp) => ({
        opp,
        match: computeGirmaMatch(opp, account, businessProfile, studentProfile),
        app: applications[opp.id || ''],
      }))
      .filter(({ opp, app }) => {
        if (mode === 'saved' || mode === 'applications') {
          if (!app) return false;
        }
        if (searchText.trim()) {
          const q = searchText.toLowerCase();
          const hay = `${opp.title} ${opp.organizationName} ${opp.description} ${opp.industry} ${opp.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (catFilter !== 'All' && opp.category !== catFilter) return false;
        if (industryFilter !== 'All' && opp.industry !== industryFilter) return false;
        if (countryFilter !== 'All' && opp.country !== countryFilter) return false;
        if (
          stateFilter !== 'All' &&
          opp.eligibleStates &&
          !opp.eligibleStates.includes('All States') &&
          !opp.eligibleStates.includes(stateFilter)
        ) {
          return false;
        }
        if (
          stageFilter !== 'All' &&
          opp.eligibleBusinessStages &&
          opp.eligibleBusinessStages.length > 0 &&
          !opp.eligibleBusinessStages.includes(stageFilter)
        ) {
          return false;
        }
        if (minFunding && (opp.fundingAmountMax || 0) < Number(minFunding)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'relevant') return b.match.score - a.match.score;
        if (sortBy === 'closing') {
          return (a.match.daysUntilDeadline ?? 9999) - (b.match.daysUntilDeadline ?? 9999);
        }
        if (sortBy === 'funding') {
          return (b.opp.fundingAmountMax || 0) - (a.opp.fundingAmountMax || 0);
        }
        return (b.opp.openingDate || '').localeCompare(a.opp.openingDate || '');
      });
  }, [
    opportunities,
    account,
    businessProfile,
    studentProfile,
    applications,
    mode,
    searchText,
    catFilter,
    industryFilter,
    countryFilter,
    stateFilter,
    stageFilter,
    minFunding,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(enriched.length / pageSize));
  const paginated = enriched.slice((page - 1) * pageSize, page * pageSize);

  const upsertTracker = async (
    opp: Opportunity,
    status: ApplicationStatus,
    notes: string,
    interested = true
  ) => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    if (!opp.id) return;
    const match = computeGirmaMatch(opp, account, businessProfile, studentProfile);
    const appId = `${firebaseUser.uid}_${opp.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `opportunity_applications/${appId}`;
    try {
      const existing = applications[opp.id];
      const payload: OpportunityApplication = {
        id: appId,
        userId: firebaseUser.uid,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        organizationName: opp.organizationName,
        category: opp.category,
        deadlineDate: opp.deadlineDate,
        status,
        interested,
        notes,
        matchScore: match.score,
      };
      await setDoc(
        doc(db, 'opportunity_applications', appId),
        {
          userId: payload.userId,
          opportunityId: payload.opportunityId,
          opportunityTitle: payload.opportunityTitle,
          organizationName: payload.organizationName,
          category: payload.category,
          deadlineDate: payload.deadlineDate,
          status: payload.status,
          interested: payload.interested,
          notes: payload.notes,
          matchScore: payload.matchScore,
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setApplications((prev) => ({ ...prev, [opp.id!]: payload }));
      setStatusMessage(`Application tracker updated: ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const removeSaved = async (oppId: string) => {
    const existing = applications[oppId];
    if (!existing?.id) return;
    try {
      await deleteDoc(doc(db, 'opportunity_applications', existing.id));
      setApplications((prev) => {
        const next = { ...prev };
        delete next[oppId];
        return next;
      });
      setStatusMessage('Removed from saved opportunities.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `opportunity_applications/${existing.id}`);
    }
  };

  const handleShare = async (opp: Opportunity) => {
    const url = `${window.location.origin}/explore?id=${opp.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatusMessage('Opportunity link copied to clipboard.');
    } catch {
      setStatusMessage(`Share link: ${url}`);
    }
  };

  const fetchAiMatchAdvice = async (opp: Opportunity) => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    setAiAdviceLoading(true);
    setAiAdvice(null);
    try {
      const token = await getIdToken();
      const matchAnalysis = computeGirmaMatch(opp, account, businessProfile, studentProfile);
      const res = await fetch('/api/ai/match-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          opportunity: opp,
          matchAnalysis,
          userProfile: account,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI advice.');
      setAiAdvice(data);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to fetch AI match advice.');
    } finally {
      setAiAdviceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#17231F]">
            {mode === 'saved'
              ? 'Saved Opportunities'
              : mode === 'applications'
              ? 'My Applications Tracker'
              : 'Opportunity Discovery Engine'}
          </h2>
          <p className="text-sm text-[#77817C] mt-1">
            {mode === 'applications'
              ? 'Track every programme from Planning to Apply through Submission and Outcome.'
              : 'Search verified grants, funding, scholarships, fellowships, training, and market programmes.'}
          </p>
        </div>

        {firebaseUser && (
          <div className="flex items-center gap-2 p-1 bg-white border border-[#17231F]/10 rounded-lg">
            <button
              type="button"
              onClick={() => navigate('/app/opportunities')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                mode === 'all' ? 'bg-[#123C32] text-white' : 'text-[#77817C] hover:text-[#17231F]'
              }`}
            >
              All ({opportunities.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/applications')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                mode !== 'all' ? 'bg-[#123C32] text-white' : 'text-[#77817C] hover:text-[#17231F]'
              }`}
            >
              Tracked ({Object.keys(applications).length})
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="bg-[#123C32] text-[#F8F7F1] px-4 py-3 rounded-lg text-xs flex items-center justify-between gap-4">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss message">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Multi-Faceted Filter Bar */}
      <div className="bg-white border border-[#17231F]/10 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#77817C] absolute left-3 top-3" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="Search grants, scholarships, organizations, industries..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
          >
            <option value="All">All Categories</option>
            {OPPORTUNITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort opportunities"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
          >
            <option value="relevant">Sort: Most Relevant (GIRMA Match)</option>
            <option value="closing">Sort: Closing Soon</option>
            <option value="funding">Sort: Highest Funding</option>
            <option value="recent">Sort: Recently Published</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <select
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by industry"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs bg-white"
          >
            <option value="All">All Industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>

          <select
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by country"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs bg-white"
          >
            <option value="All">All Countries</option>
            {AFRICAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by state"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs bg-white"
          >
            <option value="All">All Nigerian States</option>
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by business stage"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs bg-white"
          >
            <option value="All">All Business Stages</option>
            {BUSINESS_STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>

          <input
            type="number"
            min={0}
            value={minFunding}
            onChange={(e) => {
              setMinFunding(e.target.value);
              setPage(1);
            }}
            placeholder="Min Funding (₦)"
            className="px-3 py-2 rounded-lg border border-[#17231F]/15 text-xs font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 rounded-xl bg-white border border-[#17231F]/10 animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white border border-[#17231F]/10 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[#77817C]">
            {mode !== 'all'
              ? 'You have not saved or tracked any opportunities yet.'
              : 'No opportunities match your current search or filter criteria.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setCatFilter('All');
              setIndustryFilter('All');
              setCountryFilter('All');
              setStateFilter('All');
              setStageFilter('All');
              setMinFunding('');
              if (mode !== 'all') navigate('/app/opportunities');
            }}
            className="px-4 py-2 rounded-lg bg-[#123C32] text-white text-xs font-semibold"
          >
            {mode !== 'all' ? 'Discover Opportunities' : 'Reset All Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {paginated.map(({ opp, match, app }) => (
            <div
              key={opp.id}
              className="bg-white border border-[#17231F]/10 rounded-xl p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#1F7A59] font-semibold">
                    {opp.category} · {opp.verificationStatus === 'verified' ? 'Verified Source' : 'Unverified'}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      match.isEligible ? 'text-[#123C32]' : 'text-[#E6A23C]'
                    }`}
                  >
                    Match {match.score}%
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-[#17231F] leading-snug">
                  {opp.title}
                </h3>
                <p className="text-xs text-[#77817C]">
                  {opp.organizationName} · {opp.country} · {opp.industry}
                </p>
                <p className="text-sm text-[#77817C] line-clamp-2">{opp.description}</p>
              </div>

              <div className="pt-3 border-t border-[#17231F]/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <div className="font-mono tabular-nums font-semibold text-[#17231F]">
                    {opp.fundingAmountMax
                      ? `Up to ${formatNaira(opp.fundingAmountMax, opp.fundingCurrency)}`
                      : opp.benefits?.slice(0, 38) || 'Non-monetary support'}
                  </div>
                  <div className="font-mono tabular-nums text-[#77817C]">
                    Deadline: {opp.deadlineDate}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {firebaseUser && (
                    <button
                      type="button"
                      onClick={() =>
                        app
                          ? removeSaved(opp.id!)
                          : upsertTracker(opp, 'Saved', '')
                      }
                      aria-label={app ? 'Remove saved opportunity' : 'Save opportunity'}
                      className={`p-2 rounded-lg border text-xs ${
                        app
                          ? 'bg-[#123C32] text-white border-[#123C32]'
                          : 'border-[#17231F]/15 text-[#17231F] hover:border-[#123C32]'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOpp(opp);
                      setNotesDraft(app?.notes || '');
                      setAiAdvice(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#123C32] text-white text-xs font-semibold hover:bg-[#1F7A59] whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-[#77817C]">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, enriched.length)} of{' '}
            {enriched.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-[#17231F]/15 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-[#17231F]/15 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Opportunity Detail Modal / Drawer */}
      {selectedOpp && (() => {
        const match = computeGirmaMatch(selectedOpp, account, businessProfile, studentProfile);
        const app = applications[selectedOpp.id || ''];
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#17231F]/10 pb-4">
                <div className="space-y-1">
                  <div className="text-xs text-[#1F7A59] font-semibold">
                    {selectedOpp.category} · {selectedOpp.verificationStatus === 'verified' ? 'Verified Source' : 'Unverified'}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#17231F]">
                    {selectedOpp.title}
                  </h2>
                  <p className="text-sm text-[#77817C]">{selectedOpp.organizationName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 rounded-lg hover:bg-[#F8F7F1]"
                  aria-label="Close opportunity details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* GIRMA Match Transparency Card */}
              <div className="bg-[#F8F7F1] border border-[#17231F]/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-[#123C32]">GIRMA Match Analysis</div>
                    <div className="text-xs text-[#77817C]">
                      {match.isEligible
                        ? 'Meets mandatory programme criteria'
                        : 'Mandatory eligibility gap detected'}
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-[#123C32]">
                    {match.score}%
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[#17231F]">Why You Match &amp; Satisfied</div>
                    {[...match.reasons, ...match.satisfiedRequirements].map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[#238653]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[#17231F]">What You Need</div>
                    {match.missingRequirements.length === 0 ? (
                      <p className="text-[#77817C]">All core requirements ready.</p>
                    ) : (
                      match.missingRequirements.map((m, i) => (
                        <div key={i} className="text-[#77817C]">· {m}</div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#17231F]/10 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[#17231F]">{match.recommendedAction}</p>
                  {firebaseUser && (
                    <button
                      type="button"
                      disabled={aiAdviceLoading}
                      onClick={() => fetchAiMatchAdvice(selectedOpp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123C32] text-white text-xs font-semibold hover:bg-[#1F7A59] disabled:opacity-60 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiAdviceLoading ? 'Analyzing...' : 'AI Preparation Plan'}</span>
                    </button>
                  )}
                </div>

                {aiAdvice && (
                  <div className="bg-white border border-[#17231F]/10 rounded-lg p-4 space-y-2 text-xs">
                    <p className="font-semibold text-[#123C32]">{aiAdvice.summary}</p>
                    <ul className="space-y-1 text-[#17231F]">
                      {aiAdvice.actionChecklist.map((step, idx) => (
                        <li key={idx}>
                          {idx + 1}. {step}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[#E6A23C] font-medium">{aiAdvice.cautionNote}</p>
                  </div>
                )}
              </div>

              {/* Full Opportunity Metadata */}
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white border border-[#17231F]/10 rounded-xl p-4">
                  <div>
                    <span className="text-xs text-[#77817C] block">Funding / Benefit</span>
                    <span className="font-mono font-semibold text-xs tabular-nums">
                      {selectedOpp.fundingAmountMax
                        ? `${formatNaira(selectedOpp.fundingAmountMin, selectedOpp.fundingCurrency)} – ${formatNaira(selectedOpp.fundingAmountMax, selectedOpp.fundingCurrency)}`
                        : 'Programme Support'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#77817C] block">Deadline</span>
                    <span className="font-mono font-semibold text-xs tabular-nums">
                      {selectedOpp.deadlineDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#77817C] block">Location</span>
                    <span className="font-semibold text-xs">
                      {selectedOpp.country} ({(selectedOpp.eligibleStates || ['All']).slice(0, 3).join(', ')})
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#17231F] mb-1">Description</h3>
                  <p className="text-[#77817C] leading-relaxed">{selectedOpp.description}</p>
                </div>

                {selectedOpp.eligibilitySummary && (
                  <div>
                    <h3 className="font-semibold text-[#17231F] mb-1">Eligibility Requirements</h3>
                    <p className="text-[#77817C] leading-relaxed">{selectedOpp.eligibilitySummary}</p>
                  </div>
                )}

                {selectedOpp.benefits && (
                  <div>
                    <h3 className="font-semibold text-[#17231F] mb-1">Benefits</h3>
                    <p className="text-[#77817C] leading-relaxed">{selectedOpp.benefits}</p>
                  </div>
                )}

                {selectedOpp.applicationInstructions && (
                  <div>
                    <h3 className="font-semibold text-[#17231F] mb-1">Application Instructions</h3>
                    <p className="text-[#77817C] leading-relaxed">{selectedOpp.applicationInstructions}</p>
                  </div>
                )}
              </div>

              {/* Application Tracking & Official External Link */}
              <div className="border-t border-[#17231F]/10 pt-5 space-y-4">
                {firebaseUser ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5">Application Status</label>
                        <select
                          value={app?.status || 'Saved'}
                          onChange={(e) =>
                            upsertTracker(
                              selectedOpp,
                              e.target.value as ApplicationStatus,
                              notesDraft
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                        >
                          {APPLICATION_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            upsertTracker(
                              selectedOpp,
                              app?.status || 'Planning to Apply',
                              notesDraft,
                              true
                            )
                          }
                          className="flex-1 py-2 px-4 rounded-lg bg-[#123C32] text-white text-xs font-semibold hover:bg-[#1F7A59]"
                        >
                          Save Status &amp; Notes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(selectedOpp)}
                          className="p-2 rounded-lg border border-[#17231F]/15 hover:bg-[#F8F7F1]"
                          aria-label="Share opportunity"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Personal Application Notes</label>
                      <textarea
                        rows={3}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Record submission date, portal reference ID, or documents left to prepare..."
                        className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
                  >
                    Sign In to Save &amp; Track Application
                  </button>
                )}

                <div className="bg-[#F8F7F1] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#77817C]">
                    Opening the external provider website does not automatically submit your application on GIRMA.
                  </p>
                  <a
                    href={selectedOpp.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D6A84F] text-[#17231F] text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    <span>Open Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
