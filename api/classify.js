// api/classify.js
// Vercel serverless function (Node.js runtime). Decides where a new
// freeform item belongs in the user's mind-map tree, using Gemini's
// forced function-calling to get a structured decision back. The API key
// stays server-side here and is never sent to the browser.

const { GEMINI_API_BASE, FUNCTION_DECLARATION, SYSTEM_PROMPT } = require('./classify.constants');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) {
    res.status(500).json({
      error:
        'GEMINI_MODEL is not set. Put a current Gemini model id (check ai.google.dev for the latest slug, e.g. a "flash" model for the lowest cost) in your environment variables.',
    });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { outline, newItem } = body || {};

  if (!newItem || typeof newItem !== 'string') {
    res.status(400).json({ error: 'newItem is required.' });
    return;
  }

  const userMessage = `CURRENT MIND MAP:\n${outline || '- [root] Root — (empty)'}\n\nNEW ITEM:\n${newItem}`;

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          tools: [{ function_declarations: [FUNCTION_DECLARATION] }],
          tool_config: {
            function_calling_config: { mode: 'ANY', allowed_function_names: ['place_item'] },
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({ error: `Gemini API error (${response.status}): ${text}` });
      return;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const functionCall = parts.find((part) => part.functionCall)?.functionCall;
    if (!functionCall) {
      res.status(502).json({ error: 'Model did not return a function call.' });
      return;
    }

    const decision = functionCall.args || {};

    // Defensive fallbacks: never let a malformed model response crash the
    // client — worst case, file the item as a new top-level node.
    if (!decision.parent_id) decision.parent_id = 'root';
    if (!decision.label) decision.label = newItem.slice(0, 24);
    if (!decision.summary) decision.summary = newItem.slice(0, 140);

    res.status(200).json(decision);
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
