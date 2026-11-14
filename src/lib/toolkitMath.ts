import { jsPDF } from 'jspdf';

export interface StartupCostInput {
  equipmentAndTools: number;
  rentAndUtilities: number;
  licensesAndCac: number;
  initialInventory: number;
  marketingLaunch: number;
  monthlyOperatingCost: number;
  runwayMonths: number;
  contingencyPercent: number;
}

export interface StartupCostResult {
  oneTimeCosts: number;
  workingCapital: number;
  subtotal: number;
  contingencyAmount: number;
  totalRequiredCapital: number;
}

export function calculateStartupCosts(input: StartupCostInput): StartupCostResult {
  const oneTimeCosts =
    Math.max(0, input.equipmentAndTools) +
    Math.max(0, input.rentAndUtilities) +
    Math.max(0, input.licensesAndCac) +
    Math.max(0, input.initialInventory) +
    Math.max(0, input.marketingLaunch);
  const workingCapital = Math.max(0, input.monthlyOperatingCost) * Math.max(0, input.runwayMonths);
  const subtotal = oneTimeCosts + workingCapital;
  const contingencyAmount = subtotal * (Math.max(0, input.contingencyPercent) / 100);
  const totalRequiredCapital = subtotal + contingencyAmount;

  return {
    oneTimeCosts,
    workingCapital,
    subtotal,
    contingencyAmount,
    totalRequiredCapital,
  };
}

export interface ProfitLossInput {
  monthlyRevenue: number;
  costOfGoodsSold: number;
  rentAndFacility: number;
  salariesAndWages: number;
  marketingAndSales: number;
  utilitiesAndLogistics: number;
  otherOperatingExpenses: number;
}

export interface ProfitLossResult {
  grossProfit: number;
  grossMarginPercent: number;
  totalOperatingExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  annualizedNetProfit: number;
}

export function calculateProfitAndLoss(input: ProfitLossInput): ProfitLossResult {
  const rev = Math.max(0, input.monthlyRevenue);
  const cogs = Math.max(0, input.costOfGoodsSold);
  const grossProfit = rev - cogs;
  const grossMarginPercent = rev > 0 ? (grossProfit / rev) * 100 : 0;

  const totalOperatingExpenses =
    Math.max(0, input.rentAndFacility) +
    Math.max(0, input.salariesAndWages) +
    Math.max(0, input.marketingAndSales) +
    Math.max(0, input.utilitiesAndLogistics) +
    Math.max(0, input.otherOperatingExpenses);

  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = rev > 0 ? (netProfit / rev) * 100 : 0;

  return {
    grossProfit,
    grossMarginPercent,
    totalOperatingExpenses,
    netProfit,
    netMarginPercent,
    annualizedNetProfit: netProfit * 12,
  };
}

export interface BreakEvenInput {
  fixedMonthlyCosts: number;
  sellingPricePerUnit: number;
  variableCostPerUnit: number;
}

export interface BreakEvenResult {
  contributionMarginPerUnit: number;
  contributionMarginRatioPercent: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  isViable: boolean;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixed = Math.max(0, input.fixedMonthlyCosts);
  const price = Math.max(0, input.sellingPricePerUnit);
  const variable = Math.max(0, input.variableCostPerUnit);
  const contributionMarginPerUnit = price - variable;
  const contributionMarginRatioPercent = price > 0 ? (contributionMarginPerUnit / price) * 100 : 0;

  if (contributionMarginPerUnit <= 0) {
    return {
      contributionMarginPerUnit,
      contributionMarginRatioPercent,
      breakEvenUnits: null,
      breakEvenRevenue: null,
      isViable: false,
    };
  }

  const breakEvenUnits = Math.ceil(fixed / contributionMarginPerUnit);
  const breakEvenRevenue = breakEvenUnits * price;

  return {
    contributionMarginPerUnit,
    contributionMarginRatioPercent,
    breakEvenUnits,
    breakEvenRevenue,
    isViable: true,
  };
}

export interface PricingInput {
  unitProductionCost: number;
  unitPackagingAndDelivery: number;
  overheadAllocationPerUnit: number;
  targetProfitMarginPercent: number;
  vatPercent: number;
}

export interface PricingResult {
  totalUnitCost: number;
  recommendedPreTaxPrice: number;
  profitPerUnit: number;
  markupPercent: number;
  finalCustomerPriceWithVat: number;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const totalUnitCost =
    Math.max(0, input.unitProductionCost) +
    Math.max(0, input.unitPackagingAndDelivery) +
    Math.max(0, input.overheadAllocationPerUnit);

  const clampedMargin = Math.min(90, Math.max(0, input.targetProfitMarginPercent));
  const marginFraction = clampedMargin / 100;
  const recommendedPreTaxPrice = marginFraction < 1 ? totalUnitCost / (1 - marginFraction) : totalUnitCost;
  const profitPerUnit = recommendedPreTaxPrice - totalUnitCost;
  const markupPercent = totalUnitCost > 0 ? (profitPerUnit / totalUnitCost) * 100 : 0;
  const finalCustomerPriceWithVat = recommendedPreTaxPrice * (1 + Math.max(0, input.vatPercent) / 100);

  return {
    totalUnitCost,
    recommendedPreTaxPrice,
    profitPerUnit,
    markupPercent,
    finalCustomerPriceWithVat,
  };
}

export function calculateReadinessScore(answers: Record<string, number>): {
  totalScore: number;
  band: string;
  recommendations: string[];
} {
  const keys = Object.keys(answers);
  if (keys.length === 0) {
    return { totalScore: 0, band: 'Incomplete', recommendations: [] };
  }
  const sum = keys.reduce((acc, k) => acc + (answers[k] || 0), 0);
  const max = keys.length * 5;
  const totalScore = Math.round((sum / max) * 100);

  let band = 'Early Foundation';
  if (totalScore >= 80) band = 'Funding & Scale Ready';
  else if (totalScore >= 60) band = 'Growth Stage Ready';
  else if (totalScore >= 40) band = 'Developing Structure';

  const recommendations: string[] = [];
  if ((answers.registration || 0) < 4) recommendations.push('Complete formal CAC registration to qualify for institutional grants.');
  if ((answers.bookkeeping || 0) < 4) recommendations.push('Separate personal and business bank accounts and maintain monthly P&L statements.');
  if ((answers.customers || 0) < 4) recommendations.push('Document verified customer sales records or signed B2B letters of intent.');
  if ((answers.operations || 0) < 4) recommendations.push('Standardize unit pricing and inventory tracking before raising external capital.');

  return { totalScore, band, recommendations };
}

export function exportDocumentToPdf(title: string, subtitle: string, sections: { heading: string; body: string }[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  doc.setFillColor(18, 60, 50); // #123C32
  doc.rect(0, 0, pageWidth, 84, 'F');

  doc.setTextColor(248, 247, 241);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('GIRMA BUSINESS TOOLKIT', margin, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Growth · Innovation · Resources · Markets · Access  |  Generated ${new Date().toLocaleDateString('en-NG')}`, margin, 56);

  y = 116;
  doc.setTextColor(23, 35, 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 20 + 4;

  doc.setTextColor(119, 129, 124);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(subtitle, margin, y);
  y += 24;

  for (const section of sections) {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    doc.setTextColor(18, 60, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.heading, margin, y);
    y += 16;

    doc.setTextColor(23, 35, 31);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(section.body || '—', maxWidth);
    for (const line of lines) {
      if (y > 770) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, margin, y);
      y += 15;
    }
    y += 12;
  }

  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) || 'girma-document';
  doc.save(`${safeName}.pdf`);
}
