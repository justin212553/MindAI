// markdown-import/parser.js — turns a markdown outline (headings + nested
// bullets) into a board. Pure functions, no DOM: this is what lets the
// "paste an AI conversation summary" import work without any backend call
// at all — it's plain text parsing, not an LLM decision.

import { makeNode } from '../items/items.js';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^(\s*)[-*+]\s+(.*)$/;

function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function newAstNode(label) {
  return { label: stripInlineMarkdown(label), summary: '', children: [] };
}

// Parses markdown text into a single recursive tree:
// { label, summary, children: [...] }
// Headings (#, ##, ...) set tree depth directly (H1 = root, H2 = depth 1,
// ...). Bullets nest under the nearest enclosing heading, with every 2
// leading spaces counting as one more level of depth. Plain text lines
// right after a heading (before the next heading/bullet) become that
// heading's summary.
export function parseMarkdownOutline(text) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');

  const root = newAstNode('제목 없음');
  let rootAssigned = false;
  // headingStack[i] = the heading node at depth i (0 = root). Only touched
  // by heading lines.
  const headingStack = [root];
  // bulletStack[i] = the bullet node at bullet-nesting depth i, relative to
  // the current heading. Reset every time a new heading line appears, so a
  // sibling bullet at the same indent doesn't get nested under the
  // previous one.
  let bulletStack = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const label = headingMatch[2];
      bulletStack = [];
      if (!rootAssigned) {
        // The first heading of the document (of any level) names the board.
        root.label = stripInlineMarkdown(label);
        rootAssigned = true;
        continue;
      }
      const depth = level - 1; // H1 -> 0 (root), H2 -> 1, ...
      const node = newAstNode(label);
      const parent = headingStack[Math.max(depth - 1, 0)] || root;
      parent.children.push(node);
      headingStack.length = Math.max(depth, 1);
      headingStack[depth] = node;
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      const indent = bulletMatch[1].replace(/\t/g, '  ').length;
      const bulletDepth = Math.floor(indent / 2);
      const node = newAstNode(bulletMatch[2]);
      const parent = bulletDepth > 0 ? bulletStack[bulletDepth - 1] : headingStack[headingStack.length - 1];
      (parent || root).children.push(node);
      bulletStack.length = bulletDepth;
      bulletStack[bulletDepth] = node;
      continue;
    }

    // Plain paragraph text: append to the most recently opened node's
    // summary (heading or bullet), so descriptive lines aren't dropped.
    const current = bulletStack[bulletStack.length - 1] || headingStack[headingStack.length - 1] || root;
    const paragraph = stripInlineMarkdown(line);
    current.summary = current.summary ? `${current.summary} ${paragraph}` : paragraph;
  }

  return root;
}

// Converts the parsed AST into a full board object, ready for
// state/store.js's importBoard(). Uses items.js's makeNode so the node
// shape matches every other node created in the app.
export function treeToBoard(tree) {
  const rootId = 'root';
  const nodes = {
    [rootId]: {
      id: rootId,
      label: tree.label || '제목 없음',
      summary: tree.summary || '',
      memo: '',
      parentId: null,
      childIds: [],
    },
  };

  function walk(astNode, parentId) {
    (astNode.children || []).forEach((child) => {
      const node = makeNode(child.label, parentId, child.summary, '');
      nodes[node.id] = node;
      nodes[parentId].childIds.push(node.id);
      walk(child, node.id);
    });
  }
  walk(tree, rootId);

  // No `id` here — state/store.js's importBoard() assigns it (it always
  // regenerates ids for any board it takes in, same as addImportedBoards).
  return {
    title: nodes[rootId].label,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rootId,
    nodes,
    links: [],
  };
}
