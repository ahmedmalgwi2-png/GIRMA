import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, BookOpen, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FUNDING_SECTIONS, Opportunity } from '../types/girma';
import { formatNaira } from '../lib/matchingEngine';

interface FundingHubPageProps {
  navigate: (path: string) => void;
  isAuthenticated: boolean;
}

const FUNDING_EDUCATION = [
  {
    title: 'How to Write a Grant Proposal',
    summary:
      'Align problem statements with funder mandates, quantify beneficiaries, and avoid vague lump-sum Naira budgets.',
  },
  {
    title: 'How to Prepare a Business Plan',
    summary:
      'Structure market sizing, operational workflows, competitive positioning, and realistic 24-month cash assumptions.',
  },
  {
    title: 'How to Develop a Pitch Deck',
    summary:
      'Present Problem, Solution, Nigerian Market Reality, Traction, Unit Economics, Team, and Capital Use in 10 concise slides.',
  },
  {
    title: 'How to Calculate Startup Costs & Financial Projections',
    summary:
      'Separate one-time capital equipment from 6-month working capital runway and calculate true break-even sales volume.',
  },
  {
    title: 'Equity vs. Debt Financing & Approaching Investors',
    summary:
      'Understand when non-dilutive grants, concessionary BOI/DBN loans, or angel equity best fit your business cashflow.',
  },
];

export const FundingHubPage: React.FC<FundingHubPageProps> = ({ navigate, isAuthenticated }) => {
  const [section, setSection] = useState<string>('All');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGuide, setActiveGuide] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function loadFunding() {
      try {
        const snap = await getDocs(
          query(collection(db, 'opportunities'), where('status', '==', 'published'))
        );
        if (!active) return;
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity));
        const fundingOnly = all.filter(
          (o) =>
            ['Grants', 'Business Funding', 'Loans', 'Government Empowerment Programmes', 'Startup Accelerators'].includes(
              o.category
            ) || Boolean(o.fundingType)
        );
        setOpportunities(fundingOnly);
      } catch (err) {
        console.error('Error loading funding hub:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFunding();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (section === 'All') return opportunities;
    return opportunities.filter((o) => {
      const ft = (o.fundingType || '').toLowerCase();
      const cat = (o.category || '').toLowerCase();
      const desc = `${o.title} ${o.description} ${o.industry}`.toLowerCase();
      const s = section.toLowerCase();
      return ft.includes(s) || cat.includes(s) || desc.includes(s.replace('-focused', ''));
    });
  }, [opportunities, section]);

  return (
    <div className="space-y-10">
      <div className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#1F7A59] dark:text-[#57C496]">GIRMA Funding Hub</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
          Capital Discovery &amp; Funding Readiness
        </h2>
        <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
          Explore verified grants, SME loans, angel investment windows, and government empowerment funds. GIRMA connects you to official sources and never guarantees funding approval.
        </p>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection('All')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            section === 'All'
              ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white'
              : 'bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 text-[#17231F] dark:text-[#ECF1EE] hover:border-[#123C32] dark:hover:border-[#57C496]'
          }`}
        >
          All Funding
        </button>
        {FUNDING_SECTIONS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSection(sec)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              section === sec
                ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white'
                : 'bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 text-[#17231F] dark:text-[#ECF1EE] hover:border-[#123C32] dark:hover:border-[#57C496]'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Funding Listings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-8 text-center text-sm text-[#77817C] dark:text-[#9AA8A1]">
          No published funding listings match “{section}” right now. Try selecting All Funding.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#77817C] dark:text-[#9AA8A1]">
                  <span className="font-semibold text-[#1F7A59] dark:text-[#57C496]">
                    {opp.fundingType || opp.category}
                  </span>
                  <span className="font-mono tabular-nums">Deadline {opp.deadlineDate}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">{opp.title}</h3>
                <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{opp.organizationName}</p>
                <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] line-clamp-2">{opp.eligibilitySummary || opp.description}</p>
              </div>

              <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-sm font-semibold tabular-nums text-[#123C32] dark:text-[#57C496]">
                  {opp.fundingAmountMax
                    ? `${formatNaira(opp.fundingAmountMin, opp.fundingCurrency)} – ${formatNaira(opp.fundingAmountMax, opp.fundingCurrency)}`
                    : 'See official source'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        isAuthenticated
                          ? `/app/opportunities?id=${opp.id}`
                          : `/explore?id=${opp.id}`
                      )
                    }
                    className="px-3.5 py-2 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:bg-[#123C32]/5 dark:hover:bg-[#57C496]/10 transition-colors"
                  >
                    Eligibility &amp; Match
                  </button>
                  <a
                    href={opp.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors"
                  >
                    <span>Official Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Funding Education */}
      <section className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#123C32] dark:text-[#57C496]" />
            <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Funding Readiness Education</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/app/toolkit' : '/register')}
            className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] inline-flex items-center gap-1 hover:underline"
          >
            <span>Open Financial Calculators &amp; Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-2">
            {FUNDING_EDUCATION.map((g, idx) => (
              <button
                key={g.title}
                type="button"
                onClick={() => setActiveGuide(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeGuide === idx
                    ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white'
                    : 'bg-[#F8F7F1] dark:bg-[#17231F] text-[#17231F] dark:text-[#ECF1EE] hover:bg-[#123C32]/10 dark:hover:bg-[#57C496]/15'
                }`}
              >
                {g.title}
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h4 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">
                {FUNDING_EDUCATION[activeGuide].title}
              </h4>
              <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
                {FUNDING_EDUCATION[activeGuide].summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/app/assistant' : '/register')}
                className="px-4 py-2 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold"
              >
                Draft With Ask GIRMA
              </button>
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/app/toolkit' : '/register')}
                className="px-4 py-2 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
              >
                Launch Business Toolkit
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
