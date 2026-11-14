export type UserCategory =
  | 'Entrepreneur'
  | 'Small Business Owner'
  | 'Startup Founder'
  | 'Student'
  | 'Graduate'
  | 'Freelancer'
  | 'Professional'
  | 'Mentor'
  | 'Investor'
  | 'Organization'
  | 'Opportunity Provider';

export const USER_CATEGORIES: UserCategory[] = [
  'Entrepreneur',
  'Small Business Owner',
  'Startup Founder',
  'Student',
  'Graduate',
  'Freelancer',
  'Professional',
  'Mentor',
  'Investor',
  'Organization',
  'Opportunity Provider',
];

export const OPPORTUNITY_CATEGORIES = [
  'Grants',
  'Business Funding',
  'Loans',
  'Scholarships',
  'Fellowships',
  'Internships',
  'Jobs',
  'Business Competitions',
  'Startup Accelerators',
  'Incubation Programmes',
  'Training Programmes',
  'Workshops',
  'Conferences',
  'Mentorship Programmes',
  'Government Empowerment Programmes',
  'Procurement Opportunities',
  'Market Access Opportunities',
  'Research Opportunities',
] as const;

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

export const FUNDING_SECTIONS = [
  'Grants',
  'Business Loans',
  'Startup Capital',
  'Seed Funding',
  'Angel Investment',
  'Venture Capital',
  'Government Funding',
  'Women-Focused Funding',
  'Youth-Focused Funding',
  'Agricultural Funding',
] as const;

export const APPLICATION_STATUSES = [
  'Saved',
  'Planning to Apply',
  'Application in Progress',
  'Submitted',
  'Shortlisted',
  'Successful',
  'Unsuccessful',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export const AFRICAN_COUNTRIES = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'Rwanda',
  'Senegal',
  'Cameroon',
  'Niger',
  'Chad',
  'Benin',
  'Pan-African',
] as const;

export const INDUSTRIES = [
  'Agriculture & Agribusiness',
  'Technology & Software',
  'Retail & E-Commerce',
  'Manufacturing & Processing',
  'Clean Energy & Solar',
  'Education & EdTech',
  'Healthcare & HealthTech',
  'Financial Services & FinTech',
  'Creative & Media',
  'Logistics & Transportation',
  'Construction & Real Estate',
  'Fashion & Textiles',
  'Food & Beverage',
  'Professional Services',
  'Social Impact & NGO',
] as const;

export const LEARNING_CATEGORIES = [
  'Entrepreneurship',
  'Business Management',
  'Financial Literacy',
  'Digital Marketing',
  'Technology',
  'Artificial Intelligence',
  'Cybersecurity',
  'Leadership',
  'Business Development',
  'Sales',
  'Innovation',
  'Career Development',
] as const;

export const BUSINESS_STAGES = [
  'Idea',
  'MVP / Early',
  'Operating (< 2 yrs)',
  'Growing (2-5 yrs)',
  'Established (5+ yrs)',
] as const;

export const REGISTRATION_STATUSES = [
  'Unregistered',
  'CAC Business Name',
  'CAC Limited Liability',
  'Cooperative / NGO',
] as const;

export const EDUCATION_LEVELS = [
  'Secondary',
  'OND / NCE',
  "HND / Bachelor's",
  "Master's",
  'PhD',
  'Vocational / Technical',
] as const;

