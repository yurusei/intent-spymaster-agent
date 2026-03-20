require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { buildIntentPrompt, parseIntentResponse } = require("./prompts/intent-analysis");

const app = express();
app.use(cors());
app.use(express.json());

// Serve React build in production
app.use(express.static(path.join(__dirname, "client", "dist")));

// ─── Serper Search ────────────────────────────────────────────────────────────

const SERPER_API = "https://google.serper.dev/search";

/**
 * Run a single Serper query and return title+snippet pairs.
 */
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

/**
 * Run all 5 source queries in parallel and collect up to 15 snippets total.
 */
async function gatherSnippets(topic, keyword) {
  const queries = [
    { source: "Reddit",    query: `site:reddit.com "${topic}" "${keyword}" B2B OR software OR tool` },
    { source: "G2",        query: `site:g2.com/reviews "${topic}" "${keyword}"` },
    { source: "Capterra",  query: `site:capterra.com "${topic}" "${keyword}"` },
    { source: "Trustpilot",query: `site:trustpilot.com "${topic}" "${keyword}"` },
    { source: "Forum",     query: `"${topic}" "${keyword}" community OR forum questions pain points` },
  ];

  const results = await Promise.all(
    queries.map(({ source, query }) =>
      serperSearch(query, 3).then((snippets) =>
        snippets.map((s) => ({ ...s, source }))
      )
    )
  );

  // Flatten and cap at 15
  return results.flat().slice(0, 15);
}

// ─── AI Provider Calls ────────────────────────────────────────────────────────

async function callAnthropic(prompt) {
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
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callOpenAI(prompt) {
  const { default: fetch } = await import("node-fetch");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1024,
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
    // 1. Gather snippets from all sources in parallel
    const snippets = await gatherSnippets(topic, keyword);

    if (snippets.length === 0) {
      return res.status(422).json({ error: "No snippets found. Try a broader topic or keyword." });
    }

    // 2. Build the prompt
    const prompt = buildIntentPrompt(topic, keyword, snippets, audience);

    // 3. Call the selected AI provider
    let raw;
    if (provider === "openai") {
      raw = await callOpenAI(prompt);
    } else {
      raw = await callAnthropic(prompt);
    }

    // 4. Parse and return
    const signals = parseIntentResponse(raw);
    res.json({ signals, snippetCount: snippets.length });
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
