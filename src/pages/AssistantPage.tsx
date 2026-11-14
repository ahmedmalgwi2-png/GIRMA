import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Send, ShieldAlert } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AiConversation, AiMessage, Opportunity } from '../types/girma';

interface AssistantPageProps {
  navigate: (path: string) => void;
}

const STARTER_PROMPTS = [
  'I run a small agricultural business in Adamawa State. Which verified opportunities fit me and what documents do I need?',
  'Help me write a structured 10-section business proposal for a grant application.',
  'How should I price my product and calculate monthly break-even in Nigerian Naira?',
  'Review my profile readiness and suggest practical next steps for growth.',
];

export const AssistantPage: React.FC<AssistantPageProps> = ({ navigate }) => {
  const { firebaseUser, account, businessProfile, studentProfile, getIdToken } = useAuth();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [verifiedOpps, setVerifiedOpps] = useState<Opportunity[]>([]);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    let active = true;
    async function loadInitial() {
      try {
        const [convSnap, oppSnap, appSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'ai_conversations'),
              where('userId', '==', firebaseUser!.uid),
              limit(30)
            )
          ),
          getDocs(query(collection(db, 'opportunities'), where('status', '==', 'published'), limit(15))),
          getDocs(query(collection(db, 'opportunity_applications'), where('userId', '==', firebaseUser!.uid))),
        ]);
        if (!active) return;
        const toMs = (t: unknown) => {
          if (t && typeof (t as { toMillis?: () => number }).toMillis === 'function') {
            return (t as { toMillis: () => number }).toMillis();
          }
          if (t && typeof (t as { seconds?: number }).seconds === 'number') {
            return (t as { seconds: number }).seconds * 1000;
          }
          return 0;
        };
        const convList = convSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AiConversation))
          .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
        setConversations(convList);
        setVerifiedOpps(oppSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity)));
        setSavedTitles(
          appSnap.docs.map((d) => String(d.data().opportunityTitle || d.data().opportunityId))
        );
        if (convList.length > 0 && convList[0].id) {
          setActiveConvId(convList[0].id);
        }
      } catch (err) {
        console.error('Failed loading Ask GIRMA history:', err);
      }
    }
    loadInitial();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!activeConvId || !firebaseUser || !firebaseUser.emailVerified) {
      setMessages([]);
      return;
    }
    let active = true;
    async function loadMessages() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'ai_conversations', activeConvId!, 'messages'),
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
            .map((d) => ({ id: d.id, ...d.data() } as AiMessage))
            .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
          setMessages(sorted);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    }
    loadMessages();
    return () => {
      active = false;
    };
  }, [activeConvId, firebaseUser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
  };

  const sendMessage = async (promptOverride?: string) => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    const text = (promptOverride ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    if (!promptOverride) setInput('');

    let convId = activeConvId;
    try {
      if (!convId) {
        const newRef = doc(collection(db, 'ai_conversations'));
        convId = newRef.id;
        const title = text.slice(0, 60);
        await setDoc(newRef, {
          userId: firebaseUser.uid,
          title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveConvId(convId);
        setConversations((prev) => [{ id: convId!, userId: firebaseUser.uid, title }, ...prev]);
      }

      const userMsg: AiMessage = {
        userId: firebaseUser.uid,
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);

      await addDoc(collection(db, 'ai_conversations', convId, 'messages'), {
        userId: firebaseUser.uid,
        role: 'user',
        content: text,
        createdAt: serverTimestamp(),
      });

      const token = await getIdToken();
      const shareContext = account?.consentAiContext !== false;
      const userContext = shareContext
        ? {
            fullName: account?.fullName,
            category: account?.category,
            country: account?.country,
            state: account?.state,
            businessSummary: businessProfile
              ? {
                  businessName: businessProfile.businessName,
                  industry: businessProfile.industry,
                  stage: businessProfile.stage,
                  registrationStatus: businessProfile.registrationStatus,
                  fundingNeedAmount: businessProfile.fundingNeedAmount,
                  challenges: businessProfile.challenges,
                }
              : null,
            studentSummary: studentProfile
              ? {
                  institution: studentProfile.institution,
                  courseOfStudy: studentProfile.courseOfStudy,
                  educationLevel: studentProfile.educationLevel,
                  skills: studentProfile.skills,
                }
              : null,
            savedOpportunityTitles: savedTitles,
          }
        : null;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          userContext,
          verifiedOpportunities: verifiedOpps.map((o) => ({
            title: o.title,
            organizationName: o.organizationName,
            category: o.category,
            industry: o.industry,
            eligibleStates: o.eligibleStates,
            deadlineDate: o.deadlineDate,
            officialUrl: o.officialUrl,
            verificationStatus: o.verificationStatus,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ask GIRMA could not process your request.');
      }

      const assistantMsg: AiMessage = {
        userId: firebaseUser.uid,
        role: 'assistant',
        content: data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await addDoc(collection(db, 'ai_conversations', convId, 'messages'), {
        userId: firebaseUser.uid,
        role: 'assistant',
        content: data.reply,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'ai_conversations', convId),
        { updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Ask GIRMA.';
      setError(msg);
      if (msg.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.WRITE, 'ai_conversations');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-11rem)] min-h-[540px]">
      {/* Conversations History */}
      <aside className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto">
          <button
            type="button"
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-xs font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653]"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          <div className="text-xs font-semibold text-[#77817C] dark:text-[#9AA8A1] pt-2">Recent Threads</div>
          {conversations.length === 0 ? (
            <p className="text-xs text-[#77817C] dark:text-[#9AA8A1] py-2">No previous conversations yet.</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConvId(c.id || null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate ${
                    activeConvId === c.id
                      ? 'bg-[#F8F7F1] dark:bg-[#17231F] font-semibold text-[#123C32] dark:text-[#57C496]'
                      : 'text-[#77817C] dark:text-[#9AA8A1] hover:bg-[#F8F7F1] dark:hover:bg-[#17231F]'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#17231F]/10 dark:border-white/10 text-[11px] text-[#77817C] dark:text-[#9AA8A1] space-y-1">
          <div className="font-semibold text-[#17231F] dark:text-[#ECF1EE]">
            Profile Context: {account?.consentAiContext !== false ? 'Shared (Consented)' : 'Disabled'}
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            className="text-[#123C32] dark:text-[#57C496] hover:underline"
          >
            Manage AI Consent in Settings
          </button>
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <section className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#121B18] border border-[#17231F]/10 dark:border-white/10 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#17231F]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#17231F] dark:text-[#ECF1EE]">ASK GIRMA</h2>
            <p className="text-xs text-[#77817C] dark:text-[#9AA8A1]">
              Your Intelligent Growth Companion · Grounded in verified GIRMA opportunities
            </p>
          </div>
          <span className="text-[11px] text-[#77817C] dark:text-[#9AA8A1] flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#1F7A59] dark:text-[#57C496]" />
            <span>Never guarantees funding · Always verify official portals</span>
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto py-6 space-y-5">
              <div className="space-y-2 text-center">
                <h3 className="font-display text-xl font-bold text-[#17231F] dark:text-[#ECF1EE]">
                  How can GIRMA help you grow today?
                </h3>
                <p className="text-sm text-[#77817C] dark:text-[#9AA8A1]">
                  Ask about funding eligibility, structured business proposals, marketing plans, financial projections, or learning paths.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="text-left p-3.5 rounded-xl bg-[#F8F7F1] dark:bg-[#17231F] border border-[#17231F]/10 dark:border-white/10 hover:border-[#123C32] dark:hover:border-[#57C496] text-xs text-[#17231F] dark:text-[#ECF1EE] leading-relaxed"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#123C32] dark:bg-[#1F7A59] text-[#F8F7F1]'
                      : 'bg-[#F8F7F1] dark:bg-[#17231F] text-[#17231F] dark:text-[#ECF1EE] border border-[#17231F]/10 dark:border-white/10'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#F8F7F1] dark:bg-[#17231F] border border-[#17231F]/10 dark:border-white/10 rounded-2xl px-4 py-3 text-xs text-[#77817C] dark:text-[#9AA8A1]">
                Ask GIRMA is reviewing your context and verified opportunities...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-5 py-2.5 bg-[#D94C4C]/10 dark:bg-[#F87171]/15 text-[#D94C4C] dark:text-[#F87171] text-xs border-t border-[#D94C4C]/20 dark:border-[#F87171]/30">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-[#17231F]/10 dark:border-white/10 flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about grants, business proposals, pricing, or strategy..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#17231F]/15 dark:border-white/15 bg-white dark:bg-[#0F1714] text-sm text-[#17231F] dark:text-[#ECF1EE] placeholder:text-[#77817C] dark:placeholder:text-[#9AA8A1]/70 focus:outline-none focus:border-[#1F7A59] dark:focus:border-[#57C496]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#123C32] dark:bg-[#1F7A59] text-white text-sm font-semibold hover:bg-[#1F7A59] dark:hover:bg-[#238653] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </section>
    </div>
  );
};
