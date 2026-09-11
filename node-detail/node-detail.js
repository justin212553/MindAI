// node-detail/node-detail.js — clicking a node (outside of link mode) opens
// a docked panel showing/editing its LLM-written summary and a freeform
// memo field, asking Gemini a question grounded in that node's context, and
// actions to scope new items to this node or delete it.

import { getActiveBoard, saveState } from '../state/store.js';
import { setScope } from '../node-scope/node-scope.js';
import { makeNode } from '../items/items.js';

// Shown in the color picker for a node that has no override yet — the
// app's own accent color, not meant to imply the node actually renders in
// blue (its real color comes from markmap's automatic per-node hash).
const DEFAULT_COLOR_SWATCH = '#6ea8fe';

let panel, labelEl, colorInput, colorResetBtn, summaryEl, memoEl, closeBtn, scopeBtn, deleteBtn;
let askToggle, askPanel, askQuestion, askSubmit, askStatus, askAnswer;
let currentNodeId = null;
let onDeletedCb = () => {};
let onNodesAddedCb = () => {};
let onColorChangedCb = () => {};

export function initNodeDetail({ onDeleted, onNodesAdded, onColorChanged } = {}) {
  onDeletedCb = onDeleted || (() => {});
  onNodesAddedCb = onNodesAdded || (() => {});
  onColorChangedCb = onColorChanged || (() => {});

  panel = document.getElementById('node-detail-panel');
  labelEl = document.getElementById('node-detail-label');
  colorInput = document.getElementById('node-detail-color');
  colorResetBtn = document.getElementById('node-detail-color-reset');
  summaryEl = document.getElementById('node-detail-summary');
  memoEl = document.getElementById('node-detail-memo');
  closeBtn = document.getElementById('node-detail-close');
  scopeBtn = document.getElementById('node-detail-scope-btn');
  deleteBtn = document.getElementById('node-detail-delete-btn');

  askToggle = document.getElementById('node-ask-toggle');
  askPanel = document.getElementById('node-ask-panel');
  askQuestion = document.getElementById('node-ask-question');
  askSubmit = document.getElementById('node-ask-submit');
  askStatus = document.getElementById('node-ask-status');
  askAnswer = document.getElementById('node-ask-answer');

  closeBtn.addEventListener('click', closeNodeDetail);

  colorInput.addEventListener('input', () => {
    withCurrentNode((node) => {
      node.color = colorInput.value;
    });
    onColorChangedCb();
  });
  colorResetBtn.addEventListener('click', () => {
    withCurrentNode((node) => {
      delete node.color;
    });
    colorInput.value = DEFAULT_COLOR_SWATCH;
    onColorChangedCb();
  });

  summaryEl.addEventListener('input', () => withCurrentNode((node) => {
    node.summary = summaryEl.value;
  }));
  memoEl.addEventListener('input', () => withCurrentNode((node) => {
    node.memo = memoEl.value;
  }));

  scopeBtn.addEventListener('click', () => {
    if (!currentNodeId) return;
    setScope(currentNodeId, labelEl.textContent);
    closeNodeDetail();
    document.getElementById('item-input').focus();
  });

  deleteBtn.addEventListener('click', () => {
    const board = getActiveBoard();
    const node = board && board.nodes[currentNodeId];
    if (!board || !node) return;
    if (!node.parentId) {
      alert('루트 노드는 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${node.label}" 노드와 하위 노드를 모두 삭제할까요?`)) return;

    const removedIds = deleteNodeCascade(board, currentNodeId);
    board.updatedAt = Date.now();
    saveState();
    closeNodeDetail();
    onDeletedCb(removedIds);
  });

  askToggle.addEventListener('click', () => {
    askPanel.hidden = !askPanel.hidden;
    if (!askPanel.hidden) askQuestion.focus();
  });
  askSubmit.addEventListener('click', handleAsk);
  askQuestion.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAsk();
    }
  });
}

function withCurrentNode(fn) {
  const board = getActiveBoard();
  const node = board && board.nodes[currentNodeId];
  if (!node) return;
  fn(node);
  board.updatedAt = Date.now();
  saveState();
}

function buildNodeContext(board, nodeId) {
  const crumbs = [];
  let cur = board.nodes[nodeId];
  while (cur) {
    crumbs.unshift(cur.label);
    cur = cur.parentId ? board.nodes[cur.parentId] : null;
  }
  const node = board.nodes[nodeId];
  const lines = [`경로: ${crumbs.join(' > ')}`];
  if (node.summary) lines.push(`요약: ${node.summary}`);
  if (node.memo) lines.push(`메모: ${node.memo}`);
  return lines.join('\n');
}

async function handleAsk() {
  const board = getActiveBoard();
  const node = board && board.nodes[currentNodeId];
  const question = askQuestion.value.trim();
  if (!board || !node || !question) return;

  askSubmit.disabled = true;
  askAnswer.hidden = true;
  askStatus.textContent = 'Gemini에게 물어보는 중...';

  try {
    const context = buildNodeContext(board, currentNodeId);
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context, question }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '질문 실패');

    askAnswer.textContent = data.answer;
    askAnswer.hidden = false;
    askQuestion.value = '';

    const extracted = Array.isArray(data.extractedNodes) ? data.extractedNodes : [];
    if (extracted.length) {
      extracted.forEach((label) => {
        const child = makeNode(label, currentNodeId);
        board.nodes[child.id] = child;
        node.childIds.push(child.id);
      });
      board.updatedAt = Date.now();
      saveState();
      askStatus.textContent = `답변에서 ${extracted.length}개 노드를 추가했습니다.`;
      onNodesAddedCb();
    } else {
      askStatus.textContent = '';
    }
  } catch (err) {
    console.error(err);
    askStatus.textContent = '오류: ' + err.message;
  } finally {
    askSubmit.disabled = false;
  }
}

function collectSubtreeIds(board, nodeId) {
  const ids = [nodeId];
  const node = board.nodes[nodeId];
  (node.childIds || []).forEach((cid) => ids.push(...collectSubtreeIds(board, cid)));
  return ids;
}

function deleteNodeCascade(board, nodeId) {
  const node = board.nodes[nodeId];
  const removedIds = collectSubtreeIds(board, nodeId);
  const parent = board.nodes[node.parentId];
  parent.childIds = parent.childIds.filter((id) => id !== nodeId);
  removedIds.forEach((id) => delete board.nodes[id]);
  board.links = board.links.filter(([a, b]) => !removedIds.includes(a) && !removedIds.includes(b));
  return removedIds;
}

export function toggleNodeDetail(id) {
  if (!panel.hidden && currentNodeId === id) {
    closeNodeDetail();
    return;
  }
  const board = getActiveBoard();
  const node = board && board.nodes[id];
  if (!node) return;

  currentNodeId = id;
  labelEl.textContent = node.label;
  colorInput.value = node.color || DEFAULT_COLOR_SWATCH;
  summaryEl.value = node.summary || '';
  memoEl.value = node.memo || '';
  deleteBtn.hidden = !node.parentId;

  askPanel.hidden = true;
  askQuestion.value = '';
  askAnswer.hidden = true;
  askAnswer.textContent = '';
  askStatus.textContent = '';

  panel.hidden = false;
}

export function closeNodeDetail() {
  if (panel) panel.hidden = true;
  currentNodeId = null;
}
