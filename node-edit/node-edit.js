// node-edit/node-edit.js — double-click-to-rename a node. Returns a handler
// meant to be passed as Mindmap's onNodeDblClick.

import { getActiveBoard, saveState } from '../state/store.js';
import { openInlineEditor } from '../mindmap/index.js';

export function makeNodeDblClickHandler({ onEdited }) {
  return function onNodeDblClick(id) {
    const board = getActiveBoard();
    if (!board) return;
    const node = board.nodes[id];
    if (!node) return;
    openInlineEditor(id, node.label, (newLabel) => {
      node.label = newLabel;
      board.updatedAt = Date.now();
      saveState();
      onEdited();
    });
  };
}
