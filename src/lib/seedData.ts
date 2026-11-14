import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

function futureIsoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export const SEED_OPPORTUNITIES = [
  {
    id: 'opp-youth-agri-north-2026',
    title: 'Northern Nigeria Youth Agribusiness & Agro-Processing Grant',
    organizationName: 'Sahel Enterprise Development Initiative',
    category: 'Grants',
    fundingType: 'Agricultural Funding',
    description:
      'Non-dilutive catalytic grant supporting youth-led agribusinesses, grain aggregation, cold-chain storage, and value-added food processing across Northern Nigerian states.',
    eligibilitySummary:
      'Open to registered or formalizing youth-owned agribusinesses operating in Northern Nigeria with demonstrable community or farmer impact.',
    targetAudiences: ['Youth Entrepreneurs', 'Farmers & Agribusinesses', 'Women-Owned Businesses'],
    eligibleCategories: ['Entrepreneur', 'Small Business Owner', 'Startup Founder'],
    eligibleBusinessStages: ['MVP / Early', 'Operating (< 2 yrs)', 'Growing (2-5 yrs)'],
    requiresRegistration: false,
    country: 'Nigeria',
    eligibleStates: [
      'Adamawa', 'Bauchi', 'Benue', 'Borno', 'FCT - Abuja', 'Gombe', 'Jigawa',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa',
      'Niger', 'Plateau', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
    ],
    industry: 'Agriculture & Agribusiness',
    benefits: 'Non-dilutive grant funding, 12 weeks of technical agronomy mentorship, and B2B off-taker linkages.',
    fundingAmountMin: 1500000,
    fundingAmountMax: 7500000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-20),
    deadlineDate: futureIsoDate(3),
    requiredDocuments: ['CAC Registration or Local Trade Permit', '2-Page Business Proposal', '6-Month Cashflow Projection'],
    applicationInstructions:
      'Prepare your business summary, projected equipment or working capital breakdown, and submit via the official programme portal.',
    officialUrl: 'https://www.boi.ng',
    contactInfo: 'grants@sahelenterprise.org.ng',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: true,
    isSeedData: true,
  },
  {
    id: 'opp-msme-survival-equipment-2026',
    title: 'SMEDAN & BOI Micro-Enterprise Equipment Matching Fund',
    organizationName: 'Small and Medium Enterprises Development Agency of Nigeria (SMEDAN)',
    category: 'Government Empowerment Programmes',
    fundingType: 'Government Funding',
    description:
      'Co-financing and single-digit concessionary loan programme enabling Nigerian SMEs in light manufacturing, tailoring, food processing, and solar energy to acquire productive machinery.',
    eligibilitySummary:
      'Must be a CAC-registered Nigerian MSME operating for at least 6 months with verifiable business banking records.',
    targetAudiences: ['Small Business Owners', 'Manufacturers', 'Women-Owned Businesses'],
    eligibleCategories: ['Entrepreneur', 'Small Business Owner'],
    eligibleBusinessStages: ['Operating (< 2 yrs)', 'Growing (2-5 yrs)', 'Established (5+ yrs)'],
    requiresRegistration: true,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'Manufacturing & Processing',
    benefits: 'Single-digit interest equipment financing up to ₦15,000,000 with 6-month moratorium.',
    fundingAmountMin: 1000000,
    fundingAmountMax: 15000000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-30),
    deadlineDate: futureIsoDate(7),
    requiredDocuments: ['CAC Certificate (BN or RC)', 'Valid NIN & BVN', '6-Month Bank Statement', 'Equipment Proforma Invoice'],
    applicationInstructions:
      'Ensure your SMEDAN Unique Identification Number (SUIN) is active before submitting your equipment proforma invoice on the official portal.',
    officialUrl: 'https://smedan.gov.ng',
    contactInfo: 'info@smedan.gov.ng',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: true,
    isSeedData: true,
  },
  {
    id: 'opp-women-digital-commerce-2026',
    title: 'Arewa Women Digital Trade & Enterprise Acceleration Grant',
    organizationName: 'West Africa Inclusive Growth Foundation',
    category: 'Business Funding',
    fundingType: 'Women-Focused Funding',
    description:
      'Dedicated grant and digital commerce onboarding fund for women-owned retail, fashion, food, and service businesses adopting digital bookkeeping and regional logistics.',
    eligibilitySummary:
      'Women founders aged 18–45 operating active micro or small enterprises across Nigeria.',
    targetAudiences: ['Women-Owned Businesses', 'Small Business Owners', 'Freelancers'],
    eligibleCategories: ['Entrepreneur', 'Small Business Owner', 'Freelancer'],
    eligibleBusinessStages: ['Idea', 'MVP / Early', 'Operating (< 2 yrs)', 'Growing (2-5 yrs)'],
    requiresRegistration: false,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'Retail & E-Commerce',
    benefits: '₦500,000 to ₦2,500,000 working capital grant plus digital storefront and accounting support.',
    fundingAmountMin: 500000,
    fundingAmountMax: 2500000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-10),
    deadlineDate: futureIsoDate(1),
    requiredDocuments: ['Government Issued ID', '1-Page Business Overview', 'Simple Monthly Sales Log'],
    applicationInstructions:
      'Submit your business overview and growth plan directly through the foundation application link.',
    officialUrl: 'https://www.tefconnect.com',
    contactInfo: 'support@waigf.org',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: true,
    isSeedData: true,
  },
  {
    id: 'opp-nitda-ai-founders-2026',
    title: 'National Innovation & Applied AI Startup Accelerator Cohort',
    organizationName: 'National Information Technology Development Agency (NITDA) Partner Network',
    category: 'Startup Accelerators',
    fundingType: 'Seed Funding',
    description:
      '16-week equity-free accelerator for Nigerian early-stage technology startups building practical solutions in AgriTech, FinTech, HealthTech, EdTech, and Civic Infrastructure.',
    eligibilitySummary:
      'Early-stage startup teams with a working MVP or early customer traction based in Nigeria.',
    targetAudiences: ['Startup Founders', 'Innovators', 'Technology Enthusiasts'],
    eligibleCategories: ['Startup Founder', 'Entrepreneur', 'Professional'],
    eligibleBusinessStages: ['MVP / Early', 'Operating (< 2 yrs)'],
    requiresRegistration: false,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'Technology & Software',
    benefits: 'Cloud infrastructure credits, ₦5,000,000 non-dilutive prototype grant, and investor demo day in Abuja.',
    fundingAmountMin: 2000000,
    fundingAmountMax: 5000000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-14),
    deadlineDate: futureIsoDate(18),
    requiredDocuments: ['10-Slide Pitch Deck', 'Product Demo Link', 'Founder Profiles'],
    applicationInstructions:
      'Upload a concise pitch deck covering problem, Nigerian market sizing, unit economics, and live product link.',
    officialUrl: 'https://nitda.gov.ng',
    contactInfo: 'innovation@nitda.gov.ng',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: true,
    isSeedData: true,
  },
  {
    id: 'opp-northern-stem-scholarship-2026',
    title: 'Nigerian Emerging Innovators Undergraduate & Postgraduate Scholarship',
    organizationName: 'PTDF & Partner Academic Merit Programme',
    category: 'Scholarships',
    fundingType: 'Youth-Focused Funding',
    description:
      'Merit and need-based academic scholarship covering tuition, research stipend, and industrial placement support for Nigerian students in engineering, agriculture, data science, and renewable energy.',
    eligibilitySummary:
      'Enrolled students or graduating candidates in accredited Nigerian tertiary institutions.',
    targetAudiences: ['Students', 'Graduates'],
    eligibleCategories: ['Student', 'Graduate'],
    eligibleEducationLevels: ['OND / NCE', "HND / Bachelor's", "Master's", 'PhD'],
    requiresRegistration: false,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'Education & EdTech',
    benefits: 'Full annual tuition support plus ₦400,000 research and laptop allowance.',
    fundingAmountMin: 400000,
    fundingAmountMax: 1200000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-12),
    deadlineDate: futureIsoDate(24),
    requiredDocuments: ['Academic Transcript or Admission Letter', 'Personal Statement (500 words)', 'State of Origin Certificate'],
    applicationInstructions:
      'Complete the online scholarship verification and attach certified copies of your academic records.',
    officialUrl: 'https://ptdf.gov.ng',
    contactInfo: 'scholarships@ptdf.gov.ng',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: false,
    isSeedData: true,
  },
  {
    id: 'opp-solar-clean-energy-loan-2026',
    title: 'Off-Grid Solar & Clean Productive Energy SME Credit Facility',
    organizationName: 'Development Bank of Nigeria Partner Lenders',
    category: 'Loans',
    fundingType: 'Business Loans',
    description:
      'Structured working capital and asset-finance facility for solar mini-grid installers, cold-storage operators, and SMEs transitioning from diesel generators to solar systems.',
    eligibilitySummary:
      'Registered Nigerian SMEs with at least 12 months operating history and clean credit bureau record.',
    targetAudiences: ['SMEs', 'Clean Energy Providers', 'Agribusinesses'],
    eligibleCategories: ['Entrepreneur', 'Small Business Owner', 'Startup Founder'],
    eligibleBusinessStages: ['Operating (< 2 yrs)', 'Growing (2-5 yrs)', 'Established (5+ yrs)'],
    requiresRegistration: true,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'Clean Energy & Solar',
    benefits: 'Tenor up to 36 months, competitive concessionary pricing from ₦3,000,000 to ₦25,000,000.',
    fundingAmountMin: 3000000,
    fundingAmountMax: 25000000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-25),
    deadlineDate: futureIsoDate(42),
    requiredDocuments: ['CAC Incorporation Documents', '12-Month Audited or Management Accounts', 'Solar Vendor Quote'],
    applicationInstructions:
      'Apply through an accredited participating financial institution listed on the DBN website.',
    officialUrl: 'https://devbankng.com',
    contactInfo: 'credit@devbankng.com',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: false,
    isSeedData: true,
  },
  {
    id: 'opp-africa-fellowship-2026',
    title: 'African Civic & Entrepreneurship Leadership Fellowship',
    organizationName: 'Pan-African Enterprise & Policy Institute',
    category: 'Fellowships',
    fundingType: 'Youth-Focused Funding',
    description:
      '6-month blended leadership and venture-building fellowship equipping emerging African founders, graduates, and social innovators with executive mentorship and regional market access.',
    eligibilitySummary:
      'Citizens of African nations aged 20–35 demonstrating community leadership or enterprise traction.',
    targetAudiences: ['Graduates', 'Professionals', 'Startup Founders'],
    eligibleCategories: ['Graduate', 'Professional', 'Entrepreneur', 'Startup Founder'],
    requiresRegistration: false,
    country: 'Pan-African',
    eligibleStates: ['All States'],
    industry: 'All Industries',
    benefits: 'Full fellowship sponsorship, travel stipend for Lagos/Abuja residency, and seed pitch opportunity.',
    fundingAmountMin: 0,
    fundingAmountMax: 3000000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-5),
    deadlineDate: futureIsoDate(30),
    requiredDocuments: ['CV / Resume', 'Leadership Impact Essay', '1 Reference Letter'],
    applicationInstructions:
      'Submit your profile and essays before the cohort window closes.',
    officialUrl: 'https://www.alueducation.com',
    contactInfo: 'fellowships@paepi.africa',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: false,
    isSeedData: true,
  },
  {
    id: 'opp-angel-seed-syndicate-2026',
    title: 'Savannah Angel Syndicate Pre-Seed & Angel Investment Window',
    organizationName: 'Savannah Angel Network Nigeria',
    category: 'Business Funding',
    fundingType: 'Angel Investment',
    description:
      'Direct angel equity syndicate backing scalable B2B commerce, logistics, agritech, and SaaS founders solving supply-chain and payment bottlenecks across Nigeria.',
    eligibilitySummary:
      'Incorporated startups (LLC) with validated revenue or strong pilot metrics seeking pre-seed capital.',
    targetAudiences: ['Startup Founders', 'High-Growth SMEs'],
    eligibleCategories: ['Startup Founder', 'Entrepreneur'],
    eligibleBusinessStages: ['MVP / Early', 'Operating (< 2 yrs)', 'Growing (2-5 yrs)'],
    requiresRegistration: true,
    country: 'Nigeria',
    eligibleStates: ['All States'],
    industry: 'All Industries',
    benefits: 'Angel ticket sizes from ₦10,000,000 to ₦50,000,000 plus strategic board mentorship.',
    fundingAmountMin: 10000000,
    fundingAmountMax: 50000000,
    fundingCurrency: 'NGN',
    openingDate: futureIsoDate(-15),
    deadlineDate: futureIsoDate(45),
    requiredDocuments: ['Investor Pitch Deck', 'Cap Table Summary', 'Financial Model (24 Months)'],
    applicationInstructions:
      'Submit your data room summary through the Savannah Angel intake form.',
    officialUrl: 'https://abban.africa',
    contactInfo: 'deals@savannahangels.ng',
    verificationStatus: 'verified',
    status: 'published',
    isFeatured: false,
    isSeedData: true,
  },
];

