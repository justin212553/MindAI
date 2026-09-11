// api/ask.js
// Vercel serverless function (Node.js runtime). Lets the user ask a
// free-form question "from" a specific mind-map node, using that node's
// context (breadcrumb, summary, memo). One forced function-call: answer +
// extract any nodeworthy facts from that answer, in a single request.
//
// No web search grounding here on purpose — it needs a paid tier on
// current Gemini models (2.5 support has ended, 3.x has no free grounding
// quota), so answers are limited to the model's own training knowledge.
// Fine for a prototype; swap back in if/when a grounding-capable free tier
// is available again.

const { GEMINI_API_BASE, FUNCTION_DECLARATION, SYSTEM_PROMPT } = require('./ask.constants');

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
        'GEMINI_MODEL is not set. Put a current Gemini model id (check ai.google.dev for the latest slug) in your environment variables.',
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
  const { context, question } = body || {};

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'question is required.' });
    return;
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            { role: 'user', parts: [{ text: `CONTEXT:\n${context || '(없음)'}\n\nQUESTION:\n${question}` }] },
          ],
          tools: [{ function_declarations: [FUNCTION_DECLARATION] }],
          tool_config: {
            function_calling_config: { mode: 'ANY', allowed_function_names: ['answer_question'] },
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

    const answer = functionCall.args?.answer;
    if (!answer) {
      res.status(502).json({ error: 'Gemini returned no answer text.' });
      return;
    }
    const extractedNodes = Array.isArray(functionCall.args?.extracted_nodes)
      ? functionCall.args.extracted_nodes.filter((s) => typeof s === 'string' && s.trim())
      : [];

    res.status(200).json({ answer, extractedNodes });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
