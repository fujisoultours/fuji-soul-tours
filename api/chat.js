const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

let kbCache = null;
let kbLoadedAt = 0;
const KB_CACHE_TTL = 5 * 60 * 1000;

function loadKB() {
  const now = Date.now();
  if (kbCache && now - kbLoadedAt < KB_CACHE_TTL) return kbCache;
  const kbPath = path.join(__dirname, "..", "kb", "knowledge-base.json");
  kbCache = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
  kbLoadedAt = now;
  return kbCache;
}

function buildSystemPrompt(kb) {
  return `You are the AI guide for Fuji Soul Tours, a private Mt. Fuji cultural tour from Shin-Fuji Station in Japan. You answer questions about the tour in a friendly, helpful, and concise manner. Use only English.

IMPORTANT RULES:
1. ONLY answer based on the knowledge base provided below. Do NOT make up information.
2. If you can confidently answer from the KB, respond naturally and helpfully.
3. If the question is NOT covered by the KB or you're unsure, you MUST respond with EXACTLY this JSON format (no other text):
{"cannotAnswer": true, "topic": "<brief topic of the question>", "suggestedMessage": "<a polite message the user can copy-paste to send to Fuji Soul Tours asking about their specific question>"}
4. Keep answers concise but warm. Use bullet points for lists.
5. When mentioning prices, always note that activity costs at stops are paid separately on-site.
6. When users ask about booking or want to book, direct them to book at: https://www.fujisoultours.com/#booking — say something like "You can check availability and book here: [Book Now](https://www.fujisoultours.com/#booking)". Do NOT tell them to "reach out" or "contact us" for booking.
7. Encourage booking when appropriate but don't be pushy.

KNOWLEDGE BASE:
${JSON.stringify(kb, null, 0)}`;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: "Message too long (max 1000 chars)" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI service not configured" });
  }

  try {
    const kb = loadKB();
    const client = new Anthropic({ apiKey });

    const messages = [];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    messages.push({ role: "user", content: message.trim() });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: buildSystemPrompt(kb),
      messages,
    });

    const reply = response.content[0].text;

    let cannotAnswer = false;
    let contactData = null;

    try {
      const parsed = JSON.parse(reply);
      if (parsed.cannotAnswer) {
        cannotAnswer = true;
        contactData = {
          topic: parsed.topic,
          suggestedMessage: parsed.suggestedMessage,
          contacts: {
            email: kb.contact.email,
            instagram: kb.contact.instagram,
            whatsapp: kb.contact.whatsapp,
          },
        };
      }
    } catch {
      // Normal text response
    }

    return res.status(200).json({
      reply: cannotAnswer ? null : reply,
      cannotAnswer,
      contactData,
    });
  } catch (err) {
    console.error("Chat API error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
