import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
  AFRICAN_COUNTRIES,
  BUSINESS_STAGES,
  EDUCATION_LEVELS,
  INDUSTRIES,
  NIGERIAN_STATES,
  REGISTRATION_STATUSES,
  USER_CATEGORIES,
  UserCategory,
} from '../types/girma';
import { calculateProfileCompletion } from '../lib/matchingEngine';

interface AuthPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<AuthPageProps> = ({ navigate }) => {
  const { signInWithGoogle, loginWithEmail, sendRecoveryEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate('/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (recoveryMode) {
        await sendRecoveryEmail(email);
        setInfo('Password recovery email sent. Please check your inbox.');
      } else {
        await loginWithEmail(email, password);
        navigate('/app');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication → Sign-in method → Email/Password). Please use Continue with Google or enable Email/Password in Firebase Console.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-[#17231F]">
            {recoveryMode ? 'Reset Your Password' : 'Sign In to GIRMA'}
          </h1>
          <p className="text-sm text-[#77817C]">
            Access your personalized dashboard, matched opportunities, and Ask GIRMA.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#D94C4C]/10 text-[#D94C4C] text-xs leading-relaxed">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3.5 rounded-lg bg-[#238653]/10 text-[#238653] text-xs leading-relaxed">
            {info}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-[#123C32] text-[#F8F7F1] text-sm font-semibold hover:bg-[#1F7A59] transition-colors disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#17231F]/10" />
          <span className="px-3 text-xs text-[#77817C]">or with email</span>
          <div className="flex-grow border-t border-[#17231F]/10" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm focus:outline-none focus:border-[#1F7A59]"
              placeholder="founder@business.ng"
            />
          </div>

          {!recoveryMode && (
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="login-pw">
                Password
              </label>
              <input
                id="login-pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm focus:outline-none focus:border-[#1F7A59]"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg border border-[#123C32] text-[#123C32] text-sm font-semibold hover:bg-[#123C32]/5 transition-colors disabled:opacity-60"
          >
            {loading ? 'Processing...' : recoveryMode ? 'Send Recovery Link' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-[#77817C] pt-2 border-t border-[#17231F]/10">
          <button
            type="button"
            onClick={() => {
              setRecoveryMode((v) => !v);
              setError(null);
              setInfo(null);
            }}
            className="hover:text-[#123C32] font-medium"
          >
            {recoveryMode ? 'Back to Sign In' : 'Forgot password?'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[#123C32] font-semibold hover:underline"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC<AuthPageProps> = ({ navigate }) => {
  const { signInWithGoogle, registerWithEmail } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [state, setState] = useState('Adamawa');
  const [category, setCategory] = useState<UserCategory>('Entrepreneur');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerWithEmail({
        fullName,
        email,
        password,
        phone,
        country,
        state,
        category,
      });
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password registration is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Use Continue with Google below to create your account immediately and complete onboarding.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-[#17231F]">Create Your GIRMA Account</h1>
          <p className="text-sm text-[#77817C]">
            Join entrepreneurs, SMEs, students, mentors, and organizations across Africa.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#D94C4C]/10 text-[#D94C4C] text-xs leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-[#123C32] text-[#F8F7F1] text-sm font-semibold hover:bg-[#1F7A59] transition-colors disabled:opacity-60"
        >
          Continue with Google (Recommended Instant Setup)
        </button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#17231F]/10" />
          <span className="px-3 text-xs text-[#77817C]">or register with email</span>
          <div className="flex-grow border-t border-[#17231F]/10" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-name">
                Full Name
              </label>
              <input
                id="reg-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                placeholder="Ibrahim Musa"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-phone">
                Phone Number
              </label>
              <input
                id="reg-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                placeholder="+234 803 000 0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-email">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                placeholder="ibrahim@example.ng"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-pw">
                Password (min. 8 chars)
              </label>
              <input
                id="reg-pw"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-country">
                Country
              </label>
              <select
                id="reg-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {AFRICAN_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-state">
                State / Region
              </label>
              {country === 'Nigeria' ? (
                <select
                  id="reg-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="reg-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  placeholder="Region / City"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17231F] mb-1.5" htmlFor="reg-cat">
                User Category
              </label>
              <select
                id="reg-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as UserCategory)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {USER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg border border-[#123C32] text-[#123C32] text-sm font-semibold hover:bg-[#123C32]/5 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating Account...' : 'Create Email Account'}
          </button>
        </form>

        <p className="text-xs text-[#77817C] text-center">
          Already have a GIRMA account?{' '}
          <button type="button" onClick={() => navigate('/login')} className="text-[#123C32] font-semibold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export const OnboardingPage: React.FC<AuthPageProps> = ({ navigate }) => {
  const {
    firebaseUser,
    account,
    businessProfile,
    studentProfile,
    mentorProfile,
    organizationProfile,
    resendVerificationEmail,
    refreshProfile,
  } = useAuth();
  const [fullName, setFullName] = useState(account?.fullName || firebaseUser?.displayName || '');
  const [phone, setPhone] = useState(account?.phone || '');
  const [country, setCountry] = useState(account?.country || 'Nigeria');
  const [state, setState] = useState(account?.state || 'Adamawa');
  const [category, setCategory] = useState<UserCategory>(account?.category || 'Entrepreneur');
  const [interestsText, setInterestsText] = useState((account?.interests || []).join(', '));

  // Business fields
  const [businessName, setBusinessName] = useState(businessProfile?.businessName || '');
  const [businessDesc, setBusinessDesc] = useState(businessProfile?.description || '');
  const [industry, setIndustry] = useState(businessProfile?.industry || INDUSTRIES[0]);
  const [regStatus, setRegStatus] = useState(businessProfile?.registrationStatus || REGISTRATION_STATUSES[0]);
  const [stage, setStage] = useState(businessProfile?.stage || BUSINESS_STAGES[1]);
  const [fundingNeed, setFundingNeed] = useState(String(businessProfile?.fundingNeedAmount || 2500000));
  const [productsText, setProductsText] = useState((businessProfile?.products || []).join(', '));
  const [targetCustomers, setTargetCustomers] = useState(businessProfile?.targetCustomers || '');
  const [challenges, setChallenges] = useState(businessProfile?.challenges || '');
  const [growthObjectives, setGrowthObjectives] = useState(businessProfile?.growthObjectives || '');

  // Student fields
  const [institution, setInstitution] = useState(studentProfile?.institution || '');
  const [courseOfStudy, setCourseOfStudy] = useState(studentProfile?.courseOfStudy || '');
  const [educationLevel, setEducationLevel] = useState(studentProfile?.educationLevel || EDUCATION_LEVELS[2]);
  const [skillsText, setSkillsText] = useState((studentProfile?.skills || []).join(', '));

  // Mentor fields
  const [mentorBackground, setMentorBackground] = useState('');
  const [mentorExpertise, setMentorExpertise] = useState('');
  const [mentorYears, setMentorYears] = useState('5');
  const [mentorAvailability, setMentorAvailability] = useState('2 hours / week');
  const [mentorBio, setMentorBio] = useState('');

  // Organization fields
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('NGO / Development Partner');
  const [orgGeo, setOrgGeo] = useState('Northern Nigeria');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifMsg, setVerifMsg] = useState<string | null>(null);

  if (!firebaseUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-[#77817C]">Please sign in first to complete onboarding.</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-lg bg-[#123C32] text-white text-sm font-semibold"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const isBizCategory = ['Entrepreneur', 'Small Business Owner', 'Startup Founder'].includes(category);
  const isStudentCategory = ['Student', 'Graduate'].includes(category);
  const isMentorCategory = category === 'Mentor';
  const isOrgCategory = ['Investor', 'Organization', 'Opportunity Provider'].includes(category);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser.emailVerified) {
      setError('Please verify your email address first using the link sent to your inbox, then click Refresh Verification Status.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 15);

      const completion = calculateProfileCompletion(
        {
          uid: firebaseUser.uid,
          fullName,
          email: firebaseUser.email || '',
          phone,
          country,
          state,
          category,
          interests,
          plan: account?.plan || 'free',
          accountStatus: 'active',
          onboardingCompleted: true,
        },
        isBizCategory && businessName.trim()
          ? {
              ownerId: firebaseUser.uid,
              businessName,
              description: businessDesc,
              industry,
              country,
              state,
              registrationStatus: regStatus,
              stage,
              fundingNeedAmount: Number(fundingNeed) || 0,
              targetCustomers,
              growthObjectives,
              verificationStatus: businessProfile?.verificationStatus || 'unverified',
            }
          : null,
        isStudentCategory && institution.trim()
          ? {
              uid: firebaseUser.uid,
              institution,
              courseOfStudy,
              educationLevel,
              skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
              state,
            }
          : null
      );

      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          fullName: fullName.trim() || 'GIRMA User',
          email: firebaseUser.email || '',
          phone: phone.trim(),
          country,
          state,
          category,
          interests,
          plan: account?.plan || 'free',
          accountStatus: account?.accountStatus || 'active',
          onboardingCompleted: true,
          profileCompletion: completion,
          preferredLanguage: account?.preferredLanguage || 'en',
          consentAiContext: account?.consentAiContext ?? true,
          consentEmailAlerts: account?.consentEmailAlerts ?? true,
          deadlineReminderDays: account?.deadlineReminderDays || [7, 3, 1],
          createdAt: account?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (isBizCategory && businessName.trim().length >= 2) {
        const bizId = businessProfile?.id || `biz_${firebaseUser.uid}`;
        await setDoc(
          doc(db, 'business_profiles', bizId),
          {
            ownerId: firebaseUser.uid,
            businessName: businessName.trim(),
            description:
              businessDesc.trim().length >= 10
                ? businessDesc.trim()
                : `${businessName.trim()} operating in ${industry} in ${state}, ${country}.`,
            industry,
            country,
            state,
            registrationStatus: regStatus,
            stage,
            fundingNeedAmount: Math.max(0, Number(fundingNeed) || 0),
            products: productsText.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
            targetCustomers: targetCustomers.trim(),
            challenges: challenges.trim(),
            growthObjectives: growthObjectives.trim(),
            verificationStatus: businessProfile?.verificationStatus || 'unverified',
            createdAt: businessProfile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (isStudentCategory && institution.trim().length >= 2) {
        await setDoc(
          doc(db, 'student_profiles', firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            institution: institution.trim(),
            courseOfStudy: courseOfStudy.trim() || 'General Studies',
            educationLevel,
            skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
            careerInterests: interests,
            state,
            createdAt: studentProfile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (isMentorCategory && mentorBackground.trim().length >= 3) {
        await setDoc(
          doc(db, 'mentor_profiles', `mentor_${firebaseUser.uid}`),
          {
            ownerId: firebaseUser.uid,
            fullName: fullName.trim(),
            background: mentorBackground.trim(),
            expertise: mentorExpertise.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
            industry,
            yearsExperience: Math.max(0, Number(mentorYears) || 1),
            country,
            state,
            availability: mentorAvailability.trim() || 'Flexible',
            bio:
              mentorBio.trim().length >= 10
                ? mentorBio.trim()
                : `${fullName.trim()} is an experienced ${industry} mentor based in ${state}.`,
            approvalStatus: mentorProfile?.approvalStatus || 'pending',
            createdAt: mentorProfile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (isOrgCategory && orgName.trim().length >= 2) {
        await setDoc(
          doc(db, 'organization_profiles', `org_${firebaseUser.uid}`),
          {
            ownerId: firebaseUser.uid,
            organizationName: orgName.trim(),
            organizationType: orgType,
            industry,
            supportInterests: interests,
            geographicFocus: orgGeo.trim() || state,
            contactEmail: firebaseUser.email || '',
            verified: organizationProfile?.verified ?? false,
            createdAt: organizationProfile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await refreshProfile();
      navigate('/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white border border-[#17231F]/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-medium text-[#1F7A59]">Smart Onboarding</p>
          <h1 className="font-display text-2xl font-bold text-[#17231F] mt-1">
            Personalize Your GIRMA Experience
          </h1>
          <p className="text-sm text-[#77817C] mt-1">
            Questions adapt automatically to your user category. Optional details can be updated anytime in your profile.
          </p>
        </div>

        {!firebaseUser.emailVerified && (
          <div className="p-4 rounded-xl bg-[#E6A23C]/10 border border-[#E6A23C]/30 space-y-3 text-xs">
            <p className="font-semibold text-[#17231F]">
              Verify your email address ({firebaseUser.email}) to activate your GIRMA account.
            </p>
            {verifMsg && <p className="text-[#123C32] font-medium">{verifMsg}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  setVerifMsg('Verification link resent to your email.');
                }}
                className="px-3 py-1.5 rounded-lg border border-[#123C32]/25 bg-white font-semibold text-[#123C32]"
              >
                Resend Verification Email
              </button>
              <button
                type="button"
                onClick={async () => {
                  await refreshProfile();
                  setVerifMsg('Checked latest verification status.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#123C32] text-white font-semibold"
              >
                I Verified My Email — Refresh
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-[#D94C4C]/10 text-[#D94C4C] text-xs">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-name">Full Name</label>
              <input
                id="ob-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-phone">Phone Number</label>
              <input
                id="ob-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-country">Country</label>
              <select
                id="ob-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {AFRICAN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-state">State</label>
              {country === 'Nigeria' ? (
                <select
                  id="ob-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                >
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  id="ob-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-cat">Primary Category</label>
              <select
                id="ob-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as UserCategory)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
              >
                {USER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="ob-int">
                Additional Interests (comma-separated)
              </label>
              <input
                id="ob-int"
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
                placeholder="Grants, Solar, Agribusiness, Export"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
              />
            </div>
          </div>

          {isBizCategory && (
            <div className="pt-5 border-t border-[#17231F]/10 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#123C32]">
                Business Profile Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Business Name</label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Yola Agro Ventures"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Registration Status</label>
                  <select
                    value={regStatus}
                    onChange={(e) => setRegStatus(e.target.value as (typeof REGISTRATION_STATUSES)[number])}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {REGISTRATION_STATUSES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Business Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as (typeof BUSINESS_STAGES)[number])}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {BUSINESS_STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Funding Requirement (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={fundingNeed}
                    onChange={(e) => setFundingNeed(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Products / Services (comma-separated)</label>
                  <input
                    value={productsText}
                    onChange={(e) => setProductsText(e.target.value)}
                    placeholder="Maize flour, Solar cold storage"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Business Description</label>
                <textarea
                  rows={3}
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  placeholder="Describe what your business produces, who you serve, and your growth objective..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Target Customers</label>
                  <input
                    value={targetCustomers}
                    onChange={(e) => setTargetCustomers(e.target.value)}
                    placeholder="Retailers, hotels, households"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Current Challenges</label>
                  <input
                    value={challenges}
                    onChange={(e) => setChallenges(e.target.value)}
                    placeholder="Power costs, working capital"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Growth Objectives</label>
                  <input
                    value={growthObjectives}
                    onChange={(e) => setGrowthObjectives(e.target.value)}
                    placeholder="Expand to 3 neighboring states"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {isStudentCategory && (
            <div className="pt-5 border-t border-[#17231F]/10 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#123C32]">
                Academic &amp; Career Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Institution</label>
                  <input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g., Modibbo Adama University, Yola"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Course of Study</label>
                  <input
                    value={courseOfStudy}
                    onChange={(e) => setCourseOfStudy(e.target.value)}
                    placeholder="e.g., Agricultural Engineering"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Education Level</label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value as (typeof EDUCATION_LEVELS)[number])}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#17231F]/15 text-sm bg-white"
                  >
                    {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Skills (comma-separated)</label>
                  <input
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="Data analysis, Python, Project management"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {isMentorCategory && (
            <div className="pt-5 border-t border-[#17231F]/10 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#123C32]">
                Mentor Application (Admin Review Required)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Professional Background</label>
                  <input
                    value={mentorBackground}
                    onChange={(e) => setMentorBackground(e.target.value)}
                    placeholder="e.g., Chartered Accountant & SME Advisor"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    value={mentorYears}
                    onChange={(e) => setMentorYears(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Areas of Expertise</label>
                  <input
                    value={mentorExpertise}
                    onChange={(e) => setMentorExpertise(e.target.value)}
                    placeholder="Finance, Agribusiness, Export"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Availability</label>
                  <input
                    value={mentorAvailability}
                    onChange={(e) => setMentorAvailability(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Biography</label>
                <textarea
                  rows={3}
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                />
              </div>
            </div>
          )}

          {isOrgCategory && (
            <div className="pt-5 border-t border-[#17231F]/10 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#123C32]">
                Organization / Investor Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Organization Name</label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Organization Type</label>
                  <input
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Geographic Focus</label>
                  <input
                    value={orgGeo}
                    onChange={(e) => setOrgGeo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#17231F]/15 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#17231F]/10">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="text-sm font-medium text-[#77817C] hover:text-[#17231F]"
            >
              Complete Optional Details Later
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-[#123C32] text-[#F8F7F1] text-sm font-semibold hover:bg-[#1F7A59] disabled:opacity-60"
            >
              {saving ? 'Saving Profile...' : 'Save & Continue to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
