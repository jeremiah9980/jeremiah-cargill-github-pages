# Teleo Title — AI Net Sheet Calculator

An AI-powered net sheet page for teleotitle.com. Agents describe a deal in plain language; Claude extracts the details and builds the net sheet instantly.

---

## Files

```
net-sheet-ai.html     ← The full page (drop into your static site root)
api/chat.js           ← Vercel serverless function (handles AI calls)
```

---

## Setup

### 1. Add your Anthropic API key to Vercel

In your Vercel project dashboard → Settings → Environment Variables:

```
ANTHROPIC_API_KEY = sk-ant-...your key here...
```

> Get a key at https://console.anthropic.com — the AI uses Claude Haiku (~$0.01 per conversation)

### 2. Add the files to your repo

```bash
# From your teleotitle repo root:
cp net-sheet-ai.html ./net-sheet-ai.html
cp -r api/ ./api/
git add .
git commit -m "Add AI net sheet calculator"
git push
```

Vercel auto-deploys. The page will be live at:
- `yourdomain.com/net-sheet-ai.html`
- API endpoint: `yourdomain.com/api/chat`

### 3. Update your nav (optional)

Add a link in your site navigation:
```html
<a href="/net-sheet-ai.html">Net sheet</a>
```

---

## How it works

1. Agent types a natural language description of the deal
2. `api/chat.js` sends the conversation to Claude Haiku with a structured system prompt
3. Claude returns JSON with extracted fields + a conversational response
4. The frontend updates the net sheet calculator in real time

**Texas title insurance rates** are calculated using TDI promulgated rate tables (tiered). All calculations happen client-side in the browser after the AI extracts the fields.

---

## Customization

Edit the system prompt in `api/chat.js` → `SYSTEM_PROMPT` to:
- Change default commission rates
- Add your specific counties
- Adjust the AI's personality/tone
- Add Teleo Title's specific fee schedule

---

## Cost estimate

- Claude Haiku: ~$0.0008 per 1K input tokens, ~$0.004 per 1K output tokens
- A typical net sheet conversation: ~800 tokens total
- **Estimated cost: ~$0.01 per session**
- 500 sessions/month ≈ $5/month in AI costs

---

## Support

Built for Teleo Title by Jeremiah Cargill.
Questions? contact@teleotitle.com
