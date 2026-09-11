// node-scope/node-scope.js — lets the user "aim" new items at one specific
// existing node instead of letting /api/classify guess the parent every
// time. While a scope is set, items.js skips the classify call entirely —
// the user has already said exactly where new items belong, so there's
// nothing left to decide (and no API cost either).

let indicator, labelEl, clearBtn;
let scopeNodeId = null;

export function initNodeScope({ onClear } = {}) {
  indicator = document.getElementById('scope-indicator');
  labelEl = document.getElementById('scope-label');
  clearBtn = document.getElementById('scope-clear');

  clearBtn.addEventListener('click', () => {
    clearScope();
    onClear && onClear();
  });
}

export function getScopeNodeId() {
  return scopeNodeId;
}

export function setScope(nodeId, label) {
  scopeNodeId = nodeId;
  labelEl.textContent = `📍 "${label}" 아래에 추가 중`;
  indicator.hidden = false;
}

export function clearScope() {
  scopeNodeId = null;
  if (indicator) indicator.hidden = true;
}
