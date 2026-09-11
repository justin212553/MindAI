// mindmap/core.js — thin wrapper around the globally-loaded `markmap`
// library (markmap-lib + markmap-view, loaded as plain <script> tags before
// this module in index.html).

import { buildOutlineForMarkmap } from './outline.js';

const transformer = new markmap.Transformer();

let mm = null; // markmap.Markmap instance, created once and reused
let currentBoard = null; // the board most recently passed to render()

// markmap only gives its color function the transformed tree node (which
// carries the rendered HTML in .content, not our board data). We embedded
// data-nid on every node's <span> specifically so we could pull the id back
// out here and look up a per-node color override; nodes without one fall
// back to markmap's own automatic (path-hashed) coloring.
function colorForNode(node) {
  const match = /data-nid="([^"]+)"/.exec(node.content || '');
  const nid = match && match[1];
  const boardNode = nid && currentBoard && currentBoard.nodes[nid];
  if (boardNode && boardNode.color) return boardNode.color;
  return markmap.defaultColorFn(String((node.state && node.state.path) || ''));
}

// duration: 0 — markmap's enter/exit transition briefly keeps both the old
// and new version of a changed node in the DOM at once (one fading out while
// the other fades in). Our overlay/edit-in-place code looks nodes up by
// data-nid and expects exactly one match, so animations are disabled here in
// favor of correctness. Re-enable only after teaching nodeElement() to
// prefer the entering (not exiting) element.
export function initCore(svgEl) {
  mm = markmap.Markmap.create(svgEl, {
    // autoFit: false — markmap calls fit() on every internal re-render when
    // this is true, including its own built-in click-to-fold/unfold. That
    // reset the user's zoom/pan just from collapsing a branch. We only want
    // a fit on our own terms (initial load, board switch), which render()
    // below already does explicitly via mm.fit().
    autoFit: false,
    duration: 0,
    // markmap's defaults (spacingVertical: 5, spacingHorizontal: 80,
    // nodeMinHeight: 16, paddingX: 8) pack nodes tightly enough that
    // sibling branches visually run into each other. Give everything more
    // breathing room.
    spacingVertical: 30,
    spacingHorizontal: 110,
    nodeMinHeight: 22,
    paddingX: 12,
    color: colorForNode,
  });
}

export async function render(board, { fit = false } = {}) {
  currentBoard = board;
  const outline = buildOutlineForMarkmap(board);
  const { root } = transformer.transform(outline);
  await mm.setData(root);
  if (fit) await mm.fit();
}
