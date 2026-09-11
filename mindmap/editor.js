// mindmap/editor.js — inline (double-click to rename) node label editor.

import { nodeElement } from './overlay.js';

let editLayer = null; // the #edit-layer element
let containerEl = null; // the #mindmap-wrap element

export function initEditor({ editLayer: layer, container }) {
  editLayer = layer;
  containerEl = container;
}

export function openInlineEditor(id, currentLabel, onCommit) {
  const el = nodeElement(id);
  if (!el || !editLayer || !containerEl) return;
  const rect = el.getBoundingClientRect();
  const wrapRect = containerEl.getBoundingClientRect();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentLabel;
  input.className = 'inline-node-editor';
  input.style.left = `${rect.left - wrapRect.left}px`;
  input.style.top = `${rect.top - wrapRect.top}px`;
  input.style.width = `${Math.max(rect.width, 80)}px`;
  editLayer.innerHTML = '';
  editLayer.appendChild(input);
  input.focus();
  input.select();

  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const value = input.value.trim();
    editLayer.innerHTML = '';
    if (value && value !== currentLabel) onCommit(value);
  }
  input.addEventListener('keydown', (e) => {
    // See items.js for why isComposing/229 are checked here too.
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) commit();
    if (e.key === 'Escape') {
      done = true;
      editLayer.innerHTML = '';
    }
  });
  input.addEventListener('blur', commit);
}
