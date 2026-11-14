import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateProfileCompletion,
  computeGirmaMatch,
  daysUntilDate,
  formatNaira,
} from '../src/lib/matchingEngine';
import {
  calculateBreakEven,
  calculatePricing,
  calculateProfitAndLoss,
  calculateReadinessScore,
  calculateStartupCosts,
} from '../src/lib/toolkitMath';
import { BusinessProfile, Opportunity, StudentProfile, UserAccount } from '../src/types/girma';

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const sampleEntrepreneur: UserAccount = {
  uid: 'user_1',
  fullName: 'Ibrahim Musa',
  email: 'ibrahim@yolaagro.ng',
  phone: '+2348030000000',
  country: 'Nigeria',
  state: 'Adamawa',
  category: 'Entrepreneur',
  interests: ['Agriculture & Agribusiness', 'Grants'],
  plan: 'free',
  accountStatus: 'active',
  onboardingCompleted: true,
};

const sampleBusiness: BusinessProfile = {
  ownerId: 'user_1',
  businessName: 'Yola Agro Processing',
  description: 'Grain cleaning and sesame oil packaging in Adamawa State.',
  industry: 'Agriculture & Agribusiness',
  country: 'Nigeria',
  state: 'Adamawa',
  registrationStatus: 'CAC Business Name',
  stage: 'Operating (< 2 yrs)',
  fundingNeedAmount: 3500000,
  targetCustomers: 'Regional distributors',
  growthObjectives: 'Acquire automated packaging line',
  verificationStatus: 'unverified',
};

const sampleStudent: StudentProfile = {
  uid: 'stu_1',
  institution: 'Modibbo Adama University',
  courseOfStudy: 'Agricultural Engineering',
  educationLevel: "HND / Bachelor's",
  skills: ['CAD', 'Data Analysis'],
  careerInterests: ['AgriTech', 'Renewable Energy'],
  state: 'Adamawa',
};

test('GIRMA Match: passes mandatory eligibility and yields high score for aligned Northern Nigeria SME', () => {
  const opp: Opportunity = {
    id: 'opp-1',
    title: 'Northern Youth Agribusiness Grant',
    organizationName: 'Sahel Enterprise',
    category: 'Grants',
    description: 'Support for grain processors.',
    eligibleCategories: ['Entrepreneur', 'Small Business Owner'],
    eligibleBusinessStages: ['Operating (< 2 yrs)'],
    requiresRegistration: true,
    country: 'Nigeria',
    eligibleStates: ['Adamawa', 'Kano', 'Kaduna'],
    industry: 'Agriculture & Agribusiness',
    deadlineDate: isoOffset(5),
    requiredDocuments: ['CAC Certificate', '2-Page Proposal'],
    officialUrl: 'https://example.ng',
    verificationStatus: 'verified',
    status: 'published',
  };

  const match = computeGirmaMatch(opp, sampleEntrepreneur, sampleBusiness, null);
  assert.equal(match.isEligible, true);
  assert.ok(match.score >= 80, `Expected high score >= 80, got ${match.score}`);
  assert.ok(match.satisfiedRequirements.some((r) => r.includes('Formal registration satisfied')));
  // CAC doc already satisfied by formal registration so only Proposal remains
  assert.deepEqual(match.missingRequirements, ['2-Page Proposal']);
});

test('GIRMA Match: enforces mandatory CAC registration, state, and deadline gates deterministically', () => {
  const unregisteredBiz: BusinessProfile = {
    ...sampleBusiness,
    registrationStatus: 'Unregistered',
  };
  const restrictedOpp: Opportunity = {
    id: 'opp-2',
    title: 'Lagos Registered LLC Facility',
    organizationName: 'Lagos Enterprise Fund',
    category: 'Loans',
    description: 'Credit line for Lagos businesses.',
    requiresRegistration: true,
    country: 'Nigeria',
    eligibleStates: ['Lagos'],
    industry: 'Agriculture & Agribusiness',
    deadlineDate: isoOffset(14),
    officialUrl: 'https://example.ng',
    verificationStatus: 'verified',
    status: 'published',
  };

  const failedMatch = computeGirmaMatch(restrictedOpp, sampleEntrepreneur, unregisteredBiz, null);
  assert.equal(failedMatch.isEligible, false);
  assert.ok(failedMatch.score <= 45);
  assert.ok(failedMatch.missingRequirements.some((m) => m.includes('Lagos')));
  assert.ok(failedMatch.missingRequirements.some((m) => m.includes('CAC')));

  const expiredOpp: Opportunity = {
    ...restrictedOpp,
    eligibleStates: ['All States'],
    requiresRegistration: false,
    deadlineDate: isoOffset(-2),
  };
  const expiredMatch = computeGirmaMatch(expiredOpp, sampleEntrepreneur, sampleBusiness, null);
  assert.equal(expiredMatch.isEligible, false);
  assert.equal(expiredMatch.score, 0);
});

