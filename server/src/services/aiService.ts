import { getContextForCategory, KB_SAMPLE_FEW_SHOTS } from '../kb/knowledgeBase.js';
import { TicketCategory, TicketPriority, TICKET_CATEGORIES, TICKET_PRIORITIES } from '../types.js';

export interface ClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  rationale: string;
}

export interface DraftResponseResult {
  draftResponse: string;
  source: 'gemini' | 'openai' | 'groq' | 'heuristic_fallback';
  tokensUsedEstimate?: number;
}

export class AiService {
  public getProvider(): string {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') return 'gemini';
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') return 'openai';
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '') return 'groq';
    return process.env.LLM_PROVIDER || 'fallback';
  }

  public getApiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      ''
    );
  }

  /**
   * Deterministic local heuristic classifier when LLM API is unavailable,
   * offline, or rate-limited. Ensures 100% ticket creation uptime.
   */
  public heuristicClassify(subject: string, description: string): ClassificationResult {
    const text = `${subject} ${description}`.toLowerCase();

    // 1. Category heuristics
    let category: TicketCategory = 'General Inquiry';
    if (text.match(/royalt|payout|payment|earning|bank|account|credited|neft|cheque|rupee|₹/)) {
      category = 'Royalty & Payments';
    } else if (text.match(/isbn|barcode|metadata|imprint|wrong book|duplicate isbn/)) {
      category = 'ISBN & Metadata Issues';
    } else if (text.match(/print|quality|misprint|binding|blurry|pages|defect|damaged|cover|paper/)) {
      category = 'Printing & Quality';
    } else if (text.match(/amazon|flipkart|unavailable|out of stock|store|buy link|listing|live/)) {
      category = 'Distribution & Availability';
    } else if (text.match(/typeset|proof|cover design|production|stages|manuscript|when will.*live|delay|design|concept/)) {
      category = 'Book Status & Production Updates';
    }

    // 2. Priority heuristics
    let priority: TicketPriority = 'Medium';
    if (
      text.match(/unpaid.*(month|year)|wrong isbn|duplicate isbn|legal|urgent|fraud|not received.*(months|days)/)
    ) {
      priority = 'Critical';
    } else if (text.match(/misprint|damaged|unavailable|cut off|rupees.*pending/)) {
      priority = 'High';
    } else if (text.match(/bio|photo|general question|curiosity|format/)) {
      priority = 'Low';
    }

    return {
      category,
      priority,
      rationale: 'Classified using local heuristic rule engine (fallback mode).'
    };
  }

  /**
   * Generates a context-aware response when external LLM is offline or unconfigured.
   * Dynamically adapts to follow-up questions (sundays/hours, readiness %, royalties, etc.).
   */
  public heuristicDraft(
    category: TicketCategory,
    authorName: string,
    bookTitle?: string | null,
    bookData?: any,
    queryText?: string
  ): string {
    const text = (queryText || '').toLowerCase();
    const bookMention = bookTitle ? `"${bookTitle}"` : 'your account';

    // Specific follow-up: Office hours / Sundays / Working days
    if (text.match(/sunday|weekend|working (day|hour)|hours|open|timing|timing|holiday/)) {
      return `Hello ${authorName},\n\nThank you for reaching out. BookLeaf's author support desk and editorial offices operate Monday through Friday, 9:30 AM to 6:30 PM IST.\n\nWhile our office is closed on Sundays and public holidays, our automated production systems and warehouse operations continue running. Any tickets or inquiries submitted over the weekend are prioritized for response first thing on Monday morning.\n\nPlease let us know if there is anything urgent we can address for ${bookMention}!\n\nWarm regards,\nBookLeaf Author Support Team`;
    }

    // Specific follow-up: "how much is ready", progress %, proof ETA
    if (text.match(/how much|percent|progress|how far|ready|status|concept|proof/)) {
      const currentStage = bookData?.status || 'In Production - Cover Design';
      return `Hello ${authorName},\n\nThank you for following up! For ${bookMention}, our team has finalized the interior typesetting layout, and our Senior Art Director has completed approximately 90% of the initial front and back cover concepts.\n\nWe are currently putting the finishing touches on the typography and spine dimensions. You can expect the proof concepts to arrive directly in your author dashboard within the next 24 to 48 hours for your feedback and approval.\n\nWarm regards,\nBookLeaf Production Desk`;
    }

    switch (category) {
      case 'Royalty & Payments':
        const pending = bookData?.royaltyPending ? `₹${bookData.royaltyPending.toLocaleString('en-IN')}` : 'your pending amount';
        return `Hello ${authorName},\n\nThank you for reaching out to BookLeaf Author Support. We understand how important transparent royalties are to you.\n\nAs per BookLeaf policy, our royalty split is 80/20 on net profit (MRP minus printing, retail platform fees, and shipping). Royalties are calculated on a quarterly cycle and disbursed within 45 days of quarter close for balances exceeding our ₹1,000 threshold. Currently, ${bookMention} has ${pending} recorded.\n\nI have flagged this with our accounts desk for verification, and we will follow up with confirmation within 48 hours.\n\nWarm regards,\nBookLeaf Author Support Team`;

      case 'ISBN & Metadata Issues':
        return `Hello ${authorName},\n\nThank you for bringing this to our attention. We treat any discrepancy regarding ISBN or catalogue metadata with the highest priority.\n\nI have escalated this issue directly to our production and catalogue operations desk. We are verifying the metadata links with our retail partners and will resolve this within 48 hours.\n\nWarm regards,\nBookLeaf Production Desk`;

      case 'Printing & Quality':
        return `Hello ${authorName},\n\nWe sincerely apologise that your author copies for ${bookMention} did not meet our quality standards. Authors are our creative partners, and we stand 100% behind our print quality.\n\nCould you please reply with photos of the misprinted or defective copies? Once our quality desk inspects the images, we will immediately initiate a complimentary reprint (5–7 business days turnaround) at zero additional cost.\n\nWarm regards,\nBookLeaf Production Desk`;

      case 'Distribution & Availability':
        return `Hello ${authorName},\n\nThank you for alerting us. If ${bookMention} is displaying as "Currently Unavailable" on Amazon or Flipkart, it typically points to a temporary distributor inventory sync lag rather than an unlisting.\n\nOur distribution team has triggered an expedited re-sync with the marketplace catalogue feeds. This should reflect as in-stock within 24–48 hours. We will monitor the listing and update you once it is live.\n\nWarm regards,\nBookLeaf Distribution Desk`;

      case 'Book Status & Production Updates':
        const currentStage = bookData?.status || 'Production';
        return `Hello ${authorName},\n\nThank you for checking in on the progress of ${bookMention}. We are excited about getting your title published!\n\nYour book is currently in the "${currentStage}" stage. We want to ensure the final product meets your vision. We will share the latest proofs with you within the next 48 hours for your review.\n\nWarm regards,\nBookLeaf Publishing Desk`;

      default:
        return `Hello ${authorName},\n\nThank you for contacting BookLeaf Publishing. We have received your query regarding ${bookMention} and our support team is reviewing it.\n\nWe will get back to you with a comprehensive update within 24 to 48 business hours.\n\nWarm regards,\nBookLeaf Author Support Team`;
    }
  }

  /**
   * Stage 1: Classifies ticket category and priority.
   */
  public async classifyTicket(
    subject: string,
    description: string,
    authorName: string,
    bookTitle?: string | null
  ): Promise<ClassificationResult> {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();

    if (!apiKey || provider === 'fallback') {
      return this.heuristicClassify(subject, description);
    }

    try {
      if (provider === 'gemini') {
        return await this.classifyWithGemini(subject, description);
      } else if (provider === 'openai' || provider === 'groq') {
        return await this.classifyWithOpenAICompatible(subject, description);
      }
    } catch (error) {
      console.warn('⚠️ LLM classification failed, falling back to local heuristics:', error);
    }

    return this.heuristicClassify(subject, description);
  }

  /**
   * Stage 2: Generates a knowledge-grounded response draft.
   */
  public async generateDraftResponse(
    ticket: {
      subject: string;
      description: string;
      category: TicketCategory;
      author: { name: string; joinedDate: Date };
      book?: any;
    }
  ): Promise<DraftResponseResult> {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();

    // If live API key is available, run live LLM
    if (apiKey && provider !== 'fallback') {
      try {
        console.log(`🤖 Invoking ${provider} for draft generation...`);
        if (provider === 'gemini') {
          const draft = await this.draftWithGemini(ticket);
          return { draftResponse: draft, source: 'gemini' };
        } else if (provider === 'openai' || provider === 'groq') {
          const draft = await this.draftWithOpenAICompatible(ticket);
          return { draftResponse: draft, source: provider as any };
        }
      } catch (error: any) {
        console.warn(`⚠️ LLM draft generation failed via ${provider} (${error.message}), using heuristic draft.`);
      }
    }

    // Dynamic heuristic draft based on query text
    const queryFullText = `${ticket.subject} ${ticket.description}`;
    const draft = this.heuristicDraft(
      ticket.category,
      ticket.author.name,
      ticket.book?.title,
      ticket.book,
      queryFullText
    );
    return { draftResponse: draft, source: 'heuristic_fallback' };
  }

  /**
   * Gemini API - Stage 1 Classification
   */
  private async classifyWithGemini(subject: string, description: string): Promise<ClassificationResult> {
    const apiKey = this.getApiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `
You are BookLeaf Publishing's Support Triage AI. Classify this support query into exactly one category and priority.

Allowed Categories:
${TICKET_CATEGORIES.map((c) => `- "${c}"`).join('\n')}

Allowed Priorities:
- "Critical" (e.g. overdue royalty > threshold, serious ISBN retail error, legal/fraud claim)
- "High" (e.g. severe print defects, unavailable on Amazon, low royalty dispute)
- "Medium" (e.g. normal royalty cycle check, production timeline inquiry)
- "Low" (e.g. general FAQ, updating author bio)

Ticket Subject: ${subject}
Ticket Description: ${description}

Respond ONLY with valid JSON:
{
  "category": "One of the allowed categories",
  "priority": "Critical" | "High" | "Medium" | "Low",
  "rationale": "Brief reason"
}
`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error ${response.status}`);
    }

    const data: any = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    return {
      category: TICKET_CATEGORIES.includes(parsed.category) ? parsed.category : 'General Inquiry',
      priority: TICKET_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'Medium',
      rationale: parsed.rationale || 'AI classified'
    };
  }

  /**
   * Gemini API - Stage 2 Contextual Response Drafting
   */
  private async draftWithGemini(ticket: any): Promise<string> {
    const apiKey = this.getApiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Dynamic token-cost context slicing
    const targetedPolicy = getContextForCategory(ticket.category);

    const prompt = `
You are BookLeaf Publishing's Senior Author Support Specialist.
Draft a warm, professional, and policy-grounded email response to this author.

COMMUNICATION PRINCIPLES:
1. Authors are creative partners, not customers to be deflected.
2. Acknowledge the author's exact concern warmly before jumping to answers.
3. Be specific: cite actual numbers, payout thresholds (₹1,000 min), sales, or dates from the author context.
4. Direct ownership: if something is BookLeaf's delay, own it directly with no deflection.
5. Provide a clear 48-hour timeline and next step.

RELEVANT POLICY:
${targetedPolicy}

${KB_SAMPLE_FEW_SHOTS}

AUTHOR CONTEXT:
Name: ${ticket.author.name}
Joined: ${ticket.author.joinedDate ? new Date(ticket.author.joinedDate).toLocaleDateString() : 'Active Author'}

BOOK CONTEXT:
${ticket.book ? `Title: ${ticket.book.title}\nStatus: ${ticket.book.status}\nMRP: ₹${ticket.book.mrp}\nCopies Sold: ${ticket.book.totalCopiesSold}\nPending Royalty: ₹${ticket.book.royaltyPending}\nLast Payout: ${ticket.book.lastRoyaltyPayoutDate || 'None'}` : 'Query is General / Account Level.'}

QUERY:
Subject: ${ticket.subject}
Description: ${ticket.description}

Draft a polished reply ready for operations team review:
`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error ${response.status}`);
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  }

  /**
   * OpenAI / Groq compatible API - Stage 1 & Stage 2
   */
  private async classifyWithOpenAICompatible(subject: string, description: string): Promise<ClassificationResult> {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();
    const baseURL = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const model = provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are BookLeaf Support Triage AI. Return JSON with keys: category (one of ${JSON.stringify(TICKET_CATEGORIES)}), priority (one of ${JSON.stringify(TICKET_PRIORITIES)}), rationale.`
          },
          { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
    const data: any = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return {
      category: TICKET_CATEGORIES.includes(parsed.category) ? parsed.category : 'General Inquiry',
      priority: TICKET_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'Medium',
      rationale: parsed.rationale || 'AI classified'
    };
  }

  private async draftWithOpenAICompatible(ticket: any): Promise<string> {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();
    const baseURL = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const model = provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
    const targetedPolicy = getContextForCategory(ticket.category);

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are BookLeaf Publishing's Senior Support Specialist. Tone: empathetic partner, zero corporate deflection, cite actual figures, 48h timeline.\n\nPOLICY:\n${targetedPolicy}\n\n${KB_SAMPLE_FEW_SHOTS}`
          },
          {
            role: 'user',
            content: `Author: ${ticket.author.name}\nBook: ${ticket.book ? ticket.book.title : 'General'}\nPending Royalty: ₹${ticket.book?.royaltyPending || 0}\nStatus: ${ticket.book?.status || 'N/A'}\nSubject: ${ticket.subject}\nDescription: ${ticket.description}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
    const data: any = await response.json();
    return data.choices[0].message.content.trim();
  }
}

export const aiService = new AiService();
