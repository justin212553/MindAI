// app.js — composition root. Imports each feature module, wires them
// together, and renders. No feature logic lives here.
import { getState, getActiveBoard } from './state/store.js';
import * as Mindmap from './mindmap/index.js';
import { initSidebar, renderSidebar, startNewBoard } from './sidebar/sidebar.js';
import { initItems } from './items/items.js';
import { initLinkMode, handleNodeClick, isLinkModeActive } from './link-mode/link-mode.js';
import { makeNodeDblClickHandler } from './node-edit/node-edit.js';
import { initImportExport } from './import-export/import-export.js';
import { initNodeDetail, toggleNodeDetail, closeNodeDetail } from './node-detail/node-detail.js';
import { initNodeScope, getScopeNodeId, clearScope } from './node-scope/node-scope.js';
import { initMarkdownImport } from './markdown-import/markdown-import.js';

function setStatus(msg, isError) {
  const el = document.getElementById('status-line');
  el.textContent = msg || '';
  el.classList.toggle('status-error', !!isError);
}

async function renderActiveBoard({ fit = false } = {}) {
  const board = getActiveBoard();
  if (board) await Mindmap.render(board, { fit: !!fit });
}

async function refreshAll({ fit = false } = {}) {
  renderSidebar();
  await renderActiveBoard({ fit });
}

// All feature modules wire their own DOM listeners synchronously below,
// before the first (animated) render is awaited. The initial render's fit()
// transition can take a few hundred ms; if listeners were attached only
// after awaiting it, a fast click/keypress right after the map first
// appears could be dropped.
async function init() {
  const onNodeDblClick = makeNodeDblClickHandler({
    onEdited: () => renderActiveBoard({ fit: false }),
  });
  function onNodeClick(id) {
    if (isLinkModeActive()) {
      handleNodeClick(id);
    } else {
      toggleNodeDetail(id);
    }
  }

  Mindmap.init({
    container: document.getElementById('mindmap-wrap'),
    svg: document.getElementById('mindmap'),
    overlaySvg: document.getElementById('link-overlay'),
    editLayer: document.getElementById('edit-layer'),
    onNodeClick,
    onNodeDblClick,
  });
  Mindmap.scheduleOverlayRedraw(() => (getActiveBoard() ? getActiveBoard().links : []));
  initNodeScope();
  initNodeDetail({
    onDeleted: async (removedIds) => {
      if (removedIds.includes(getScopeNodeId())) clearScope();
      await renderActiveBoard({ fit: false });
    },
    onNodesAdded: () => renderActiveBoard({ fit: false }),
    onColorChanged: () => renderActiveBoard({ fit: false }),
  });

  initSidebar({
    onBoardChange: async (opts) => {
      closeNodeDetail();
      clearScope();
      await renderActiveBoard(opts);
    },
  });
  // No boards yet (first visit) — jump straight into the same inline
  // "name it" input the "+ 새 마인드맵" button uses, instead of a separate
  // native prompt() dialog.
  if (!getState().boards.length) startNewBoard();

  initItems({ onItemAdded: () => renderActiveBoard({ fit: false }), setStatus });
  initLinkMode({ setStatus });
  initImportExport({
    onImported: async () => {
      closeNodeDetail();
      clearScope();
      await refreshAll({ fit: true });
    },
    setStatus,
  });
  initMarkdownImport({
    onImported: async () => {
      closeNodeDetail();
      clearScope();
      await refreshAll({ fit: true });
    },
    setStatus,
  });

  renderSidebar();
  await renderActiveBoard({ fit: true });
}

window.addEventListener('DOMContentLoaded', init);
