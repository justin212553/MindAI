// sidebar/sidebar.js — board list UI: render, switch, delete, new/collapse
// buttons. Owns its own DOM wiring; notifies the caller via onBoardChange
// whenever the active board changes so the canvas can re-render.

import { getState, newBoard, setActiveBoard, deleteBoard } from '../state/store.js';

let onBoardChangeCb = () => {};
let newBoardBtn, newBoardInput;

export function initSidebar({ onBoardChange }) {
  onBoardChangeCb = onBoardChange || (() => {});

  newBoardBtn = document.getElementById('new-board-btn');
  newBoardInput = document.getElementById('new-board-input');

  newBoardBtn.addEventListener('click', startNewBoard);
  newBoardInput.addEventListener('blur', cancelNewBoard);
  newBoardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      commitNewBoard();
    } else if (e.key === 'Escape') {
      newBoardInput.blur();
    }
  });

  document.getElementById('collapse-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  renderSidebar();
}

// Swaps the "+ 새 마인드맵" button for an inline text input in the same
// spot, instead of popping up a native prompt() dialog.
export function startNewBoard() {
  newBoardBtn.hidden = true;
  newBoardInput.hidden = false;
  newBoardInput.value = '';
  newBoardInput.focus();
}

function cancelNewBoard() {
  newBoardInput.hidden = true;
  newBoardBtn.hidden = false;
}

async function commitNewBoard() {
  if (newBoardInput.hidden) return; // already committed/cancelled (e.g. via the blur this triggers)
  const title = newBoardInput.value;
  newBoardInput.hidden = true;
  newBoardBtn.hidden = false;
  newBoard(title);
  renderSidebar();
  await onBoardChangeCb({ fit: true });
}

export function renderSidebar() {
  const state = getState();
  const list = document.getElementById('board-list');
  list.innerHTML = '';
  state.boards.forEach((b) => {
    const li = document.createElement('li');
    li.className = 'board-item' + (b.id === state.activeBoardId ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'board-name';
    nameSpan.textContent = b.title;
    nameSpan.addEventListener('click', async () => {
      setActiveBoard(b.id);
      renderSidebar();
      await onBoardChangeCb({ fit: true });
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'board-delete';
    delBtn.textContent = '✕';
    delBtn.title = '삭제';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`"${b.title}"을(를) 삭제할까요?`)) return;
      deleteBoard(b.id);
      renderSidebar();
      await onBoardChangeCb({ fit: true });
    });

    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}
