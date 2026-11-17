import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Check, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { ResilientImage } from '../components/ResilientImage';
import learningWorkshopImg from '../assets/images/learning_workshop_1794660909279.jpg';

interface PublicPageProps {
  navigate: (path: string) => void;
}

export const AboutPage: React.FC<PublicPageProps> = ({ navigate }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
    <div className="space-y-4 max-w-3xl">
      <p className="text-xs font-medium text-[#1F7A59] dark:text-[#57C496]">About GIRMA Technologies</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
        Where Potential Meets Access.
      </h1>
      <p className="text-base text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
        GIRMA (Growth, Innovation, Resources, Markets and Access) was founded by Ahmed Malgwi to bridge the persistent access gap facing entrepreneurs, SMEs, students, and innovators across Northern Nigeria and Africa.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
      <div className="rounded-2xl overflow-hidden border border-[#17231F]/10 dark:border-white/10 bg-white dark:bg-[#121B18]">
        <ResilientImage
          src={learningWorkshopImg}
          alt="Entrepreneurs and young professionals in a financial literacy workshop"
          className="w-full h-full object-cover min-h-[260px]"
        />
      </div>
      <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Our Mission</h2>
        <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
          People across Africa possess viable ideas, craft, agricultural output, and engineering talent—but opportunities remain fragmented across inaccessible PDFs, closed networks, and unclear eligibility rules.
        </p>
        <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
          GIRMA brings opportunity discovery, transparent eligibility matching, financial tooling, B2B market visibility, mentorship, and grounded AI assistance into one reliable platform built for local connectivity.
        </p>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors"
        >
          <span>Join GIRMA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

export const HowItWorksPage: React.FC<PublicPageProps> = ({ navigate }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
    <div className="space-y-3 max-w-2xl">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17231F] dark:text-[#ECF1EE]">How GIRMA Works</h1>
      <p className="text-base text-[#77817C] dark:text-[#9AA8A1]">
        Every module in GIRMA connects back to your verified user profile so recommendations, deadlines, and business plans reflect your real stage.
      </p>
    </div>

    <div className="space-y-6">
      {[
        {
          title: '01. Conditional Smart Onboarding',
          body: 'Whether you register as an Entrepreneur, Small Business Owner, Startup Founder, Student, Graduate, Mentor, or Organization, GIRMA collects only the fields relevant to your path—across all 36 Nigerian states and the FCT.',
        },
        {
          title: '02. Deterministic + AI Opportunity Matching (GIRMA Match)',
          body: 'Mandatory rules (location, CAC registration, business stage, education level, and active deadline) are evaluated deterministically first. AI assists with preparation checklists without ever overriding mandatory eligibility.',
        },
        {
          title: '03. Funding Hub, Business Toolkit & Ask GIRMA',
          body: 'Explore grants, loans, angel syndicates, and government empowerment programmes. Run mathematical Startup Cost, Profit & Loss, Break-Even, and Pricing calculations, export PDFs, and collaborate with Ask GIRMA.',
        },
        {
          title: '04. Deadline Intelligence & Ecosystem Connections',
          body: 'Receive deduplicated 7-day, 3-day, and 1-day alerts for high-match and saved opportunities, list your products in Markets, and request guidance from admin-approved mentors.',
        },
      ].map((step) => (
        <div key={step.title} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-6 sm:p-8 space-y-2">
          <h2 className="font-display text-xl font-semibold text-[#123C32] dark:text-[#57C496]">{step.title}</h2>
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">{step.body}</p>
        </div>
      ))}
    </div>

    <div className="pt-2">
      <button
        type="button"
        onClick={() => navigate('/register')}
        className="px-6 py-3 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] transition-colors"
      >
        Get Started Now
      </button>
    </div>
  </div>
);

export const PricingPage: React.FC<PublicPageProps> = ({ navigate }) => {
  const plans = [
    {
      name: 'Free Plan',
      audience: 'For individuals & early-stage founders',
      price: '₦0',
      cadence: 'per month',
      features: [
        'Full user & business profile',
        'Opportunity discovery & filters',
        'Deterministic GIRMA Match scoring',
        'Saved opportunities & application tracker',
        'Core Learning Centre guides',
        'Standard Ask GIRMA assistance',
      ],
      cta: 'Start Free Account',
    },
    {
      name: 'GIRMA Pro',
      audience: 'For active entrepreneurs & growing SMEs',
      price: '₦3,000',
      cadence: 'proposed / month',
      highlighted: true,
      features: [
        'Everything in Free Plan',
        'Extended Ask GIRMA strategic sessions',
        'Enhanced AI match preparation checklists',
        'Unlimited Business Toolkit PDF exports',
        'Priority Deadline Intelligence alerts',
        'Extended application portfolio tracking',
      ],
      cta: 'Register Interest (Free Now)',
    },
    {
      name: 'Organization Plan',
      audience: 'For NGOs, investors & institutions',
      price: '₦10,000–₦50,000+',
      cadence: 'proposed / month',
      features: [
        'Verified Organization Profile',
        'Opportunity publishing & intake review',
        'Talent & verified SME discovery',
        'Regional & sector engagement analytics',
        'Sponsored opportunity placement options',
        'Dedicated support onboarding',
      ],
      cta: 'Contact Organization Desk',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="max-w-2xl space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
          Transparent Freemium Plans
        </h1>
        <p className="text-sm sm:text-base text-[#77817C] dark:text-[#9AA8A1]">
          Core opportunity access remains free. Paid tiers are structured below in Nigerian Naira (₦); online billing is disabled until payment provider configuration is activated.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-8 flex flex-col justify-between space-y-6 border ${
              p.highlighted
                ? 'bg-[#123C32] dark:bg-[#153D33] text-[#F8F7F1] border-[#123C32] dark:border-[#57C496]/40'
                : 'bg-white dark:bg-[#121B18] text-[#17231F] dark:text-[#ECF1EE] border-[#17231F]/10 dark:border-white/10'
            }`}
          >
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                <p className={`text-xs mt-1 ${p.highlighted ? 'text-[#F8F7F1]/75' : 'text-[#77817C] dark:text-[#9AA8A1]'}`}>
                  {p.audience}
                </p>
              </div>
              <div className="pt-2">
                <span className="font-mono text-2xl font-bold tabular-nums">{p.price}</span>
                <span className={`text-xs ml-2 ${p.highlighted ? 'text-[#F8F7F1]/75' : 'text-[#77817C] dark:text-[#9AA8A1]'}`}>
                  {p.cadence}
                </span>
              </div>
              <ul className="space-y-2.5 pt-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        p.highlighted ? 'text-[#D6A84F]' : 'text-[#238653] dark:text-[#57C496]'
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(p.name === 'Organization Plan' ? '/contact' : '/register')
              }
              className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
                p.highlighted
                  ? 'bg-[#D6A84F] text-[#17231F] hover:bg-[#D6A84F]/90'
                  : 'bg-[#123C32] dark:bg-[#1F7A59] text-white hover:bg-[#1F7A59] dark:hover:bg-[#238653]'
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !email.includes('@') || message.trim().length < 10) {
      setStatus({ type: 'err', text: 'Please enter a valid name, email, subject, and message (at least 10 characters).' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await addDoc(collection(db, 'contact_messages'), {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || 'General Enquiry',
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setStatus({ type: 'ok', text: 'Your enquiry has been recorded. The GIRMA team will respond via email.' });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus({ type: 'err', text: 'Unable to send message right now. Please try again shortly.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Contact GIRMA</h1>
        <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">
          Reach out for opportunity listings, organizational partnerships, business verification questions, or support.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
        {status && (
          <div
            className={`p-3.5 rounded-lg text-sm ${
              status.type === 'ok'
                ? 'bg-[#238653]/10 dark:bg-[#238653]/20 text-[#238653] dark:text-[#57C496]'
                : 'bg-[#D94C4C]/10 dark:bg-[#D94C4C]/20 text-[#D94C4C] dark:text-[#F87171]'
            }`}
          >
            {status.text}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5" htmlFor="c-name">
              Full Name
            </label>
            <input
              id="c-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE] border border-[#17231F]/15 dark:border-white/15 text-sm focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
              placeholder="Amina Yusuf"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5" htmlFor="c-email">
              Email Address
            </label>
            <input
              id="c-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE] border border-[#17231F]/15 dark:border-white/15 text-sm focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
              placeholder="amina@enterprise.ng"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5" htmlFor="c-subj">
            Subject
          </label>
          <input
            id="c-subj"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE] border border-[#17231F]/15 dark:border-white/15 text-sm focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
            placeholder="Partnership or Opportunity Submission"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5" htmlFor="c-msg">
            Message
          </label>
          <textarea
            id="c-msg"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#0F1714] text-[#17231F] dark:text-[#ECF1EE] border border-[#17231F]/15 dark:border-white/15 text-sm focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
            placeholder="Share details of your enquiry..."
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
    <h1 className="font-display text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Privacy Policy</h1>
    <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
      <p>
        GIRMA Technologies respects your personal and business data. Private account details including email address and phone number are isolated to your account and authorized system administrators.
      </p>
      <p>
        <strong className="text-[#17231F] dark:text-[#ECF1EE]">AI Context Consent:</strong> You control in Settings whether Ask GIRMA may reference your business or student profile to tailor guidance. We never expose API keys or private contact details in public directories unless you explicitly publish a public business profile.
      </p>
      <p>
        <strong className="text-[#17231F] dark:text-[#ECF1EE]">Data Retention &amp; Security:</strong> Authentication tokens are managed securely, database writes are protected by strict owner-based access rules, and administrative actions are recorded in audit logs.
      </p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
    <h1 className="font-display text-3xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Terms of Service</h1>
    <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 text-sm text-[#77817C] dark:text-[#9AA8A1] leading-relaxed">
      <p>
        GIRMA provides opportunity discovery, eligibility matching, business toolkit calculators, and AI-assisted guidance. GIRMA does not guarantee grant approval, loan disbursement, or external funding outcomes.
      </p>
      <p>
        <strong className="text-[#17231F] dark:text-[#ECF1EE]">External Applications:</strong> Opening an external application URL or marking an opportunity as Submitted in your GIRMA tracker does not constitute submission by GIRMA on your behalf. Always verify requirements on the official provider portal.
      </p>
      <p>
        <strong className="text-[#17231F] dark:text-[#ECF1EE]">Verification Integrity:</strong> Completing profile registration on GIRMA does not mark a business or mentor as verified. Verification badges are granted solely after administrative review.
      </p>
    </div>
  </div>
);
