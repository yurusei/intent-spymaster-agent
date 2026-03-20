require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { buildIntentPrompt, parseIntentResponse } = require("./prompts/intent-analysis");
const { buildClientContextPrompt, parseClientContextResponse } = require("./prompts/client-context");

const app = express();
app.use(cors());
app.use(express.json());

// Serve React build in production
app.use(express.static(path.join(__dirname, "client", "dist")));

// ─── Website Scraper ──────────────────────────────────────────────────────────

/**
 * Extract meaningful text from raw HTML without any extra dependencies.
 * Targets: <title>, <meta description>, <h1-h3>, <p>, <li> — in that order.
 * Strips all remaining tags, collapses whitespace, and caps at 3000 chars.
 */
function extractTextFromHTML(html) {
  const get = (regex) => {
    const m = html.match(regex);
    return m ? m[1].replace(/<[^>]+>/g, " ").trim() : "";
  };

  const title       = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
                   || get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  const headings = [...(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10)
    .join(" · ");

  const paragraphs = [...(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").trim())
    .filter((t) => t.length > 40) // skip tiny/empty <p> tags
    .slice(0, 12)
    .join(" ");

  const listItems = [...(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").trim())
    .filter((t) => t.length > 20)
    .slice(0, 10)
    .join(" • ");

  const combined = [title, description, headings, paragraphs, listItems]
    .filter(Boolean)
    .join("\n");

  // Collapse whitespace and cap length
  return combined.replace(/\s+/g, " ").trim().slice(0, 3000);
}

/**
 * Fetch a URL and return cleaned text. Follows one redirect.
 * Returns null on any error so callers can degrade gracefully.
 */
async function fetchWebsiteText(url) {
  const { default: fetch } = await import("node-fetch");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntentSpymasterBot/1.0; +https://intentspymaster.app)",
        Accept: "text/html",
      },
      redirect: "follow",
      timeout: 8000,
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractTextFromHTML(html);
  } catch {
    return null;
  }
}

/**
 * Use the selected AI provider to extract purpose / personas / problems
 * from the scraped website text.
 * Returns null if text is empty or AI call fails.
 */
async function analyzeClientWebsite(websiteText, provider) {
  if (!websiteText) return null;
  try {
    const prompt = buildClientContextPrompt(websiteText);
    const raw = provider === "openai"
      ? await callOpenAI(prompt, 512)
      : await callAnthropic(prompt, 512);
    return parseClientContextResponse(raw);
  } catch {
    return null;
  }
}

// ─── Serper Search ────────────────────────────────────────────────────────────

const SERPER_API = "https://google.serper.dev/search";

async function serperSearch(query, numResults = 4) {
  const { default: fetch } = await import("node-fetch");
  try {
    const res = await fetch(SERPER_API, {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: numResults }),
    });
    const data = await res.json();
    return (data.organic || []).slice(0, numResults).map((r) => ({
      title: r.title || "",
      snippet: r.snippet || "",
    }));
  } catch {
    return [];
  }
}

async function gatherSnippets(topic, keyword) {
  const queries = [
    { source: "Reddit",     query: `site:reddit.com "${topic}" "${keyword}" B2B OR software OR tool` },
    { source: "G2",         query: `site:g2.com/reviews "${topic}" "${keyword}"` },
    { source: "Capterra",   query: `site:capterra.com "${topic}" "${keyword}"` },
    { source: "Trustpilot", query: `site:trustpilot.com "${topic}" "${keyword}"` },
    { source: "Forum",      query: `"${topic}" "${keyword}" community OR forum questions pain points` },
  ];

  const results = await Promise.all(
    queries.map(({ source, query }) =>
      serperSearch(query, 3).then((snippets) =>
        snippets.map((s) => ({ ...s, source }))
      )
    )
  );

  return results.flat().slice(0, 15);
}

// ─── AI Provider Calls ────────────────────────────────────────────────────────

async function callAnthropic(prompt, maxTokens = 1024) {
  const { default: fetch } = await import("node-fetch");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callOpenAI(prompt, maxTokens = 1024) {
  const { default: fetch } = await import("node-fetch");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// ─── Main Research Endpoint ───────────────────────────────────────────────────

app.post("/api/research", async (req, res) => {
  const { topic, keyword, audience, clientWebsite, provider = "anthropic" } = req.body;

  if (!topic || !keyword) {
    return res.status(400).json({ error: "topic and keyword are required" });
  }

  try {
    // 1. Fetch snippets AND scrape client website in parallel
    const [snippets, websiteText] = await Promise.all([
      gatherSnippets(topic, keyword),
      clientWebsite ? fetchWebsiteText(clientWebsite) : Promise.resolve(null),
    ]);

    if (snippets.length === 0) {
      return res.status(422).json({ error: "No snippets found. Try a broader topic or keyword." });
    }

    // 2. Analyse the client website (uses a small token budget, same provider)
    const clientContext = await analyzeClientWebsite(websiteText, provider);

    // 3. Build and run the intent analysis prompt
    const prompt = buildIntentPrompt(topic, keyword, snippets, audience, clientContext);
    const raw = provider === "openai"
      ? await callOpenAI(prompt)
      : await callAnthropic(prompt);

    // 4. Parse and return — include clientContext so the UI can display it
    const signals = parseIntentResponse(raw);
    res.json({ signals, snippetCount: snippets.length, clientContext });
  } catch (err) {
    console.error("Research error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Fallback to React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Intent Spymaster running on port ${PORT}`);
});
