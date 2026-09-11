// state/store.js — the single source of truth for app state (boards, active
// board, localStorage persistence). No DOM access here; feature modules call
// into this and re-render themselves afterwards.

const STORAGE_KEY = 'mindmap_brainstorm_state_v1';

// Older saves used a `node.items` array (raw texts silently merged into a
// node, never shown anywhere). That concept is gone — every item is now its
// own node — but we still fold any old `items` into a `memo` string so
// previously-saved or previously-exported boards don't lose content.
function migrateNode(node) {
  if (typeof node.memo !== 'string') {
    node.memo = Array.isArray(node.items)
      ? node.items.filter((t) => t && t !== node.label).join('\n')
      : '';
  }
  delete node.items;
  return node;
}

function migrateBoard(board) {
  Object.values(board.nodes || {}).forEach(migrateNode);
  return board;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      (parsed.boards || []).forEach(migrateBoard);
      return parsed;
    }
  } catch (e) {
    console.warn('상태 불러오기 실패', e);
  }
  return { activeBoardId: null, boards: [] };
}

const state = loadState();

export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return 'n' + Math.random().toString(36).slice(2, 10);
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getState() {
  return state;
}

export function newBoard(title) {
  const rootId = 'root';
  const finalTitle = title || '새 마인드맵';
  const board = {
    id: uid(),
    title: finalTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        label: finalTitle,
        summary: '',
        memo: '',
        parentId: null,
        childIds: [],
      },
    },
    links: [],
  };
  state.boards.push(board);
  state.activeBoardId = board.id;
  saveState();
  return board;
}

export function getActiveBoard() {
  return state.boards.find((b) => b.id === state.activeBoardId) || null;
}

export function setActiveBoard(id) {
  state.activeBoardId = id;
  saveState();
}

export function renameBoard(id, title) {
  const board = state.boards.find((b) => b.id === id);
  if (!board) return;
  const finalTitle = title.trim();
  if (!finalTitle) return; // keep the old title rather than allow a blank one
  board.title = finalTitle;
  board.updatedAt = Date.now();
  saveState();
}

export function deleteBoard(id) {
  state.boards = state.boards.filter((b) => b.id !== id);
  if (state.activeBoardId === id) {
    state.activeBoardId = state.boards.length ? state.boards[0].id : null;
  }
  saveState();
}

export function addImportedBoards(boards) {
  boards.forEach((b) => {
    b.id = uid(); // avoid colliding with existing board ids
    migrateBoard(b);
    state.boards.push(b);
  });
  if (!state.activeBoardId && state.boards.length) state.activeBoardId = state.boards[0].id;
  saveState();
}

// Adds a single fully-formed board (e.g. one built from a parsed markdown
// outline) and switches to it immediately — unlike addImportedBoards, which
// may bring in several boards from a JSON backup without necessarily
// wanting to jump to any of them.
export function importBoard(board) {
  board.id = uid();
  state.boards.push(board);
  state.activeBoardId = board.id;
  saveState();
  return board;
}