export const SEED_LEARNING_RESOURCES = [
  {
    id: 'learn-grant-proposal-nigeria',
    title: 'How to Write a Winning Grant Proposal for Nigerian & African Funds',
    category: 'Entrepreneurship',
    contentType: 'Practical Guide',
    durationMinutes: 18,
    authorName: 'GIRMA Enterprise Desk',
    isPublished: true,
    summary:
      'Step-by-step framework covering problem clarity, measurable community impact, realistic Naira budgeting, and avoiding common disqualification mistakes.',
    contentBody: `1. Start with Eligibility Verification
Before drafting a single paragraph, verify every mandatory criterion: CAC registration status, state coverage, founder age limit, and sector alignment.

2. Structure Your Executive Summary Around Measurable Impact
Reviewers read dozens of applications daily. State clearly:
- Who you serve (e.g., 120 smallholder maize farmers in Adamawa State)
- What bottleneck you solve (post-harvest grain spoilage)
- How the grant capital directly increases output or income

3. Build an Honest, Line-by-Line Naira Budget
Never write lump sums like "Equipment: ₦5,000,000". Break down vendor quotes, installation, training, and working capital transparently.

4. Attach Clean Supporting Documents
Ensure your CAC certificate, NIN, bank statements, and financial projections match the exact business name on your application.`,
  },
  {
    id: 'learn-unit-economics-sme',
    title: 'Pricing, Break-Even & Cashflow Discipline for Small Businesses',
    category: 'Financial Literacy',
    contentType: 'Course',
    durationMinutes: 25,
    authorName: 'Amina Bello, CFA',
    isPublished: true,
    summary:
      'Master gross margin vs markup, separating owner drawings from business cash, and calculating exact monthly break-even sales targets.',
    contentBody: `1. Why Revenue Is Not Profit
Many growing SMEs experience cash shortages despite high daily sales because variable costs and credit sales are untracked.

2. Separate Business and Personal Accounts
Pay yourself a fixed monthly salary as the founder. Track every naira of inventory restocking and logistics separately.

3. Break-Even Formula in Practice
Break-Even Units = Monthly Fixed Costs / (Selling Price per Unit - Variable Cost per Unit).
Use the GIRMA Business Toolkit Break-Even Calculator to test price changes before discounting.`,
  },
  {
    id: 'learn-b2b-market-access',
    title: 'Entering Institutional & B2B Supply Chains in Northern Nigeria',
    category: 'Business Development',
    contentType: 'Article',
    durationMinutes: 14,
    authorName: 'Ibrahim Danjuma',
    isPublished: true,
    summary:
      'How agro-processors, packaging suppliers, and service firms prepare capability statements, quality consistency, and procurement documentation.',
    contentBody: `1. Standardize Your Capability Statement
Corporate buyers and NGOs require a clear 1-page profile detailing capacity, delivery lead times, CAC status, and tax clearance readiness.

2. Quality Consistency Over One-Off Volume
Start with reliable weekly fulfillment tiers you can guarantee without compromising product grading or packaging.`,
  },
  {
    id: 'learn-ai-productivity-founders',
    title: 'Practical Artificial Intelligence Workflows for Lean African Startups',
    category: 'Artificial Intelligence',
    contentType: 'Tutorial',
    durationMinutes: 20,
    authorName: 'GIRMA Tech Lab',
    isPublished: true,
    summary:
      'Using structured AI workflows for customer research, bilingual customer support scripts, and operational SOPs without losing human judgment.',
    contentBody: `1. Treat AI as a Structured Analyst, Not an Autopilot
Always supply your real business context—location, customer segment, Naira pricing constraints—and verify every external fact independently.

2. Practical High-ROI Use Cases
- Drafting supplier outreach messages and B2B proposals
- Structuring customer interview questions
- Summarizing monthly customer feedback logs into product improvements.`,
  },
];

