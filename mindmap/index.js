// mindmap/index.js — barrel that wires the mindmap sub-modules (core render,
// link overlay, inline editor) together and exposes the same surface the
// rest of the app talks to.

import { initCore, render } from './core.js';
import {
  initOverlay,
  redrawLinkOverlay,
  scheduleOverlayRedraw,
  highlightNode,
  nodeElement,
} from './overlay.js';
import { initEditor, openInlineEditor } from './editor.js';
import { buildOutlineForLLM } from './outline.js';

export function init(opts) {
  initCore(opts.svg);
  initOverlay({ container: opts.container, overlaySvg: opts.overlaySvg });
  initEditor({ editLayer: opts.editLayer, container: opts.container });

  opts.container.addEventListener('click', (e) => {
    const nodeEl = e.target.closest('[data-nid]');
    if (!nodeEl) return;
    opts.onNodeClick && opts.onNodeClick(nodeEl.getAttribute('data-nid'), nodeEl);
  });

  // markmap calls stopPropagation() on 'dblclick' at the foreignObject level
  // (to keep double-click from triggering the SVG's built-in zoom-reset),
  // which would swallow a normal bubble-phase listener before it ever
  // reaches this container. Listening on the CAPTURE phase runs before that
  // stopPropagation() call, so it still sees the event.
  opts.container.addEventListener(
    'dblclick',
    (e) => {
      const nodeEl = e.target.closest('[data-nid]');
      if (!nodeEl) return;
      e.preventDefault();
      opts.onNodeDblClick && opts.onNodeDblClick(nodeEl.getAttribute('data-nid'), nodeEl);
    },
    true
  );
}

export {
  render,
  buildOutlineForLLM,
  redrawLinkOverlay,
  scheduleOverlayRedraw,
  highlightNode,
  openInlineEditor,
  nodeElement,
};
