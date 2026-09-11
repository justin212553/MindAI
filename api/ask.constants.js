// api/ask.constants.js — fixed configuration for the "ask Gemini from a
// node" endpoint. Prototype-simple on purpose: one plain function-calling
// request, no web search grounding (grounding needs a paid tier / has no
// free quota on the currently available models — see ask.js).

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const FUNCTION_DECLARATION = {
  name: 'answer_question',
  description:
    'Answer the question and extract any concrete facts from the answer that are worth saving as their own mind-map nodes.',
  parameters: {
    type: 'OBJECT',
    properties: {
      answer: {
        type: 'STRING',
        description: 'A concise answer to the question, in the same language as the question.',
      },
      extracted_nodes: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description:
          'Short (2-8 word) labels, one per concrete fact/date/number in the answer worth its own node. Empty array if there\'s nothing concrete worth extracting.',
      },
    },
    required: ['answer', 'extracted_nodes'],
  },
};

const SYSTEM_PROMPT = `You are a helpful assistant embedded inside one node of a personal mind-map app.
You'll be given CONTEXT describing where this node sits in the map (a breadcrumb path, plus
the node's own summary and memo if any), and a QUESTION the user is asking about that topic.
Answer using your own knowledge only — you have no web access, so for anything time-sensitive
(current events, schedules, prices, anything that may have changed since your training) say
you're not sure rather than guessing. Then extract any concrete, discrete facts from your own
answer (dates, numbers, named specifics) that are worth saving as their own mind-map nodes;
skip vague or generic statements, and return an empty list if there's nothing concrete.
Always call answer_question.`;

module.exports = { GEMINI_API_BASE, FUNCTION_DECLARATION, SYSTEM_PROMPT };
