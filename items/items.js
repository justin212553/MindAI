// items/items.js — the "throw anything at the input bar" flow.
//
// Every submitted item always becomes its own new node — there is no
// silent "merge into an existing node" path. /api/classify's only job is
// to pick the best existing node to attach the new one under (and write a
// short label + summary for it); the user can then fill in more detail via
// the node's memo field (see node-detail/).
//
// If a scope is set (see node-scope/ — the "📍 여기에 추가" button in the
// detail panel), the classify call is skipped entirely: the new node goes
// straight under the scoped node, using the typed text as its label
// verbatim. The user has already said exactly where it belongs.
//
// Two input modes:
// - single: the whole text goes through /api/classify once (unless scoped).
// - bulk: the user explicitly writes a parent line followed by one child
//   per line. Only the parent line goes through /api/classify (one call,
//   skipped too if scoped); the child lines are always created as new
//   nodes directly under it. Splitting a single item into several nodes is
//   not something we trust the model to infer — the user states the
//   grouping directly instead.

import { getActiveBoard, saveState, uid } from '../state/store.js';
import { buildOutlineForLLM } from '../mindmap/index.js';
import { getScopeNodeId } from '../node-scope/node-scope.js';

let bulkModeActive = false;

export function initItems({ onItemAdded, setStatus }) {
  const input = document.getElementById('item-input');
  const bulkInput = document.getElementById('item-bulk-input');
  const bulkModeBtn = document.getElementById('bulk-mode-btn');
  const submitBtn = document.getElementById('submit-btn');

  function setBulkMode(active) {
    bulkModeActive = active;
    bulkModeBtn.classList.toggle('active', bulkModeActive);
    input.hidden = bulkModeActive;
    bulkInput.hidden = !bulkModeActive;
    (bulkModeActive ? bulkInput : input).focus();
  }

  bulkModeBtn.addEventListener('click', () => setBulkMode(!bulkModeActive));

  async function handleSubmit() {
    if (bulkModeActive) {
      const lines = bulkInput.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      bulkInput.value = '';
      if (lines.length <= 1) {
        await addItem(lines[0] || '', { onItemAdded, setStatus, inputEl: bulkInput });
      } else {
        const [parentText, ...childTexts] = lines;
        await addBulkItems(parentText, childTexts, { onItemAdded, setStatus, inputEl: bulkInput });
      }
      bulkInput.focus();
    } else {
      const text = input.value;
      input.value = '';
      await addItem(text, { onItemAdded, setStatus, inputEl: input });
    }
  }

  submitBtn.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (e) => {
    // e.isComposing / keyCode 229 guards against IME (Korean, Japanese,
    // Chinese) composition: the Enter that ends a still-forming syllable
    // fires as a real 'Enter' keydown too, and without this check it would
    // submit before the last character has landed in input.value.
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) handleSubmit();
  });
  // Enter inserts a newline (another bullet) like a normal textarea;
  // Ctrl/Cmd+Enter submits the whole list.
  bulkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  });
}

export function makeNode(label, parentId, summary = '', memo = '') {
  return {
    id: uid(),
    label,
    summary,
    memo,
    parentId,
    childIds: [],
  };
}

async function classifyPlacement(board, text) {
  const outline = buildOutlineForLLM(board);
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ outline, newItem: text }),
  });
  const decision = await res.json();
  if (!res.ok) throw new Error(decision.error || '분류 실패');
  return decision;
}

// Decides where a new top-level node (a single item, or a bulk batch's
// parent line) should attach. Scoped: purely local, no network call.
// Unscoped: asks /api/classify.
async function resolveNewNode(board, text) {
  const scopeId = getScopeNodeId();
  if (scopeId && board.nodes[scopeId]) {
    return { parentId: scopeId, label: text.slice(0, 40), summary: '' };
  }
  const decision = await classifyPlacement(board, text);
  const parentId = board.nodes[decision.parent_id] ? decision.parent_id : board.rootId;
  return { parentId, label: decision.label || text.slice(0, 24), summary: decision.summary };
}

async function addItem(text, { onItemAdded, setStatus, inputEl }) {
  const board = getActiveBoard();
  if (!board || !text.trim()) return;
  setStatus('정리하는 중...');
  document.getElementById('submit-btn').disabled = true;
  try {
    const { parentId, label, summary } = await resolveNewNode(board, text);
    const node = makeNode(label, parentId, summary, text);
    board.nodes[node.id] = node;
    board.nodes[parentId].childIds.push(node.id);

    board.updatedAt = Date.now();
    saveState();
    await onItemAdded();
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('오류: ', true);
    if (inputEl && !inputEl.value) inputEl.value = text;
  } finally {
    document.getElementById('submit-btn').disabled = false;
  }
}

async function addBulkItems(parentText, childTexts, { onItemAdded, setStatus, inputEl }) {
  const board = getActiveBoard();
  if (!board || !parentText.trim()) return;
  setStatus('정리하는 중...');
  document.getElementById('submit-btn').disabled = true;
  try {
    const { parentId: grandparentId, label, summary } = await resolveNewNode(board, parentText);
    const parentNode = makeNode(label, grandparentId, summary, parentText);
    board.nodes[parentNode.id] = parentNode;
    board.nodes[grandparentId].childIds.push(parentNode.id);

    childTexts.forEach((childText) => {
      const child = makeNode(childText, parentNode.id, '', childText);
      board.nodes[child.id] = child;
      parentNode.childIds.push(child.id);
    });

    board.updatedAt = Date.now();
    saveState();
    await onItemAdded();
    setStatus(`${childTexts.length + 1}개 노드를 추가했습니다`);
  } catch (err) {
    console.error(err);
    setStatus('오류: ', true);
    if (inputEl && !inputEl.value) inputEl.value = [parentText, ...childTexts].join('\n');
  } finally {
    document.getElementById('submit-btn').disabled = false;
  }
}
