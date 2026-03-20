/**
 * Client Context Prompt Engineering
 *
 * Extracts a compact understanding of who the client is from their homepage text.
 * Returns three fields used to contextualize intent research:
 *   - purpose:  what they do, what gap they fill, what makes them unique
 *   - personas: the main audiences / buyers they serve
 *   - problems: the pains and challenges they solve for those personas
 */

/**
 * Build the prompt that analyses scraped website text.
 * @param {string} websiteText - Cleaned text extracted from the client's homepage
 * @returns {string}
 */
function buildClientContextPrompt(websiteText) {
  return `You are a B2B positioning analyst. Read the website copy below and extract a concise understanding of this company.

Return ONLY a valid JSON object — no explanation, no markdown, no preamble.

Format:
{
  "purpose": "1–2 sentences: what they do, what gap they fill, what makes them unique",
  "personas": "1–2 sentences: who their main target audiences or buyers are",
  "problems": "1–2 sentences: the core pains or challenges they solve for those personas"
}

Rules:
- Be specific — avoid generic marketing filler like "we help businesses grow"
- If a field cannot be determined from the text, write "Not clear from website"
- Keep each field to 1–2 sentences maximum

Website copy:
${websiteText}`;
}

/**
 * Strip markdown fences and parse the JSON client context response.
 * @param {string} raw
 * @returns {{ purpose: string, personas: string, problems: string }}
 */
function parseClientContextResponse(raw) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

module.exports = { buildClientContextPrompt, parseClientContextResponse };
