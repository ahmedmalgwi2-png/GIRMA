import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BusinessProfile,
  MentorProfile,
  Opportunity,
  OrganizationProfile,
  StudentProfile,
  UserAccount,
  UserCategory,
} from '../types/girma';
import { computeGirmaMatch } from '../lib/matchingEngine';
import { checkSeedInitialized, seedEcosystemData } from '../lib/seedData';

interface AuthContextValue {
  firebaseUser: User | null;
  account: UserAccount | null;
  businessProfile: BusinessProfile | null;
  studentProfile: StudentProfile | null;
  mentorProfile: MentorProfile | null;
  organizationProfile: OrganizationProfile | null;
  isAdmin: boolean;
  authLoading: boolean;
  signInWithGoogle: () => Promise<User>;
  registerWithEmail: (params: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    country: string;
    state: string;
    category: UserCategory;
  }) => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  sendRecoveryEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const runDeadlineIntelligence = useCallback(
    async (
      user: User,
      acc: UserAccount,
      biz: BusinessProfile | null,
      stu: StudentProfile | null
    ) => {
      if (!user.emailVerified || acc.accountStatus === 'suspended') return;
      try {
        const oppSnap = await getDocs(
          query(collection(db, 'opportunities'), where('status', '==', 'published'))
        );
        const appSnap = await getDocs(
          query(collection(db, 'opportunity_applications'), where('userId', '==', user.uid))
        );
        const savedIds = new Set(appSnap.docs.map((d) => d.data().opportunityId as string));

        const existingNotifs = await getDocs(
          query(collection(db, 'notifications'), where('userId', '==', user.uid))
        );
        const existingKeys = new Set(
          existingNotifs.docs.map((d) => d.data().dedupeKey as string).filter(Boolean)
        );

        const reminderDays = acc.deadlineReminderDays?.length ? acc.deadlineReminderDays : [7, 3, 1];

        for (const oppDoc of oppSnap.docs) {
          const opp = { id: oppDoc.id, ...oppDoc.data() } as Opportunity;
          const match = computeGirmaMatch(opp, acc, biz, stu);
          const isSaved = savedIds.has(opp.id || '');

          if (!isSaved && match.score < 60) continue;
          if (match.daysUntilDeadline === null || match.daysUntilDeadline < 0) continue;

          let reminderType: string | null = null;
          if (match.daysUntilDeadline <= 1 && reminderDays.includes(1)) reminderType = '1_day';
          else if (match.daysUntilDeadline <= 3 && reminderDays.includes(3)) reminderType = '3_day';
          else if (match.daysUntilDeadline <= 7 && reminderDays.includes(7)) reminderType = '7_day';

          if (!reminderType) continue;

          const dedupeKey = `${user.uid}_${opp.id}_${reminderType}`;
          if (existingKeys.has(dedupeKey)) continue;

          const notifId = dedupeKey.replace(/[^a-zA-Z0-9_-]/g, '_');
          await setDoc(doc(db, 'notifications', notifId), {
            userId: user.uid,
            category: 'Application Deadlines',
            title: `Deadline Alert: ${opp.title}`,
            message: `${opp.organizationName} closes in ${match.daysUntilDeadline} day${match.daysUntilDeadline === 1 ? '' : 's'} (${opp.deadlineDate}). Your GIRMA Match score is ${match.score}%.`,
            opportunityId: opp.id,
            reminderType,
            dedupeKey,
            isRead: false,
            createdAt: serverTimestamp(),
          });
          existingKeys.add(dedupeKey);
        }
      } catch (err) {
        console.warn('Deadline Intelligence check skipped:', err);
      }
    },
    []
  );

  const loadUserRecords = useCallback(
    async (user: User | null) => {
      if (!user || !user.emailVerified) {
        setAccount(null);
        setBusinessProfile(null);
        setStudentProfile(null);
        setMentorProfile(null);
        setOrganizationProfile(null);
        setIsAdmin(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        let accData: UserAccount | null = null;

        if (userSnap.exists()) {
          accData = userSnap.data() as UserAccount;
        } else {
          const rawName = (user.displayName || user.email?.split('@')[0] || 'GIRMA Member').trim();
          const safeFullName = rawName.length >= 2 ? rawName.slice(0, 120) : 'GIRMA Member';
          const initialAcc: UserAccount = {
            uid: user.uid,
            fullName: safeFullName,
            email: user.email || '',
            phone: user.phoneNumber || '',
            country: 'Nigeria',
            state: 'FCT - Abuja',
            category: 'Entrepreneur',
            interests: [],
            plan: 'free',
            accountStatus: 'active',
            onboardingCompleted: false,
            profileCompletion: 35,
            preferredLanguage: 'en',
            consentAiContext: true,
            consentEmailAlerts: true,
            deadlineReminderDays: [7, 3, 1],
          };
          await setDoc(userRef, {
            ...initialAcc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          accData = initialAcc;
        }

        setAccount(accData);

        // Check Admin privileges safely
        let adminFlag =
          user.email?.toLowerCase() === 'ahmedmalgwi2@gmail.com' && user.emailVerified;
        if (!adminFlag) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            adminFlag = adminSnap.exists();
          } catch {
            adminFlag = false;
          }
        }
        setIsAdmin(adminFlag);

        if (adminFlag) {
          const seeded = await checkSeedInitialized();
          if (!seeded) {
            try {
              await seedEcosystemData(user.uid);
            } catch (seedErr) {
              console.warn('Auto-seed skipped:', seedErr);
            }
          }
        }

        // Load conditional role profiles
        const [bizSnap, stuSnap, menSnap, orgSnap] = await Promise.all([
          getDocs(query(collection(db, 'business_profiles'), where('ownerId', '==', user.uid))),
          getDoc(doc(db, 'student_profiles', user.uid)),
          getDocs(query(collection(db, 'mentor_profiles'), where('ownerId', '==', user.uid))),
          getDocs(query(collection(db, 'organization_profiles'), where('ownerId', '==', user.uid))),
        ]);

        const biz = bizSnap.empty
          ? null
          : ({ id: bizSnap.docs[0].id, ...bizSnap.docs[0].data() } as BusinessProfile);
        const stu = stuSnap.exists() ? (stuSnap.data() as StudentProfile) : null;
        const men = menSnap.empty
          ? null
          : ({ id: menSnap.docs[0].id, ...menSnap.docs[0].data() } as MentorProfile);
        const org = orgSnap.empty
          ? null
          : ({ id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as OrganizationProfile);

        setBusinessProfile(biz);
        setStudentProfile(stu);
        setMentorProfile(men);
        setOrganizationProfile(org);

        if (accData) {
          await runDeadlineIntelligence(user, accData, biz, stu);
        }
      } catch (err) {
        console.error('Error loading user ecosystem records:', err);
      }
    },
    [runDeadlineIntelligence]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      await loadUserRecords(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [loadUserRecords]);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    await loadUserRecords(result.user);
    return result.user;
  };

  const registerWithEmail = async (params: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    country: string;
    state: string;
    category: UserCategory;
  }) => {
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
    await updateProfile(cred.user, { displayName: params.fullName.trim() });
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Verification email dispatch best-effort
    }
    if (cred.user.emailVerified) {
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          fullName: params.fullName.trim(),
          email: params.email.trim(),
          phone: params.phone.trim(),
          country: params.country,
          state: params.state,
          category: params.category,
          interests: [],
          plan: 'free',
          accountStatus: 'active',
          onboardingCompleted: false,
          profileCompletion: 45,
          preferredLanguage: 'en',
          consentAiContext: true,
          consentEmailAlerts: true,
          deadlineReminderDays: [7, 3, 1],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
      }
    }
    return cred.user;
  };

  const loginWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await loadUserRecords(cred.user);
    return cred.user;
  };

  const sendRecoveryEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser });
      await loadUserRecords(auth.currentUser);
    }
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        account,
        businessProfile,
        studentProfile,
        mentorProfile,
        organizationProfile,
        isAdmin,
        authLoading,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        sendRecoveryEmail,
        resendVerificationEmail,
        logout,
        refreshProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