export const SEED_BUSINESS_PROFILES = [
  {
    id: 'biz-gongola-agro-01',
    ownerId: 'seed_owner_1',
    businessName: 'Gongola Harvest Processing Ltd',
    description:
      'Solar-assisted drying, sorting, and hygienic packaging of sesame, groundnuts, and hibiscus for regional retail and export off-takers across Northern Nigeria.',
    category: 'Agro-Processing',
    industry: 'Agriculture & Agribusiness',
    country: 'Nigeria',
    state: 'Adamawa',
    city: 'Yola',
    registrationStatus: 'CAC Limited Liability',
    stage: 'Growing (2-5 yrs)',
    size: 'Small (10-49)',
    employeesCount: 18,
    yearsOfOperation: 3,
    fundingNeedAmount: 12000000,
    fundingNeedPurpose: 'Automated optical sorter and 40kW solar dryer expansion',
    revenueRange: '₦2M - ₦5M / month',
    products: ['Cleaned Sesame Seeds (50kg)', 'Dehydrated Hibiscus Calyx', 'Cold-Pressed Groundnut Oil'],
    services: ['Contract Grain Cleaning', 'Moisture Testing'],
    targetCustomers: 'Regional food distributors, hotels, and export aggregators',
    website: 'https://girma.ng',
    contactEmail: 'trade@gongolaharvest.ng',
    contactPhone: '+234 800 000 1001',
    verificationStatus: 'verified',
  },
  {
    id: 'biz-kano-solar-02',
    ownerId: 'seed_owner_2',
    businessName: 'KanoGrid Clean Energy Services',
    description:
      'Design, installation, and maintenance of commercial solar inverter systems and solar-powered irrigation pumps for clinics, markets, and farms.',
    category: 'Clean Energy',
    industry: 'Clean Energy & Solar',
    country: 'Nigeria',
    state: 'Kano',
    city: 'Kano Municipal',
    registrationStatus: 'CAC Business Name',
    stage: 'Operating (< 2 yrs)',
    size: 'Micro (2-9)',
    employeesCount: 7,
    yearsOfOperation: 2,
    fundingNeedAmount: 8500000,
    fundingNeedPurpose: 'Inventory financing for lithium battery packs',
    revenueRange: '₦1M - ₦2M / month',
    products: ['5kVA Hybrid Solar Kits', 'Solar Borehole Pumps'],
    services: ['Commercial Energy Audits', 'Solar Maintenance Contracts'],
    targetCustomers: 'SMEs, pharmacies, cold rooms, and agricultural cooperatives',
    contactEmail: 'hello@kanogrid.ng',
    contactPhone: '+234 800 000 1002',
    verificationStatus: 'verified',
  },
];

