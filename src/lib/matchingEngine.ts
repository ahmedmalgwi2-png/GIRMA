import {
  BusinessProfile,
  MatchAnalysis,
  Opportunity,
  StudentProfile,
  UserAccount,
} from '../types/girma';

export function daysUntilDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.ceil((targetDay - startOfToday) / (1000 * 60 * 60 * 24));
}

export function formatNaira(amount?: number, currency = 'NGN'): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return 'Not specified';
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function calculateProfileCompletion(
  user: UserAccount | null,
  business: BusinessProfile | null,
  student: StudentProfile | null
): number {
  if (!user) return 0;
  let total = 0;
  let filled = 0;

  const baseFields = [
    user.fullName,
    user.email,
    user.phone,
    user.country,
    user.state,
    user.category,
    user.interests && user.interests.length > 0,
  ];
  total += baseFields.length;
  filled += baseFields.filter(Boolean).length;

  const isEntrepreneur = ['Entrepreneur', 'Small Business Owner', 'Startup Founder'].includes(user.category);
  const isStudent = ['Student', 'Graduate'].includes(user.category);

  if (isEntrepreneur) {
    const bizFields = [
      business?.businessName,
      business?.description,
      business?.industry,
      business?.state,
      business?.registrationStatus,
      business?.stage,
      business?.fundingNeedAmount !== undefined,
      business?.targetCustomers,
      business?.growthObjectives,
    ];
    total += bizFields.length;
    filled += bizFields.filter(Boolean).length;
  } else if (isStudent) {
    const stuFields = [
      student?.institution,
      student?.courseOfStudy,
      student?.educationLevel,
      student?.skills && student.skills.length > 0,
      student?.careerInterests && student.careerInterests.length > 0,
    ];
    total += stuFields.length;
    filled += stuFields.filter(Boolean).length;
  }

  return Math.min(100, Math.round((filled / Math.max(1, total)) * 100));
}

