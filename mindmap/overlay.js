// mindmap/overlay.js — manual-link SVG overlay drawn on top of the markmap
// canvas, plus node lookup by data-nid (shared with editor.js).

let containerEl = null; // the #mindmap-wrap element
let overlaySvg = null; // the #link-overlay element
let rafHandle = null;

export function initOverlay({ container, overlaySvg: overlay }) {
  containerEl = container;
  overlaySvg = overlay;
}

export function nodeElement(id) {
  if (!containerEl) return null;
  return containerEl.querySelector(`[data-nid="${CSS.escape(id)}"]`);
}

export function redrawLinkOverlay(links) {
  if (!overlaySvg || !containerEl) return;
  const rect = containerEl.getBoundingClientRect();
  overlaySvg.innerHTML = '';
  (links || []).forEach(([a, b]) => {
    const elA = nodeElement(a);
    const elB = nodeElement(b);
    if (!elA || !elB) return;
    const ra = elA.getBoundingClientRect();
    const rb = elB.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - rect.left;
    const y1 = ra.top + ra.height / 2 - rect.top;
    const x2 = rb.left + rb.width / 2 - rect.left;
    const y2 = rb.top + rb.height / 2 - rect.top;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'manual-link-line');
    overlaySvg.appendChild(line);
  });
}

// Runs continuously (cheap at hackathon-demo scale) so the overlay tracks
// markmap's own pan/zoom/expand transitions without us hooking into them.
export function scheduleOverlayRedraw(getLinks) {
  if (rafHandle) cancelAnimationFrame(rafHandle);
  const loop = () => {
    redrawLinkOverlay(getLinks());
    rafHandle = requestAnimationFrame(loop);
  };
  rafHandle = requestAnimationFrame(loop);
}

export function highlightNode(id, on) {
  const el = nodeElement(id);
  if (el) el.classList.toggle('nid-selected', !!on);
}