test('Profile Completion: calculates exact percentage for entrepreneur and student paths', () => {
  const bizScore = calculateProfileCompletion(sampleEntrepreneur, sampleBusiness, null);
  assert.equal(bizScore, 100);

  const stuUser: UserAccount = { ...sampleEntrepreneur, category: 'Student' };
  const stuScore = calculateProfileCompletion(stuUser, null, sampleStudent);
  assert.equal(stuScore, 100);

  const partialBiz = calculateProfileCompletion(sampleEntrepreneur, null, null);
  assert.ok(partialBiz < 60);
});

test('Business Toolkit Math: Startup Cost, P&L, Break-Even, Pricing, and Readiness formulas', () => {
  const sc = calculateStartupCosts({
    equipmentAndTools: 500000,
    rentAndUtilities: 200000,
    licensesAndCac: 50000,
    initialInventory: 250000,
    marketingLaunch: 100000,
    monthlyOperatingCost: 150000,
    runwayMonths: 4,
    contingencyPercent: 10,
  });
  assert.equal(sc.oneTimeCosts, 1100000);
  assert.equal(sc.workingCapital, 600000);
  assert.equal(sc.subtotal, 1700000);
  assert.equal(sc.contingencyAmount, 170000);
  assert.equal(sc.totalRequiredCapital, 1870000);

  const pnl = calculateProfitAndLoss({
    monthlyRevenue: 1000000,
    costOfGoodsSold: 400000,
    rentAndFacility: 100000,
    salariesAndWages: 200000,
    marketingAndSales: 50000,
    utilitiesAndLogistics: 50000,
    otherOperatingExpenses: 0,
  });
  assert.equal(pnl.grossProfit, 600000);
  assert.equal(pnl.grossMarginPercent, 60);
  assert.equal(pnl.totalOperatingExpenses, 400000);
  assert.equal(pnl.netProfit, 200000);
  assert.equal(pnl.netMarginPercent, 20);
  assert.equal(pnl.annualizedNetProfit, 2400000);

  const be = calculateBreakEven({
    fixedMonthlyCosts: 500000,
    sellingPricePerUnit: 5000,
    variableCostPerUnit: 3000,
  });
  assert.equal(be.isViable, true);
  assert.equal(be.contributionMarginPerUnit, 2000);
  assert.equal(be.breakEvenUnits, 250);
  assert.equal(be.breakEvenRevenue, 1250000);

  const unviableBe = calculateBreakEven({
    fixedMonthlyCosts: 500000,
    sellingPricePerUnit: 2500,
    variableCostPerUnit: 3000,
  });
  assert.equal(unviableBe.isViable, false);
  assert.equal(unviableBe.breakEvenUnits, null);

  const pr = calculatePricing({
    unitProductionCost: 1500,
    unitPackagingAndDelivery: 300,
    overheadAllocationPerUnit: 200,
    targetProfitMarginPercent: 20,
    vatPercent: 7.5,
  });
  assert.equal(pr.totalUnitCost, 2000);
  assert.equal(pr.recommendedPreTaxPrice, 2500);
  assert.equal(pr.profitPerUnit, 500);
  assert.equal(pr.markupPercent, 25);
  assert.equal(pr.finalCustomerPriceWithVat, 2687.5);

  const ready = calculateReadinessScore({
    registration: 2,
    bookkeeping: 2,
    customers: 4,
    operations: 4,
    fundingDocs: 3,
  });
  assert.equal(ready.totalScore, 60);
  assert.equal(ready.band, 'Growth Stage Ready');
  assert.ok(ready.recommendations.some((r) => r.includes('CAC registration')));
});

test('Naira formatting & Deadline helpers handle currency and dates accurately', () => {
  assert.equal(formatNaira(2500000), '₦2,500,000');
  assert.equal(formatNaira(1000, 'USD'), '$1,000');
  assert.equal(daysUntilDate(isoOffset(3)), 3);
  assert.equal(daysUntilDate('invalid-date'), null);
});

test('Security & Architecture Rules: firestore.rules enforces deny-by-default and role locks', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /incoming\(\)\.plan == existing\(\)\.plan/);
  assert.match(rules, /incoming\(\)\.accountStatus == existing\(\)\.accountStatus/);
  assert.match(rules, /incoming\(\)\.verificationStatus == 'unverified'/);
  assert.match(rules, /incoming\(\)\.approvalStatus == 'pending'/);
  assert.match(rules, /match \/admin_activity_logs\/\{logId\}[\s\S]*allow update, delete: if false;/);
});

test('Server-Side AI Security: Gemini API key is never used in client src/', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  for (const file of walk(srcDir)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!content.includes('@google/genai'), `Client file ${file} must not import @google/genai`);
    assert.ok(!content.includes('GEMINI_API_KEY'), `Client file ${file} must not reference GEMINI_API_KEY`);
  }
});
