// link-mode/link-mode.js — "connect two nodes by clicking them in order"
// mode. handleNodeClick is meant to be passed as Mindmap's onNodeClick.

import { getActiveBoard, saveState } from '../state/store.js';
import { highlightNode } from '../mindmap/index.js';

let linkModeActive = false;
let linkModeFirstId = null;

export function initLinkMode({ setStatus }) {
  document.getElementById('link-mode-btn').addEventListener('click', () => toggleLinkMode(setStatus));
}

function toggleLinkMode(setStatus) {
  linkModeActive = !linkModeActive;
  linkModeFirstId = null;
  const btn = document.getElementById('link-mode-btn');
  btn.classList.toggle('active', linkModeActive);
  setStatus(linkModeActive ? '연결 모드: 노드 두 개를 순서대로 클릭하세요 (다시 누르면 종료)' : '');
}

export function isLinkModeActive() {
  return linkModeActive;
}

export function handleNodeClick(id) {
  if (!linkModeActive) return;
  const board = getActiveBoard();
  if (!board) return;
  if (!linkModeFirstId) {
    linkModeFirstId = id;
    highlightNode(id, true);
    return;
  }
  if (linkModeFirstId === id) {
    highlightNode(id, false);
    linkModeFirstId = null;
    return;
  }
  const exists = board.links.some(
    ([a, b]) => (a === linkModeFirstId && b === id) || (a === id && b === linkModeFirstId)
  );
  if (!exists) board.links.push([linkModeFirstId, id]);
  highlightNode(linkModeFirstId, false);
  linkModeFirstId = null;
  saveState();
}