export const SEED_LISTINGS = [
  {
    id: 'listing-sesame-bulk-01',
    ownerId: 'seed_owner_1',
    businessId: 'biz-gongola-agro-01',
    businessName: 'Gongola Harvest Processing Ltd',
    title: 'Export-Grade Cleaned White Sesame Seeds (50kg Bags)',
    listingType: 'product',
    description: '99% purity machine-cleaned white sesame seeds sourced from Adamawa cooperatives, moisture-tested below 6%.',
    industry: 'Agriculture & Agribusiness',
    country: 'Nigeria',
    state: 'Adamawa',
    priceNgn: 118000,
    priceUnit: 'per 50kg bag',
    contactMethod: 'GIRMA B2B Enquiry / trade@gongolaharvest.ng',
    status: 'active',
  },
  {
    id: 'listing-solar-audit-02',
    ownerId: 'seed_owner_2',
    businessId: 'biz-kano-solar-02',
    businessName: 'KanoGrid Clean Energy Services',
    title: 'SME Solar Transition Audit & 5kVA Hybrid Installation',
    listingType: 'service',
    description: 'Complete power load audit and hybrid solar installation for shops, bakeries, and agro-processing units replacing petrol/diesel generators.',
    industry: 'Clean Energy & Solar',
    country: 'Nigeria',
    state: 'Kano',
    priceNgn: 2450000,
    priceUnit: 'turnkey package',
    contactMethod: 'GIRMA B2B Enquiry / hello@kanogrid.ng',
    status: 'active',
  },
];

