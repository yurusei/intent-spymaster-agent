/**
 * Intent Analysis Prompt Engineering
 *
 * Master prompt for extracting B2B intent signals from search snippets.
 * Model-agnostic — works with both Anthropic (Claude) and OpenAI (GPT-4o).
 */

/**
 * Build the intent analysis prompt.
 * @param {string} topic - The topic or industry being researched
 * @param {string} keyword - The keyword used in the research
 * @param {Array<{title: string, snippet: string, source: string}>} snippets - Search result snippets
 * @param {string} [audience] - Optional target audience persona (e.g. "RevOps leaders")
 * @returns {string} The fully populated prompt
 */
function buildIntentPrompt(topic, keyword, snippets, audience = "") {
  const audienceClause = audience
    ? `\nAudience filter: Focus signals relevant to "${audience}". Deprioritize signals not applicable to this persona.`
    : "";

  const formattedSnippets = snippets
    .map((s, i) => `[${i + 1}] Source: ${s.source}\nTitle: ${s.title}\nSnippet: ${s.snippet}`)
    .join("\n\n");

  return `You are a B2B content strategist helping writers understand real audience intent.

Below are search result snippets about "${topic}" (keyword: "${keyword}"). Your job is to extract genuine user intent signals that a writer could use to create better B2B content.${audienceClause}

Rules:
- Only extract signals that are present in the snippets. Do not invent or infer beyond what is written.
- Focus on signals relevant to a B2B audience (buyers, practitioners, decision-makers).
- Skip consumer-only content, spam, or irrelevant results.
- Write each signal as a clear, natural statement or question (1–2 sentences max).
- Return a maximum of 15 signals total.

Assign each signal one category:
- Question — something users are actively trying to figure out
- Pain Point — a frustration, failure, or unmet need
- Comparison — evaluating options, switching decisions, or vendor comparisons
- Anecdote — a personal story or real-world use case
- Feature Request — something users wish a product or solution would do

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.

Format:
[
  {
    "signal": "...",
    "category": "Pain Point",
    "source": "Reddit"
  }
]

Snippets:
${formattedSnippets}`;
}

/**
 * Strip accidental markdown fences and parse the JSON response.
 * @param {string} raw - Raw string response from the AI model
 * @returns {Array} Parsed array of intent signals
 */
function parseIntentResponse(raw) {
  // Strip markdown fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

module.exports = { buildIntentPrompt, parseIntentResponse };
