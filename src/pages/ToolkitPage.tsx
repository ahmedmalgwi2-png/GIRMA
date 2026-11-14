import React, { useEffect, useState } from 'react';
import { Download, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  calculateBreakEven,
  calculatePricing,
  calculateProfitAndLoss,
  calculateReadinessScore,
  calculateStartupCosts,
  exportDocumentToPdf,
} from '../lib/toolkitMath';
import { formatNaira } from '../lib/matchingEngine';
import { BusinessDocument } from '../types/girma';

const TOOL_TABS = [
  { id: 'startup_cost', label: 'Startup Cost Calculator', kind: 'math' },
  { id: 'profit_loss', label: 'Profit & Loss Calculator', kind: 'math' },
  { id: 'break_even', label: 'Break-Even Calculator', kind: 'math' },
  { id: 'pricing', label: 'Pricing Calculator', kind: 'math' },
  { id: 'readiness', label: 'Business Readiness Assessment', kind: 'math' },
  { id: 'business_plan', label: 'Business Plan Generator', kind: 'template' },
  { id: 'bmc', label: 'Business Model Canvas', kind: 'canvas' },
  { id: 'swot', label: 'SWOT Analysis', kind: 'canvas' },
  { id: 'marketing_plan', label: 'Marketing Plan Generator', kind: 'template' },
  { id: 'customer_persona', label: 'Customer Persona Generator', kind: 'template' },
  { id: 'pitch_deck', label: 'Pitch Deck Outline Generator', kind: 'template' },
  { id: 'grant_proposal', label: 'Grant Proposal Assistant', kind: 'template' },
] as const;

type ToolId = (typeof TOOL_TABS)[number]['id'];