export const SEED_MENTORS = [
  {
    id: 'mentor-amina-bello',
    ownerId: 'seed_mentor_1',
    fullName: 'Amina Bello, CFA',
    background: 'SME Finance & Grant Readiness Advisor',
    expertise: ['Financial Modeling', 'Grant Proposals', 'Working Capital', 'Agribusiness'],
    industry: 'Financial Services & FinTech',
    yearsExperience: 11,
    country: 'Nigeria',
    state: 'FCT - Abuja',
    availability: '2 sessions / week (Virtual)',
    bio: 'Advised over 140 Nigerian SMEs on commercial debt readiness, development bank applications, and disciplined unit economics across Abuja, Kano, and Kaduna.',
    approvalStatus: 'approved',
  },
  {
    id: 'mentor-usman-sadiq',
    ownerId: 'seed_mentor_2',
    fullName: 'Engr. Usman Sadiq',
    background: 'Agro-Industrial Operations & Supply Chain Lead',
    expertise: ['Agro-Processing', 'B2B Off-Taking', 'Quality Assurance', 'Equipment Sourcing'],
    industry: 'Agriculture & Agribusiness',
    yearsExperience: 14,
    country: 'Nigeria',
    state: 'Kaduna',
    availability: 'Weekends & Evenings',
    bio: 'Built regional grain aggregation and food processing lines across Northern Nigeria, helping founders transition from informal trading to institutional supply.',
    approvalStatus: 'approved',
  },
];

