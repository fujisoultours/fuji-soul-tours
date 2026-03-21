const fs = require("fs");
const path = require("path");

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const SYNC_SECRET = process.env.INSTAGRAM_SYNC_SECRET;

async function fetchInstagramComments() {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID) {
    throw new Error("Instagram API credentials not configured");
  }

  const mediaRes = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/media?fields=id,caption,timestamp&limit=50&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  const mediaData = await mediaRes.json();

  if (mediaData.error) {
    throw new Error(`Instagram API error: ${mediaData.error.message}`);
  }

  const qaPairs = [];

  for (const post of mediaData.data || []) {
    const commentsRes = await fetch(
      `https://graph.facebook.com/v19.0/${post.id}/comments?fields=id,text,timestamp,replies{text,timestamp}&limit=100&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const commentsData = await commentsRes.json();

    for (const comment of commentsData.data || []) {
      if (comment.replies && comment.replies.data && comment.replies.data.length > 0) {
        const reply = comment.replies.data[0];
        qaPairs.push({
          source: "instagram_comment",
          question: comment.text,
          answer: reply.text,
          postId: post.id,
          timestamp: comment.timestamp,
        });
      }
    }
  }

  return qaPairs;
}

async function fetchInstagramConversations() {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID) {
    throw new Error("Instagram API credentials not configured");
  }

  const convRes = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ID}/conversations?platform=instagram&fields=id,messages{message,from,created_time}&limit=50&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  const convData = await convRes.json();

  if (convData.error) {
    throw new Error(`Instagram DM API error: ${convData.error.message}`);
  }

  const qaPairs = [];

  for (const conv of convData.data || []) {
    const msgs = conv.messages?.data || [];
    for (let i = 0; i < msgs.length - 1; i++) {
      const current = msgs[i];
      const next = msgs[i + 1];
      if (next.from?.id !== INSTAGRAM_BUSINESS_ID && current.from?.id === INSTAGRAM_BUSINESS_ID) {
        qaPairs.push({
          source: "instagram_dm",
          question: next.message,
          answer: current.message,
          timestamp: next.created_time,
        });
      }
    }
  }

  return qaPairs;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { secret } = req.body;
  if (!SYNC_SECRET || secret !== SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID) {
    return res.status(500).json({
      error: "Instagram API not configured",
      setup: {
        steps: [
          "1. Create a Facebook App at developers.facebook.com",
          "2. Add Instagram Graph API product",
          "3. Connect your Instagram Business account",
          "4. Generate a long-lived access token",
          "5. Set INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID, and INSTAGRAM_SYNC_SECRET in Vercel env vars",
        ],
      },
    });
  }

  try {
    const [comments, dms] = await Promise.all([
      fetchInstagramComments(),
      fetchInstagramConversations(),
    ]);

    const allPairs = [...comments, ...dms];

    const kbPath = path.join(__dirname, "..", "kb", "knowledge-base.json");
    const kb = JSON.parse(fs.readFileSync(kbPath, "utf-8"));

    kb.instagramFAQ = allPairs;
    kb.lastUpdated = new Date().toISOString().split("T")[0];

    fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2));

    return res.status(200).json({
      success: true,
      synced: allPairs.length,
      comments: comments.length,
      dms: dms.length,
    });
  } catch (err) {
    console.error("Instagram sync error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
