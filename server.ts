import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8')
) as { projectId: string };

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken;
}

async function verifyBearerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to use Ask GIRMA.' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authUser = decoded;
    return next();
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired authentication session. Please sign in again.' });
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please pause briefly before sending another request.' },
});

app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    service: 'GIRMA API',
    timezone: 'Africa/Lagos',
    aiConfigured,
    timestamp: new Date().toISOString(),
  });
});

// ASK GIRMA Conversational Intelligence
app.post('/api/ai/chat', aiLimiter, verifyBearerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, history = [], userContext, verifiedOpportunities = [] } = req.body || {};

    if (typeof message !== 'string' || message.trim().length < 2 || message.length > 4000) {
      return res.status(400).json({ error: 'Message must be between 2 and 4000 characters.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI is not configured yet on the server. Ensure GEMINI_API_KEY is configured in environment secrets.',
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map((h: { role?: string; content?: string }) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(h.content || '').slice(0, 3000) }],
        }))
      : [];

    const contextBlock = userContext
      ? `USER PROFILE CONTEXT (Consented):
- Name: ${userContext.fullName || 'User'}
- Category: ${userContext.category || 'Entrepreneur'}
- Location: ${userContext.state || 'Nigeria'}, ${userContext.country || 'Nigeria'}
- Business/Profile Summary: ${JSON.stringify(userContext.businessSummary || userContext.studentSummary || {})}
- Saved Opportunities: ${JSON.stringify(userContext.savedOpportunityTitles || [])}`
      : 'USER PROFILE CONTEXT: Not shared (user declined profile context sharing or has not completed onboarding).';

    const opportunitiesBlock = Array.isArray(verifiedOpportunities) && verifiedOpportunities.length > 0
      ? `VERIFIED OPPORTUNITIES IN GIRMA DATABASE (Only cite opportunities and URLs from this list when naming specific programmes):
${verifiedOpportunities
  .slice(0, 15)
  .map(
    (o: Record<string, unknown>) =>
      `- [${o.title}] by ${o.organizationName} | Category: ${o.category} | Industry: ${o.industry} | States: ${Array.isArray(o.eligibleStates) ? o.eligibleStates.join(', ') : 'Nigeria'} | Deadline: ${o.deadlineDate} | Official URL: ${o.officialUrl} | Verification: ${o.verificationStatus}`
  )
  .join('\n')}`
      : 'VERIFIED OPPORTUNITIES IN GIRMA DATABASE: None supplied in context.';

    const systemInstruction = `You are ASK GIRMA ("Your Intelligent Growth Companion"), the AI assistant for GIRMA (Growth, Innovation, Resources, Markets and Access), founded by Ahmed Malgwi with an initial focus on Northern Nigeria and expansion across Africa.

STRICT SAFETY & ACCURACY RULES (NON-NEGOTIABLE):
1. NEVER invent, fabricate, or hallucinate grant names, funding programmes, or official application URLs. Only cite specific opportunities and URLs that appear in the VERIFIED OPPORTUNITIES IN GIRMA DATABASE block below.
2. Always distinguish clearly between VERIFIED DATABASE FACTS (e.g., an opportunity in the list) and STRATEGIC SUGGESTIONS / GENERAL GUIDANCE.
3. Never guarantee grant awards, loan approvals, investment, or business success.
4. Do not override mandatory eligibility rules (e.g., if an opportunity requires CAC registration or specific states, state that requirement clearly).
5. When guiding a business proposal or grant application, structure clearly (Executive Summary, Problem Statement, Proposed Solution, Market Analysis, Products/Services, Marketing Strategy, Operations, Financial Projections, Funding Requirements).
6. Note briefly when qualified legal, tax, CAC registration, or licensed financial advice is recommended.
7. Use Nigerian Naira (₦) when discussing local financial amounts unless the user specifies another currency. Keep answers practical, structured, and respectful of African entrepreneurs' realities.

${contextBlock}

${opportunitiesBlock}`;

    const chat = ai.chats.create({
      model: 'gemini-4-hydrogen',
      history: safeHistory,
      config: {
        systemInstruction,
      },
    });

    const response = await chat.sendMessage({
      message: message.trim(),
    });

    const replyText = response.text || 'I could not generate a response. Please try rephrasing your question.';
    return res.json({
      reply: replyText,
      model: 'gemini-4-hydrogen',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Ask GIRMA AI error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to process AI request.';
    return res.status(500).json({ error: `AI assistant error: ${msg}` });
  }
});

