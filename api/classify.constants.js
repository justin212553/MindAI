// api/classify.constants.js — fixed configuration for the classify
// endpoint: the Gemini function-calling schema and the system prompt. None
// of this changes at request time; it's split out so classify.js only
// contains request handling.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const FUNCTION_DECLARATION = {
  name: 'place_item',
  description:
    'Create a new mind-map node for this item and decide which existing node it should be attached under.',
  parameters: {
    type: 'OBJECT',
    properties: {
      parent_id: {
        type: 'STRING',
        description:
          "The id of the existing node this new node should be created under. Use 'root' for a new top-level node.",
      },
      label: {
        type: 'STRING',
        description: 'A short 2-5 word label for the new node.',
      },
      summary: {
        type: 'STRING',
        description: '1-2 sentence summary of the item, in the node\'s own words.',
      },
    },
    required: ['parent_id', 'label'],
  },
};

const SYSTEM_PROMPT = `You are the placement engine behind a personal brainstorming mind-map tool.
You will be given the CURRENT MIND MAP as an indented outline, where each line looks like:
[id] label — summary
and a NEW ITEM the user just typed. The item can be literally anything: a research idea, a
half-formed thought, a to-do, a shopping item, a random note. There is no fixed domain.

Every new item becomes its own new node in the tree — you never fold or merge an item into
an existing node. Your only job is to decide, for this new node:
- parent_id: which existing node it should be created under. Prefer going deeper into an
  existing branch that already covers this topic over creating another top-level node. Only
  use "root" when the item doesn't fit any existing branch.
- label: a short 2-5 word label for the new node.
- summary: a 1-2 sentence summary of the item, in the node's own words.

Always call the place_item function with your decision. Never respond in plain text.`;

module.exports = { GEMINI_API_BASE, FUNCTION_DECLARATION, SYSTEM_PROMPT };