export const ToolkitPage: React.FC = () => {
  const { firebaseUser, account, businessProfile, getIdToken } = useAuth();
  const [activeTool, setActiveTool] = useState<ToolId>('startup_cost');
  const [savedDocs, setSavedDocs] = useState<BusinessDocument[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Math calculator states
  const [startup, setStartup] = useState({
    equipmentAndTools: 650000,
    rentAndUtilities: 300000,
    licensesAndCac: 65000,
    initialInventory: 450000,
    marketingLaunch: 120000,
    monthlyOperatingCost: 180000,
    runwayMonths: 6,
    contingencyPercent: 10,
  });

  const [pnl, setPnl] = useState({
    monthlyRevenue: 1400000,
    costOfGoodsSold: 620000,
    rentAndFacility: 95000,
    salariesAndWages: 240000,
    marketingAndSales: 75000,
    utilitiesAndLogistics: 110000,
    otherOperatingExpenses: 40000,
  });

  const [breakEven, setBreakEven] = useState({
    fixedMonthlyCosts: 560000,
    sellingPricePerUnit: 8500,
    variableCostPerUnit: 4200,
  });

  const [pricing, setPricing] = useState({
    unitProductionCost: 3500,
    unitPackagingAndDelivery: 650,
    overheadAllocationPerUnit: 450,
    targetProfitMarginPercent: 35,
    vatPercent: 7.5,
  });

  const [readiness, setReadiness] = useState<Record<string, number>>({
    registration: 3,
    bookkeeping: 3,
    customers: 4,
    operations: 3,
    fundingDocs: 2,
  });

  // Canvas & Template states
  const [canvasFields, setCanvasFields] = useState<Record<string, string>>({
    title: businessProfile?.businessName || 'My Growth Venture',
    field1: '',
    field2: '',
    field3: '',
    field4: '',
  });

  const [templateNotes, setTemplateNotes] = useState('');
  const [generatedSections, setGeneratedSections] = useState<{ heading: string; body: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    let active = true;
    async function loadDocs() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'business_documents'),
            where('userId', '==', firebaseUser!.uid)
          )
        );
        if (active) {
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
            .map((d) => ({ id: d.id, ...d.data() } as BusinessDocument))
            .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
          setSavedDocs(sorted);
        }
      } catch (err) {
        console.error('Error loading toolkit documents:', err);
      }
    }
    loadDocs();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const startupRes = calculateStartupCosts(startup);
  const pnlRes = calculateProfitAndLoss(pnl);
  const breakEvenRes = calculateBreakEven(breakEven);
  const pricingRes = calculatePricing(pricing);
  const readinessRes = calculateReadinessScore(readiness);

  const saveDocument = async (title: string, payload: Record<string, unknown>) => {
    if (!firebaseUser) return;
    try {
      const ref = await addDoc(collection(db, 'business_documents'), {
        userId: firebaseUser.uid,
        toolType: activeTool,
        title: title.slice(0, 150),
        payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedDocs((prev) => [
        { id: ref.id, userId: firebaseUser.uid, toolType: activeTool, title, payload },
        ...prev,
      ]);
      setNotice(`Saved "${title}" to your GIRMA documents.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'business_documents');
    }
  };

  const deleteSavedDoc = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'business_documents', docId));
      setSavedDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `business_documents/${docId}`);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!firebaseUser) return;
    setGenerating(true);
    setNotice(null);
    const tab = TOOL_TABS.find((t) => t.id === activeTool);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/toolkit-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolType: tab?.label || activeTool,
          businessName: businessProfile?.businessName || account?.fullName || 'Nigerian Enterprise',
          industry: businessProfile?.industry || 'General Commerce',
          state: account?.state || 'Nigeria',
          details: templateNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate draft.');
      setGeneratedSections(data.sections || []);
      setCanvasFields((p) => ({ ...p, title: data.title || tab?.label || 'Document' }));
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Unable to generate draft right now.');
    } finally {
      setGenerating(false);
    }
  };

  const currentTab = TOOL_TABS.find((t) => t.id === activeTool)!;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#17231F] dark:text-[#ECF1EE]">Business Toolkit</h2>
        <p className="text-sm text-[#77817C] dark:text-[#9AA8A1] mt-1">
          Deterministic Naira financial calculators, strategic canvases, and AI-assisted document builders with PDF export.
        </p>
      </div>

      {notice && (
        <div className="bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1] px-4 py-3 rounded-lg text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tool Selector Grid */}
      <div className="flex flex-wrap gap-2">
        {TOOL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setActiveTool(t.id);
              setGeneratedSections([]);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTool === t.id
                ? 'bg-[#123C32] dark:bg-[#1F7A59] text-white'
                : 'bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 text-[#17231F] dark:text-[#ECF1EE] hover:border-[#123C32] dark:hover:border-[#57C496]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tool Workspace */}
      <div className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#17231F]/10 dark:border-white/10 pb-4">
          <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">{currentTab.label}</h3>
          <span className="text-xs font-mono text-[#77817C] dark:text-[#9AA8A1]">
            {currentTab.kind === 'math' ? 'Exact Mathematical Formula' : 'Structured Document & PDF'}
          </span>
        </div>

        {/* 1. Startup Cost Calculator */}
        {activeTool === 'startup_cost' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['equipmentAndTools', 'Equipment & Machinery (₦)'],
                ['rentAndUtilities', 'Rent, Deposit & Setup (₦)'],
                ['licensesAndCac', 'CAC & Regulatory Permits (₦)'],
                ['initialInventory', 'Initial Stock / Raw Materials (₦)'],
                ['marketingLaunch', 'Launch Marketing (₦)'],
                ['monthlyOperatingCost', 'Monthly Operating Burn (₦)'],
                ['runwayMonths', 'Working Capital Runway (Months)'],
                ['contingencyPercent', 'Contingency Buffer (%)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={startup[key as keyof typeof startup]}
                    onChange={(e) =>
                      setStartup((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3 text-sm text-[#17231F] dark:text-[#ECF1EE]">
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">One-Time Setup Costs</span>
                  <span className="font-mono tabular-nums font-semibold">{formatNaira(startupRes.oneTimeCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Working Capital ({startup.runwayMonths} mo)</span>
                  <span className="font-mono tabular-nums font-semibold">{formatNaira(startupRes.workingCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Contingency ({startup.contingencyPercent}%)</span>
                  <span className="font-mono tabular-nums font-semibold">{formatNaira(startupRes.contingencyAmount)}</span>
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex justify-between text-base font-bold text-[#123C32] dark:text-[#57C496]">
                  <span>Total Capital Needed</span>
                  <span className="font-mono tabular-nums">{formatNaira(startupRes.totalRequiredCapital)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveDocument('Startup Cost Estimate', { input: startup, result: startupRes })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportDocumentToPdf('Startup Cost Budget', businessProfile?.businessName || 'GIRMA Member', [
                      {
                        heading: 'Summary',
                        body: `One-Time Costs: ${formatNaira(startupRes.oneTimeCosts)}\nWorking Capital: ${formatNaira(startupRes.workingCapital)}\nContingency: ${formatNaira(startupRes.contingencyAmount)}\nTotal Required Capital: ${formatNaira(startupRes.totalRequiredCapital)}`,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Profit & Loss Calculator */}
        {activeTool === 'profit_loss' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['monthlyRevenue', 'Monthly Sales Revenue (₦)'],
                ['costOfGoodsSold', 'Cost of Goods Sold (₦)'],
                ['rentAndFacility', 'Rent & Facility (₦)'],
                ['salariesAndWages', 'Salaries & Wages (₦)'],
                ['marketingAndSales', 'Marketing & Sales (₦)'],
                ['utilitiesAndLogistics', 'Power, Fuel & Logistics (₦)'],
                ['otherOperatingExpenses', 'Other Operating Costs (₦)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={pnl[key as keyof typeof pnl]}
                    onChange={(e) => setPnl((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3 text-sm text-[#17231F] dark:text-[#ECF1EE]">
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Gross Profit</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatNaira(pnlRes.grossProfit)} ({pnlRes.grossMarginPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Operating Expenses</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatNaira(pnlRes.totalOperatingExpenses)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex justify-between text-base font-bold">
                  <span>Monthly Net Profit</span>
                  <span
                    className={`font-mono tabular-nums ${
                      pnlRes.netProfit >= 0 ? 'text-[#238653] dark:text-[#57C496]' : 'text-[#D94C4C] dark:text-[#F87171]'
                    }`}
                  >
                    {formatNaira(pnlRes.netProfit)} ({pnlRes.netMarginPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#77817C] dark:text-[#9AA8A1]">
                  <span>Annualized Net Projection</span>
                  <span className="font-mono tabular-nums">{formatNaira(pnlRes.annualizedNetProfit)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveDocument('Monthly Profit & Loss Statement', { input: pnl, result: pnlRes })}
                  className="flex-1 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
                >
                  Save Statement
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportDocumentToPdf('Monthly Profit & Loss Statement', businessProfile?.businessName || 'GIRMA Member', [
                      {
                        heading: 'Financial Summary',
                        body: `Revenue: ${formatNaira(pnl.monthlyRevenue)}\nCOGS: ${formatNaira(pnl.costOfGoodsSold)}\nGross Profit: ${formatNaira(pnlRes.grossProfit)} (${pnlRes.grossMarginPercent.toFixed(1)}%)\nOperating Expenses: ${formatNaira(pnlRes.totalOperatingExpenses)}\nMonthly Net Profit: ${formatNaira(pnlRes.netProfit)} (${pnlRes.netMarginPercent.toFixed(1)}%)`,
                      },
                    ])
                  }
                  className="px-4 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Break-Even Calculator */}
        {activeTool === 'break_even' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Monthly Fixed Costs (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={breakEven.fixedMonthlyCosts}
                  onChange={(e) =>
                    setBreakEven((p) => ({ ...p, fixedMonthlyCosts: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Selling Price per Unit (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={breakEven.sellingPricePerUnit}
                  onChange={(e) =>
                    setBreakEven((p) => ({ ...p, sellingPricePerUnit: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Variable Cost per Unit (₦)</label>
                <input
                  type="number"
                  min={0}
                  value={breakEven.variableCostPerUnit}
                  onChange={(e) =>
                    setBreakEven((p) => ({ ...p, variableCostPerUnit: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="lg:col-span-6 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              {breakEvenRes.isViable ? (
                <div className="space-y-3 text-sm text-[#17231F] dark:text-[#ECF1EE]">
                  <div className="flex justify-between">
                    <span className="text-[#77817C] dark:text-[#9AA8A1]">Contribution Margin / Unit</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {formatNaira(breakEvenRes.contributionMarginPerUnit)} ({breakEvenRes.contributionMarginRatioPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#77817C] dark:text-[#9AA8A1]">Break-Even Volume</span>
                    <span className="font-mono tabular-nums font-bold text-[#123C32] dark:text-[#57C496]">
                      {breakEvenRes.breakEvenUnits?.toLocaleString()} units / month
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#77817C] dark:text-[#9AA8A1]">Break-Even Revenue</span>
                    <span className="font-mono tabular-nums font-bold text-[#123C32] dark:text-[#57C496]">
                      {formatNaira(breakEvenRes.breakEvenRevenue || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#D94C4C] dark:text-[#F87171]">
                  Selling price must exceed variable cost per unit to reach break-even.
                </p>
              )}
              <button
                type="button"
                onClick={() => saveDocument('Break-Even Analysis', { input: breakEven, result: breakEvenRes })}
                className="w-full py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
              >
                Save Break-Even Report
              </button>
            </div>
          </div>
        )}

        {/* 4. Pricing Calculator */}
        {activeTool === 'pricing' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              {[
                ['unitProductionCost', 'Direct Production / Purchase Cost (₦)'],
                ['unitPackagingAndDelivery', 'Packaging & Delivery Cost (₦)'],
                ['overheadAllocationPerUnit', 'Overhead Allocation per Unit (₦)'],
                ['targetProfitMarginPercent', 'Target Gross Margin (%)'],
                ['vatPercent', 'VAT Rate (%) — Nigeria Standard 7.5%'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={pricing[key as keyof typeof pricing]}
                    onChange={(e) =>
                      setPricing((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>
            <div className="lg:col-span-6 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3 text-sm text-[#17231F] dark:text-[#ECF1EE]">
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Total Unit Cost</span>
                  <span className="font-mono tabular-nums font-semibold">{formatNaira(pricingRes.totalUnitCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Recommended Pre-Tax Price</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatNaira(Math.round(pricingRes.recommendedPreTaxPrice))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77817C] dark:text-[#9AA8A1]">Unit Profit (Markup {pricingRes.markupPercent.toFixed(1)}%)</span>
                  <span className="font-mono tabular-nums font-semibold text-[#238653] dark:text-[#57C496]">
                    {formatNaira(Math.round(pricingRes.profitPerUnit))}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 flex justify-between text-base font-bold text-[#123C32] dark:text-[#57C496]">
                  <span>Customer Price (incl. VAT)</span>
                  <span className="font-mono tabular-nums">
                    {formatNaira(Math.round(pricingRes.finalCustomerPriceWithVat))}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveDocument('Unit Pricing Schedule', { input: pricing, result: pricingRes })}
                className="w-full py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
              >
                Save Pricing Schedule
              </button>
            </div>
          </div>
        )}

        {/* 5. Business Readiness Assessment */}
        {activeTool === 'readiness' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              {[
                ['registration', 'CAC Registration & Tax Compliance (1 = Informal, 5 = Full LLC + TIN)'],
                ['bookkeeping', 'Financial Records & Bank Separation (1 = Cash only, 5 = Monthly P&L + Bank)'],
                ['customers', 'Customer Demand & Sales Proof (1 = Idea, 5 = Recurring revenue)'],
                ['operations', 'Supply Chain & Delivery Reliability (1 = Ad-hoc, 5 = Documented SOPs)'],
                ['fundingDocs', 'Proposal, Pitch Deck & Projections Readiness (1 = None, 5 = Complete)'],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE]">
                    <span>{label}</span>
                    <span className="font-mono tabular-nums">{readiness[key]} / 5</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={readiness[key]}
                    onChange={(e) =>
                      setReadiness((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    className="w-full accent-[#123C32] dark:accent-[#57C496]"
                  />
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between text-[#17231F] dark:text-[#ECF1EE]">
                <span className="text-sm font-semibold">Readiness Score</span>
                <span className="font-mono text-2xl font-bold tabular-nums text-[#123C32] dark:text-[#57C496]">
                  {readinessRes.totalScore}%
                </span>
              </div>
              <p className="text-xs font-semibold text-[#1F7A59] dark:text-[#57C496]">Stage: {readinessRes.band}</p>
              <ul className="space-y-2 text-xs text-[#77817C] dark:text-[#9AA8A1]">
                {readinessRes.recommendations.length === 0 ? (
                  <li>Strong institutional readiness across all five pillars.</li>
                ) : (
                  readinessRes.recommendations.map((r) => <li key={r}>· {r}</li>)
                )}
              </ul>
              <button
                type="button"
                onClick={() => saveDocument('Business Readiness Assessment', { answers: readiness, result: readinessRes })}
                className="w-full py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
              >
                Save Assessment
              </button>
            </div>
          </div>
        )}

        {/* 6. Canvases (BMC & SWOT) */}
        {currentTab.kind === 'canvas' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1">Document Title</label>
              <input
                value={canvasFields.title}
                onChange={(e) => setCanvasFields((p) => ({ ...p, title: e.target.value }))}
                className="w-full max-w-md px-3.5 py-2 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTool === 'swot'
                ? [
                    ['field1', 'Strengths (Internal Advantages)'],
                    ['field2', 'Weaknesses (Internal Gaps)'],
                    ['field3', 'Opportunities (External Market & Funding)'],
                    ['field4', 'Threats (External Risks & Competition)'],
                  ]
                : [
                    ['field1', 'Customer Segments & Value Proposition'],
                    ['field2', 'Channels & Customer Relationships'],
                    ['field3', 'Key Activities, Resources & Partners'],
                    ['field4', 'Revenue Streams & Cost Structure (₦)'],
                  ]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5">{label}</label>
                  <textarea
                    rows={4}
                    value={canvasFields[key]}
                    onChange={(e) => setCanvasFields((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE]"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => saveDocument(canvasFields.title || currentTab.label, canvasFields)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Canvas</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportDocumentToPdf(
                    canvasFields.title || currentTab.label,
                    currentTab.label,
                    [
                      { heading: 'Section 1', body: canvasFields.field1 },
                      { heading: 'Section 2', body: canvasFields.field2 },
                      { heading: 'Section 3', body: canvasFields.field3 },
                      { heading: 'Section 4', body: canvasFields.field4 },
                    ]
                  )
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. AI-Assisted Template Generators */}
        {currentTab.kind === 'template' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] dark:text-[#ECF1EE] mb-1.5">
                Provide your business context, target market, or funding goal
              </label>
              <textarea
                rows={3}
                value={templateNotes}
                onChange={(e) => setTemplateNotes(e.target.value)}
                placeholder="e.g., Grain aggregation and hibiscus packaging in Yola, seeking ₦5M equipment grant to triple weekly output..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={generating}
                onClick={handleGenerateTemplate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generating ? 'Drafting Document...' : `Generate ${currentTab.label}`}</span>
              </button>

              {generatedSections.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      saveDocument(canvasFields.title || currentTab.label, {
                        sections: generatedSections,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Document</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentToPdf(
                        canvasFields.title || currentTab.label,
                        businessProfile?.businessName || account?.fullName || 'GIRMA Document',
                        generatedSections
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 bg-white dark:bg-[#121B18] text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export PDF</span>
                  </button>
                </>
              )}
            </div>

            {generatedSections.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#17231F]/10 dark:border-white/10">
                {generatedSections.map((sec, idx) => (
                  <div key={idx} className="bg-[#F8F7F1] dark:bg-[#17231F] rounded-xl p-4 space-y-2">
                    <h4 className="font-display text-sm font-bold text-[#123C32] dark:text-[#57C496]">{sec.heading}</h4>
                    <textarea
                      rows={4}
                      value={sec.body}
                      onChange={(e) =>
                        setGeneratedSections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, body: e.target.value } : s))
                        )
                      }
                      className="w-full bg-white dark:bg-[#0F1714] px-3 py-2 rounded-lg border border-[#17231F]/10 dark:border-white/15 text-sm text-[#17231F] dark:text-[#ECF1EE]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Business Documents Repository */}
      <section className="bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">Saved Business Documents</h3>
        {savedDocs.length === 0 ? (
          <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">
            Documents and financial analyses you save from the Toolkit appear here for quick PDF export.
          </p>
        ) : (
          <div className="divide-y divide-[#17231F]/10 dark:divide-white/10">
            {savedDocs.map((d) => (
              <div key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#17231F] dark:text-[#ECF1EE]">{d.title}</p>
                  <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">{d.toolType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentToPdf(
                        d.title,
                        `Saved ${d.toolType}`,
                        Array.isArray((d.payload as { sections?: { heading: string; body: string }[] }).sections)
                          ? ((d.payload as { sections: { heading: string; body: string }[] }).sections)
                          : [{ heading: 'Saved Data', body: JSON.stringify(d.payload, null, 2) }]
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-[#123C32]/25 dark:border-[#57C496]/35 text-xs font-semibold text-[#123C32] dark:text-[#57C496]"
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => d.id && deleteSavedDoc(d.id)}
                    aria-label="Delete document"
                    className="p-2 rounded-lg text-[#D94C4C] dark:text-[#F87171] hover:bg-[#D94C4C]/10 dark:hover:bg-[#F87171]/15"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