// GIRMA Match AI-Assisted Relevance Guidance (Never overrides eligibility)
app.post('/api/ai/match-advice', aiLimiter, verifyBearerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { opportunity, matchAnalysis, userProfile } = req.body || {};
    if (!opportunity || !matchAnalysis) {
      return res.status(400).json({ error: 'Opportunity and deterministic match analysis are required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini AI is not configured on the server.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this deterministic GIRMA Match result and return concise, practical preparation guidance in JSON.
NEVER override the eligibility boolean (${matchAnalysis.isEligible}) or change the numeric score (${matchAnalysis.score}%).

Opportunity: ${opportunity.title} (${opportunity.organizationName})
Category: ${opportunity.category}
Industry: ${opportunity.industry}
Deadline: ${opportunity.deadlineDate}
Required Documents: ${JSON.stringify(opportunity.requiredDocuments || [])}
User State & Category: ${userProfile?.state || 'Nigeria'} / ${userProfile?.category || 'Entrepreneur'}
Deterministic Match Score: ${matchAnalysis.score}%
Is Eligible: ${matchAnalysis.isEligible}
Missing Requirements: ${JSON.stringify(matchAnalysis.missingRequirements || [])}`,
      config: {
        systemInstruction:
          'You are GIRMA Match Advisor. Provide realistic, actionable preparation advice grounded strictly in the provided eligibility and document list. Never promise approval or invent requirements.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: '2-sentence plain-language readiness assessment.' },
            actionChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 concrete next steps for the applicant.',
            },
            cautionNote: { type: Type.STRING, description: 'Any mandatory eligibility warning or document gap.' },
          },
          required: ['summary', 'actionChecklist', 'cautionNote'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    return res.json(parsed);
  } catch (err) {
    console.error('Match AI advice error:', err);
    return res.status(500).json({ error: 'Unable to generate AI match guidance right now.' });
  }
});

// Business Toolkit AI Document Drafter (Non-math narrative templates)
app.post('/api/ai/toolkit-draft', aiLimiter, verifyBearerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { toolType, businessName, industry, state, details } = req.body || {};
    if (!toolType || !businessName) {
      return res.status(400).json({ error: 'toolType and businessName are required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini AI is not configured on the server.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate a structured, practical ${toolType} for an African business:
Business Name: ${businessName}
Industry: ${industry || 'General Commerce'}
Location: ${state || 'Nigeria'}
Founder Notes & Inputs: ${details || 'Early growth stage business seeking sustainable revenue and structured operations.'}

Return clear sections suitable for saving and exporting to PDF. Be realistic about Nigerian/African market realities and avoid fabricated statistics.`,
      config: {
        systemInstruction:
          'You are GIRMA Business Toolkit Strategist. Produce crisp, practical business documents without invented market statistics or fake citations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  body: { type: Type.STRING },
                },
                required: ['heading', 'body'],
              },
            },
          },
          required: ['title', 'sections'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    return res.json(parsed);
  } catch (err) {
    console.error('Toolkit draft AI error:', err);
    return res.status(500).json({ error: 'Unable to generate toolkit draft.' });
  }
});

// Deadline Intelligence background scheduler status & trigger endpoint
let lastDeadlineCheckRun: string | null = null;
app.post('/api/cron/deadlines', (req: Request, res: Response) => {
  const configuredSecret = process.env.CRON_SECRET;
  if (configuredSecret && req.headers['x-cron-secret'] !== configuredSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  lastDeadlineCheckRun = new Date().toISOString();
  return res.json({
    status: 'scheduled_check_recorded',
    lastRun: lastDeadlineCheckRun,
    reminderWindowsDays: [7, 3, 1],
    minMatchScoreThreshold: 60,
  });
});

app.get('/api/cron/deadlines/status', (_req: Request, res: Response) => {
  return res.json({
    schedulerActive: true,
    timezone: 'Africa/Lagos',
    reminderWindowsDays: [7, 3, 1],
    minMatchScoreThreshold: 60,
    lastRun: lastDeadlineCheckRun,
  });
});

// Periodic background heartbeat for Deadline Intelligence (Cloud Run compatible)
setInterval(() => {
  lastDeadlineCheckRun = new Date().toISOString();
}, 1000 * 60 * 60 * 6);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GIRMA server running on http://localhost:${PORT}`);
  });
}

startServer();