export async function seedEcosystemData(adminUid: string): Promise<{ seededCount: number }> {
  try {
    const batch = writeBatch(db);
    let count = 0;

    const existingChecks = await Promise.all([
      ...SEED_OPPORTUNITIES.map((o) => getDoc(doc(db, 'opportunities', o.id))),
      ...SEED_LEARNING_RESOURCES.map((r) => getDoc(doc(db, 'learning_resources', r.id))),
      ...SEED_BUSINESS_PROFILES.map((b) => getDoc(doc(db, 'business_profiles', b.id))),
      ...SEED_LISTINGS.map((l) => getDoc(doc(db, 'business_listings', l.id))),
      ...SEED_MENTORS.map((m) => getDoc(doc(db, 'mentor_profiles', m.id))),
    ]);

    let idx = 0;

    for (const opp of SEED_OPPORTUNITIES) {
      const { id, ...oppData } = opp;
      const snap = existingChecks[idx++];
      const ref = doc(db, 'opportunities', id);
      batch.set(
        ref,
        {
          ...oppData,
          createdBy: adminUid,
          createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }

    for (const res of SEED_LEARNING_RESOURCES) {
      const { id, ...resData } = res;
      const snap = existingChecks[idx++];
      const ref = doc(db, 'learning_resources', id);
      batch.set(
        ref,
        {
          ...resData,
          createdBy: adminUid,
          createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }

    for (const biz of SEED_BUSINESS_PROFILES) {
      const { id, ...bizData } = biz;
      const snap = existingChecks[idx++];
      const ref = doc(db, 'business_profiles', id);
      batch.set(
        ref,
        {
          ...bizData,
          createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }

    for (const listing of SEED_LISTINGS) {
      const { id, ...listingData } = listing;
      const snap = existingChecks[idx++];
      const ref = doc(db, 'business_listings', id);
      batch.set(
        ref,
        {
          ...listingData,
          createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }

    for (const mentor of SEED_MENTORS) {
      const { id, ...mentorData } = mentor;
      const snap = existingChecks[idx++];
      const ref = doc(db, 'mentor_profiles', id);
      batch.set(
        ref,
        {
          ...mentorData,
          createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }

    batch.set(
      doc(db, 'platform_settings', 'global'),
      {
        platformName: 'GIRMA',
        defaultCountry: 'Nigeria',
        defaultCurrency: 'NGN',
        seedInitialized: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
    return { seededCount: count };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedEcosystemData');
  }
}

export async function checkSeedInitialized(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'platform_settings', 'global'));
    return snap.exists() && snap.data()?.seedInitialized === true;
  } catch {
    return false;
  }
}