export function computeGirmaMatch(
  opportunity: Opportunity,
  user: UserAccount | null,
  business: BusinessProfile | null,
  student: StudentProfile | null
): MatchAnalysis {
  const daysLeft = daysUntilDate(opportunity.deadlineDate);
  const reasons: string[] = [];
  const satisfiedRequirements: string[] = [];
  const missingRequirements: string[] = [];
  let score = 30;
  let isEligible = true;

  // 1. Mandatory deadline gate
  if (opportunity.status === 'expired' || (daysLeft !== null && daysLeft < 0)) {
    isEligible = false;
    missingRequirements.push('Application deadline has passed.');
    return {
      opportunityId: opportunity.id || '',
      score: 0,
      isEligible: false,
      reasons: [],
      satisfiedRequirements: [],
      missingRequirements,
      recommendedAction: 'Archive or look for the next application cycle.',
      daysUntilDeadline: daysLeft,
    };
  }

  if (!user) {
    return {
      opportunityId: opportunity.id || '',
      score: 50,
      isEligible: true,
      reasons: ['Open for general discovery. Sign in to run personalized eligibility checks.'],
      satisfiedRequirements: [],
      missingRequirements: opportunity.requiredDocuments || [],
      recommendedAction: 'Create a GIRMA profile to calculate your exact match score.',
      daysUntilDeadline: daysLeft,
    };
  }

  // 2. Mandatory location check (Country & State)
  const oppCountry = (opportunity.country || '').toLowerCase();
  const userCountry = (user.country || 'Nigeria').toLowerCase();
  const countryMatch =
    oppCountry === 'pan-african' ||
    oppCountry === 'africa' ||
    oppCountry === 'global' ||
    oppCountry === userCountry;

  if (!countryMatch) {
    isEligible = false;
    missingRequirements.push(`Restricted to ${opportunity.country} residents/businesses.`);
  } else {
    score += 15;
    satisfiedRequirements.push(`Country eligibility met (${opportunity.country}).`);
  }

  const states = opportunity.eligibleStates || [];
  if (states.length === 0 || states.includes('All States') || states.includes(user.state)) {
    score += 12;
    reasons.push(`Your location (${user.state}) is covered by this programme.`);
  } else {
    isEligible = false;
    missingRequirements.push(`Limited to: ${states.slice(0, 4).join(', ')}.`);
  }

  // 3. User category / target audience check
  const eligibleCats = opportunity.eligibleCategories || [];
  if (eligibleCats.length === 0 || eligibleCats.includes(user.category)) {
    score += 15;
    reasons.push(`Designed for your profile category (${user.category}).`);
    satisfiedRequirements.push(`Profile category matches (${user.category}).`);
  } else {
    score -= 10;
    missingRequirements.push(`Targeted primarily at: ${eligibleCats.join(', ')}.`);
  }

  // 4. Industry alignment
  const oppIndustry = (opportunity.industry || '').toLowerCase();
  const userIndustry = (business?.industry || '').toLowerCase();
  if (oppIndustry === 'all industries' || oppIndustry === 'cross-sector') {
    score += 10;
    reasons.push('Open across all sectors including yours.');
  } else if (userIndustry && (oppIndustry.includes(userIndustry) || userIndustry.includes(oppIndustry))) {
    score += 18;
    reasons.push(`Your business operates in an eligible sector (${business?.industry}).`);
    satisfiedRequirements.push(`Sector alignment: ${business?.industry}.`);
  } else if (user.interests?.some((i) => oppIndustry.includes(i.toLowerCase()))) {
    score += 12;
    reasons.push('Matches your stated industry interests.');
  }

  // 5. Business Stage & Registration mandatory gates
  if (opportunity.eligibleBusinessStages && opportunity.eligibleBusinessStages.length > 0) {
    if (business?.stage && opportunity.eligibleBusinessStages.includes(business.stage)) {
      score += 10;
      reasons.push(`Your business stage (${business.stage}) fits the programme criteria.`);
      satisfiedRequirements.push(`Business stage qualified (${business.stage}).`);
    } else if (business?.stage) {
      isEligible = false;
      missingRequirements.push(`Requires business stage: ${opportunity.eligibleBusinessStages.join(' or ')}.`);
    } else {
      missingRequirements.push(`Add your business stage (${opportunity.eligibleBusinessStages.join(', ')} required).`);
    }
  }

  if (opportunity.requiresRegistration) {
    if (business && business.registrationStatus !== 'Unregistered') {
      score += 8;
      satisfiedRequirements.push(`Formal registration satisfied (${business.registrationStatus}).`);
    } else {
      isEligible = false;
      missingRequirements.push('Valid CAC or formal business registration required.');
    }
  }

  // 6. Education level check for student opportunities
  if (opportunity.eligibleEducationLevels && opportunity.eligibleEducationLevels.length > 0) {
    if (student?.educationLevel && opportunity.eligibleEducationLevels.includes(student.educationLevel)) {
      score += 12;
      satisfiedRequirements.push(`Education level verified (${student.educationLevel}).`);
    } else if (student?.educationLevel) {
      isEligible = false;
      missingRequirements.push(`Requires education level: ${opportunity.eligibleEducationLevels.join(', ')}.`);
    } else {
      missingRequirements.push(`Complete student education level (${opportunity.eligibleEducationLevels.join(', ')}).`);
    }
  }

  // 7. Required documents checklist
  if (opportunity.requiredDocuments && opportunity.requiredDocuments.length > 0) {
    for (const docItem of opportunity.requiredDocuments) {
      const lower = docItem.toLowerCase();
      if (lower.includes('cac') && business && business.registrationStatus !== 'Unregistered') {
        continue;
      }
      missingRequirements.push(docItem);
    }
  }

  // Clamp score safely; if mandatory eligibility failed, cap score <= 45 so AI/UI never overstates eligibility
  let finalScore = Math.max(10, Math.min(98, score));
  if (!isEligible) {
    finalScore = Math.min(finalScore, 45);
  }

  let recommendedAction = 'Review the official eligibility instructions and prepare required documents.';
  if (!isEligible) {
    recommendedAction = `Address missing eligibility criteria (${missingRequirements[0] || 'check requirements'}) before applying.`;
  } else if (daysLeft !== null && daysLeft <= 7) {
    recommendedAction = `Closing in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — finalize your documents and apply promptly.`;
  } else if (finalScore >= 75) {
    recommendedAction = 'Strong match — save to your tracker and draft your application using Ask GIRMA or the Business Toolkit.';
  }

  return {
    opportunityId: opportunity.id || '',
    score: finalScore,
    isEligible,
    reasons: reasons.length > 0 ? reasons : ['Matches general GIRMA ecosystem criteria for your region.'],
    satisfiedRequirements,
    missingRequirements,
    recommendedAction,
    daysUntilDeadline: daysLeft,
  };
}
