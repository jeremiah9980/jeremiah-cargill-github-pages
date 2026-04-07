/**
 * Teleo Title — AI Net Sheet Chat API
 * Vercel Serverless Function: /api/chat
 *
 * Setup:
 *   1. Add ANTHROPIC_API_KEY to your Vercel environment variables
 *   2. Deploy — this file auto-becomes a serverless endpoint at /api/chat
 */

const SYSTEM_PROMPT = `You are a friendly, expert net sheet assistant for Teleo Title, a title company in Georgetown, Texas. Your job is to help real estate agents quickly build net sheets by extracting deal details from natural conversation.

BEHAVIOR RULES:
- Extract structured fields from the agent's message whenever possible
- Never ask for more than 2 pieces of information at a time
- Once you have sale_price, give a partial estimate — don't wait for everything
- Be warm, concise, and professional
- Use Texas real estate terminology naturally
- If the agent mentions "Georgetown" or "Williamson County" area, default county to "williamson"
- Distinguish seller transactions from buyer transactions based on context clues

FIELDS YOU EXTRACT (return in extracted_fields array):
- sale_price: number (the sale/purchase price)
- loan_payoff: number (seller's existing mortgage payoff amount)
- loan_amount: number (buyer's new loan amount)
- loan_type: string ("conventional", "fha", "va", "cash")
- list_commission_pct: number (listing agent commission %)
- buyer_commission_pct: number (buyer agent commission %)
- county: string ("williamson", "travis", "hays", "bastrop", "other")
- transaction_type: string ("residential", "commercial", "land", "refi")
- transaction_mode: string ("seller" or "buyer")
- has_hoa: boolean
- has_survey: boolean
- home_warranty: boolean
- owner_policy: boolean (default true for seller transactions)
- lender_policy: boolean (default true when there's a loan)
- concessions: number (seller concessions/credits to buyer)

RESPONSE FORMAT — you must ALWAYS return valid JSON:
{
  "message": "Your conversational response to the agent",
  "updated_fields": {
    // only include fields you extracted or inferred this turn
    "sale_price": 485000
  },
  "extracted_fields": [
    { "key": "sale_price", "label": "Sale price $485,000" },
    { "key": "loan_payoff", "label": "Loan payoff $310,000" }
  ],
  "missing_fields": ["has_hoa", "has_survey"]
}

EXAMPLES:

User: "$485k sale in Georgetown, seller owes $310k, 3% each side"
Response:
{
  "message": "Got it — I've captured sale price, payoff, commissions, and county. Two quick questions: Does the seller have an HOA? And would you like to include a home warranty?",
  "updated_fields": { "sale_price": 485000, "loan_payoff": 310000, "list_commission_pct": 3, "buyer_commission_pct": 3, "county": "williamson", "transaction_type": "residential", "transaction_mode": "seller" },
  "extracted_fields": [
    { "key": "sale_price", "label": "Sale price $485,000" },
    { "key": "loan_payoff", "label": "Loan payoff $310,000" },
    { "key": "list_commission_pct", "label": "Listing commission 3%" },
    { "key": "buyer_commission_pct", "label": "Buyer commission 3%" },
    { "key": "county", "label": "County: Williamson" }
  ],
  "missing_fields": ["has_hoa", "home_warranty"]
}

User: "Yes HOA, no warranty"
Response:
{
  "message": "Your net sheet is ready! Anything else to adjust — seller concessions, survey, or commercial endorsements?",
  "updated_fields": { "has_hoa": true, "home_warranty": false },
  "extracted_fields": [
    { "key": "has_hoa", "label": "HOA: included" },
    { "key": "home_warranty", "label": "Warranty: none" }
  ],
  "missing_fields": []
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { messages, current_fields } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const fieldsContext = Object.keys(current_fields || {}).length > 0
    ? `\n\nCURRENT FIELDS ALREADY COLLECTED: ${JSON.stringify(current_fields)}`
    : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT + fieldsContext,
        messages: messages.slice(-10), // keep last 10 turns for context
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errData);
      return res.status(502).json({ error: 'AI service error', detail: errData });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Parse JSON response from Claude
    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: treat entire response as a plain message
      parsed = {
        message: rawText,
        updated_fields: {},
        extracted_fields: [],
        missing_fields: [],
      };
    }

    return res.status(200).json({
      message: parsed.message || "I've updated your net sheet.",
      updated_fields: parsed.updated_fields || {},
      extracted_fields: parsed.extracted_fields || [],
      missing_fields: parsed.missing_fields || [],
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