export interface UserAccount {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  state: string;
  category: UserCategory;
  interests?: string[];
  plan: 'free' | 'pro' | 'organization';
  accountStatus: 'active' | 'suspended';
  onboardingCompleted: boolean;
  profileCompletion?: number;
  preferredLanguage?: 'en' | 'ha' | 'yo' | 'ig' | 'fr';
  consentAiContext?: boolean;
  consentEmailAlerts?: boolean;
  deadlineReminderDays?: number[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BusinessProfile {
  id?: string;
  ownerId: string;
  businessName: string;
  description: string;
  category?: string;
  industry: string;
  country: string;
  state: string;
  city?: string;
  registrationStatus: (typeof REGISTRATION_STATUSES)[number];
  stage: (typeof BUSINESS_STAGES)[number];
  size?: 'Solo' | 'Micro (2-9)' | 'Small (10-49)' | 'Medium (50-249)';
  employeesCount?: number;
  yearsOfOperation?: number;
  fundingNeedAmount?: number;
  fundingNeedPurpose?: string;
  revenueRange?: string;
  products?: string[];
  services?: string[];
  targetCustomers?: string;
  challenges?: string;
  growthObjectives?: string;
  website?: string;
  socialHandle?: string;
  contactEmail?: string;
  contactPhone?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentProfile {
  uid: string;
  institution: string;
  courseOfStudy: string;
  educationLevel: (typeof EDUCATION_LEVELS)[number];
  skills?: string[];
  careerInterests?: string[];
  preferredOpportunities?: string[];
  state?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MentorProfile {
  id?: string;
  ownerId: string;
  fullName: string;
  background: string;
  expertise?: string[];
  industry: string;
  yearsExperience: number;
  country?: string;
  state: string;
  availability: string;
  bio: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrganizationProfile {
  id?: string;
  ownerId: string;
  organizationName: string;
  organizationType: string;
  industry: string;
  supportInterests?: string[];
  geographicFocus: string;
  contactEmail?: string;
  website?: string;
  verified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Opportunity {
  id?: string;
  title: string;
  organizationName: string;
  category: string;
  fundingType?: string;
  description: string;
  eligibilitySummary?: string;
  targetAudiences?: string[];
  eligibleCategories?: string[];
  eligibleBusinessStages?: string[];
  eligibleEducationLevels?: string[];
  requiresRegistration?: boolean;
  country: string;
  eligibleStates?: string[];
  industry: string;
  benefits?: string;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  fundingCurrency?: string;
  openingDate?: string;
  deadlineDate: string;
  requiredDocuments?: string[];
  applicationInstructions?: string;
  officialUrl: string;
  contactInfo?: string;
  verificationStatus: 'unverified' | 'verified';
  status: 'published' | 'draft' | 'expired';
  isFeatured?: boolean;
  isSeedData?: boolean;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OpportunityApplication {
  id?: string;
  userId: string;
  opportunityId: string;
  opportunityTitle?: string;
  organizationName?: string;
  category?: string;
  deadlineDate?: string;
  status: ApplicationStatus;
  interested?: boolean;
  notes?: string;
  matchScore?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MatchAnalysis {
  opportunityId: string;
  score: number;
  isEligible: boolean;
  reasons: string[];
  satisfiedRequirements: string[];
  missingRequirements: string[];
  recommendedAction: string;
  daysUntilDeadline: number | null;
}

export interface BusinessListing {
  id?: string;
  ownerId: string;
  businessId?: string;
  businessName: string;
  title: string;
  listingType: 'product' | 'service' | 'partnership' | 'supplier';
  description: string;
  industry: string;
  country?: string;
  state: string;
  priceNgn?: number;
  priceUnit?: string;
  contactMethod?: string;
  status: 'active' | 'paused';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BusinessConnection {
  id?: string;
  senderId: string;
  senderName: string;
  recipientOwnerId: string;
  businessId?: string;
  listingId?: string;
  listingTitle?: string;
  enquiryType?: string;
  message: string;
  responseMessage?: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MentorshipRequest {
  id?: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  mentorOwnerId: string;
  mentorName: string;
  topic: string;
  message: string;
  mentorReply?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LearningResource {
  id?: string;
  title: string;
  category: string;
  contentType: 'Article' | 'Video' | 'Tutorial' | 'Downloadable Guide' | 'Course' | 'Practical Guide';
  summary: string;
  contentBody: string;
  durationMinutes?: number;
  authorName?: string;
  isPublished: boolean;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LearningProgress {
  id?: string;
  userId: string;
  resourceId: string;
  saved: boolean;
  completed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BusinessDocument {
  id?: string;
  userId: string;
  toolType: string;
  title: string;
  payload: Record<string, unknown>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VerificationRequest {
  id?: string;
  userId: string;
  businessId: string;
  businessName: string;
  documentType: string;
  registrationRef: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  adminNotes?: string;
  reviewedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id?: string;
  userId: string;
  category: string;
  title: string;
  message: string;
  opportunityId?: string;
  reminderType?: string;
  dedupeKey?: string;
  isRead: boolean;
  createdAt?: unknown;
}

export interface AiConversation {
  id?: string;
  userId: string;
  title: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiMessage {
  id?: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: unknown;
}

export interface AdminActivityLog {
  id?: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
  createdAt?: unknown;
}
