// mindmap/outline.js — turns a board's node tree into the two text outlines
// the rest of the app needs: one for markmap to render, one for the LLM.

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Outline used to actually render the tree (markmap markdown). Each node's
// label is wrapped in a <span data-nid="..."> so we can find its rendered
// DOM element afterwards for click/dblclick handling and the link overlay.
// A node's summary/memo aren't rendered into the tree itself — they show up
// in the detail panel (see node-detail/) when the node is clicked.
export function buildOutlineForMarkmap(board) {
  const lines = [];
  function walk(id, depth) {
    const node = board.nodes[id];
    if (!node) return;
    const indent = '  '.repeat(depth);
    const label = escapeHtml(node.label || '(제목 없음)');
    lines.push(`${indent}- <span data-nid="${node.id}">${label}</span>`);
    (node.childIds || []).forEach((cid) => walk(cid, depth + 1));
  }
  walk(board.rootId, 0);
  return lines.join('\n') || '- <span data-nid="root">Root</span>';
}

// Outline sent to the LLM placement endpoint: plain text, ids visible,
// summaries included so the model has enough context to decide placement.
export function buildOutlineForLLM(board) {
  const lines = [];
  function walk(id, depth) {
    const node = board.nodes[id];
    if (!node) return;
    const indent = '  '.repeat(depth);
    const summary = node.summary ? ` — ${node.summary}` : '';
    lines.push(`${indent}- [${node.id}] ${node.label}${summary}`);
    (node.childIds || []).forEach((cid) => walk(cid, depth + 1));
  }
  walk(board.rootId, 0);
  return lines.join('\n');
}
