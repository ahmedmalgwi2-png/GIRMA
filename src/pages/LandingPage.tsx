import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, Landmark, MessageSquare, ShieldCheck, Store } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Opportunity } from '../types/girma';
import { formatNaira } from '../lib/matchingEngine';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import heroEcosystemImg from '../assets/images/hero_girma_ecosystem_1794660906822.jpg';
import pillarAgriImg from '../assets/images/pillar_agriculture_market_1794660907397.jpg';
import pillarTechImg from '../assets/images/pillar_tech_startup_1794660907503.jpg';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { firebaseUser } = useAuth();
  const [liveOpportunities, setLiveOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      try {
        const q = query(
          collection(db, 'opportunities'),
          where('status', '==', 'published'),
          limit(4)
        );
        const snap = await getDocs(q);
        if (active) {
          setLiveOpportunities(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity)));
        }
      } catch {
        if (active) setLiveOpportunities([]);
      } finally {
        if (active) setLoadingOpps(false);
      }
    }
    loadPreview();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-medium tracking-wide text-[#1F7A59] dark:text-[#57C496]">
              Northern Nigeria &amp; Pan-African Enterprise Ecosystem
            </p>
            <h1
              className="font-display font-bold text-[#17231F] dark:text-[#ECF1EE] tracking-tight leading-[1.08]"
              style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
            >
              Your Potential Deserves Access.
            </h1>
            <p className="text-base sm:text-lg text-[#77817C] dark:text-[#9AA8A1] leading-relaxed max-w-xl">
              GIRMA connects entrepreneurs, innovators, and ambitious individuals to funding, opportunities, markets, knowledge, and the support they need to grow.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate(firebaseUser ? '/app' : '/register')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1] text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors whitespace-nowrap"
              >
                <span>{firebaseUser ? 'Open Dashboard' : 'Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/explore')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-[#123C32] dark:text-[#57C496] text-sm font-semibold hover:border-[#123C32] dark:hover:border-[#57C496] transition-colors whitespace-nowrap"
              >
                <span>Explore Opportunities</span>
              </button>
            </div>
            <div className="pt-4 border-t border-[#17231F]/10 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#77817C] dark:text-[#9AA8A1]">
              <span>Growth</span>
              <span aria-hidden="true">·</span>
              <span>Innovation</span>
              <span aria-hidden="true">·</span>
              <span>Resources</span>
              <span aria-hidden="true">·</span>
              <span>Markets</span>
              <span aria-hidden="true">·</span>
              <span>Access</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-[#17231F]/10 dark:border-white/10 bg-white dark:bg-[#121B18]">
              <ResilientImage
                src={heroEcosystemImg}
                alt="Entrepreneurs and startup founders collaborating in a sunlit Northern Nigeria innovation hub"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Access Problem */}
      <section className="bg-white dark:bg-[#121B18] border-y border-[#17231F]/10 dark:border-white/10 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE] leading-tight" style={{ textWrap: 'balance' }}>
              Talent and enterprise exist everywhere. Organized access does not.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-4 text-[#77817C] dark:text-[#9AA8A1] text-base leading-relaxed">
            <p>
              Across Northern Nigeria and the wider African continent, capable founders, agribusiness owners, artisans, students, and young professionals build real value every day—yet miss grants, institutional procurement, scholarships, and markets because information is scattered and eligibility rules are unclear.
            </p>
            <p className="text-[#17231F] dark:text-[#ECF1EE] font-medium">
              GIRMA closes this access gap by organizing verified opportunities, checking mandatory eligibility before you apply, and pairing you with practical business tools and AI guidance.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How GIRMA Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
            How GIRMA Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#77817C] dark:text-[#9AA8A1]">
            A structured workflow from profile setup to verified opportunity execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01. Build Your Profile',
              text: 'Select your category—founder, SME, student, mentor, or organization—and capture your state, sector, and stage.',
            },
            {
              step: '02. Match With Clarity',
              text: 'GIRMA Match scores opportunities against real eligibility criteria and highlights missing requirements upfront.',
            },
            {
              step: '03. Prepare & Calculate',
              text: 'Use mathematical Break-Even, Pricing, and Startup Cost calculators alongside Ask GIRMA to draft strong proposals.',
            },
            {
              step: '04. Track & Connect',
              text: 'Monitor deadlines with 7-day, 3-day, and 1-day alerts, track submissions, and connect with mentors and buyers.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-[#123C32] dark:text-[#57C496]">{item.step}</h3>
              <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Core Ecosystem Pillars */}
      <section className="bg-white dark:bg-[#121B18] border-y border-[#17231F]/10 dark:border-white/10 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
                Five Pillars Built Around Action
              </h2>
              <p className="mt-2 text-sm text-[#77817C] dark:text-[#9AA8A1]">
                Growth · Innovation · Resources · Markets · Access
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/how-it-works')}
              className="text-sm font-semibold text-[#123C32] dark:text-[#57C496] hover:text-[#1F7A59] dark:hover:text-[#6EE7B7] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>See Full Architecture</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#F8F7F1] dark:bg-[#17231F] border border-[#17231F]/10 dark:border-white/10 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <Compass className="w-5 h-5 text-[#123C32] dark:text-[#57C496]" />
                  <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
                    Opportunity Discovery &amp; Funding Hub
                  </h3>
                  <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
                    Grants, concessionary SME loans, scholarships, accelerators, government programmes, and procurement windows organized across Nigeria and Africa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/funding')}
                  className="text-sm font-semibold text-[#123C32] dark:text-[#57C496] inline-flex items-center gap-1.5 w-fit"
                >
                  <span>Visit Funding Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="min-h-[220px]">
                <ResilientImage
                  src={pillarAgriImg}
                  alt="Nigerian agribusiness founder inspecting packaged food products"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#F8F7F1] dark:bg-[#17231F] border border-[#17231F]/10 dark:border-white/10 rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="h-44 overflow-hidden">
                <ResilientImage
                  src={pillarTechImg}
                  alt="Nigerian startup founders analyzing growth metrics"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 space-y-3">
                <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
                  Business Toolkit &amp; Ask GIRMA
                </h3>
                <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
                  Exact Naira financial calculators, PDF business plan exports, and grounded AI strategic guidance tailored to your industry and state.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Opportunity Discovery Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
              Opportunity Discovery Preview
            </h2>
            <p className="mt-2 text-sm text-[#77817C] dark:text-[#9AA8A1]">
              Live published listings from the GIRMA database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="text-sm font-semibold text-[#123C32] dark:text-[#57C496] hover:text-[#1F7A59] dark:hover:text-[#6EE7B7] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Browse All Opportunities</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingOpps ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 animate-pulse p-6" />
            ))}
          </div>
        ) : liveOpportunities.length === 0 ? (
          <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">
              Published opportunities appear here once an administrator adds or seeds programmes in the Admin Console.
            </p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold"
            >
              Sign In or Create Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4 hover:border-[#123C32]/30 dark:hover:border-[#57C496]/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#77817C] dark:text-[#9AA8A1]">
                    <span className="font-medium text-[#1F7A59] dark:text-[#57C496]">{opp.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{opp.country}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Deadline {opp.deadlineDate}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#17231F] dark:text-[#ECF1EE]">
                    {opp.title}
                  </h3>
                  <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{opp.organizationName}</p>
                  <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] line-clamp-2">{opp.description}</p>
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex items-center justify-between gap-4">
                  <span className="font-mono text-xs tabular-nums text-[#17231F] dark:text-[#ECF1EE] font-medium">
                    {opp.fundingAmountMax
                      ? `Up to ${formatNaira(opp.fundingAmountMax, opp.fundingCurrency)}`
                      : opp.industry}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/explore?highlight=${opp.id}`)}
                    className="text-xs font-semibold text-[#123C32] dark:text-[#57C496] hover:underline whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Funding Hub + Ask GIRMA AI Preview */}
      <section className="bg-[#123C32] dark:bg-[#0F2C24] border-y border-transparent dark:border-white/10 text-[#F8F7F1] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#D6A84F]">
              <MessageSquare className="w-4 h-4" />
              <span>Ask GIRMA — Your Intelligent Growth Companion</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
              Grounded AI built around verified Nigerian and African opportunities.
            </h2>
            <p className="text-sm sm:text-base text-[#F8F7F1]/80 leading-relaxed">
              Ask GIRMA reads your consented business or student profile, filters verified programmes in our database, explains eligibility requirements, and helps structure grant proposals and business plans without fabricating links or false promises.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(firebaseUser ? '/app/assistant' : '/register')}
                className="px-5 py-3 rounded-lg bg-[#D6A84F] text-[#17231F] text-sm font-semibold hover:bg-[#D6A84F]/90 transition-colors whitespace-nowrap"
              >
                Try Ask GIRMA
              </button>
              <button
                type="button"
                onClick={() => navigate('/funding')}
                className="px-5 py-3 rounded-lg border border-[#F8F7F1]/25 text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Explore Funding Guides
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-[#121B18] text-[#17231F] dark:text-[#ECF1EE] border border-transparent dark:border-white/10 rounded-2xl p-6 space-y-4">
            <div className="text-xs font-medium text-[#77817C] dark:text-[#9AA8A1] border-b border-[#17231F]/10 dark:border-white/10 pb-3">
              Example Workflow · Adamawa State Agribusiness
            </div>
            <div className="bg-[#F8F7F1] dark:bg-[#17231F] rounded-lg p-3.5 text-sm">
              “I run a small grain processing business in Adamawa State. What funding fits my stage and what documents do I need?”
            </div>
            <div className="space-y-2 text-sm text-[#17231F]/85 dark:text-[#ECF1EE]/90 leading-relaxed">
              <p className="font-semibold text-[#123C32] dark:text-[#57C496]">Ask GIRMA checks your profile against verified criteria:</p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#77817C] dark:text-[#9AA8A1]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#238653] dark:text-[#57C496] shrink-0 mt-0.5" />
                  <span>Identifies active Northern Nigeria agribusiness grants matching your sector and state.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#238653] dark:text-[#57C496] shrink-0 mt-0.5" />
                  <span>Flags CAC registration or cashflow gaps before you invest time applying.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#238653] dark:text-[#57C496] shrink-0 mt-0.5" />
                  <span>Structures your Executive Summary, Operations, and Naira Budget outline.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Markets, Who GIRMA Serves & Why GIRMA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
              Markets, Business Directory &amp; Mentorship
            </h2>
            <p className="text-sm sm:text-base text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
              Beyond grants and scholarships, businesses grow when customers and suppliers can find and trust them. List products and services in GIRMA Markets, build a public Business Directory profile with admin-reviewed verification, and connect with vetted mentors.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#123C32] dark:text-[#57C496]">
                  <Store className="w-4 h-4" />
                  <span>B2B &amp; Supplier Discovery</span>
                </div>
                <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">Direct business enquiries filtered by Nigerian state and industry.</p>
              </div>
              <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#123C32] dark:text-[#57C496]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Independent Verification</span>
                </div>
                <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">Businesses and mentors are reviewed before receiving verified status.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
            <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Who GIRMA Serves</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-[#17231F] dark:text-[#ECF1EE]">
              {[
                'Young Entrepreneurs',
                'Small & Medium Enterprises',
                'Startup Founders',
                'Students & Graduates',
                'Farmers & Agribusinesses',
                'Women-Owned Businesses',
                'Freelancers & Skilled Pros',
                'Mentors & Consultants',
                'Investors & NGOs',
                'Opportunity Providers',
              ].map((audience) => (
                <div key={audience} className="py-2 border-b border-[#17231F]/10 dark:border-white/10 text-xs sm:text-sm">
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why GIRMA + Final CTA */}
        <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-[#1F7A59] dark:text-[#57C496]">
              <Landmark className="w-4 h-4" />
              <span>Designed for African Connectivity &amp; Naira Realities</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
              Ready to turn potential into measurable progress?
            </h2>
            <p className="text-sm sm:text-base text-[#77817C] dark:text-[#9AA8A1]">
              Create your profile in minutes, get matched to active opportunities across all 36 Nigerian states and FCT, and never miss a critical deadline again.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(firebaseUser ? '/app' : '/register')}
              className="px-6 py-3.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1] text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors whitespace-nowrap"
            >
              {firebaseUser ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="px-6 py-3.5 rounded-lg border border-[#17231F]/20 dark:border-white/20 text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE] hover:border-[#123C32] dark:hover:border-[#57C496] transition-colors whitespace-nowrap"
            >
              View Plans
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
