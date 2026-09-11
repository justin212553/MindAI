// markdown-import/markdown-import.js — "AI 대화 불러오기": copies a
// ready-made summarization prompt to the clipboard (paste it into whatever
// AI chat you were having), then lets the user upload the resulting .md
// file to turn it into a brand-new mind-map board. Parsing (parser.js) is
// pure client-side text parsing — no backend call, so this always works
// regardless of Gemini quota/model issues affecting classify/ask.

import { importBoard } from '../state/store.js';
import { parseMarkdownOutline, treeToBoard } from './parser.js';

const SUMMARY_PROMPT = `지금까지 나눈 대화 내용을 마크다운 개요로 요약해줘. 아래 형식을 그대로 지켜줘:

# (전체 주제, 짧은 제목)
(한두 줄 설명)

## (하위 주제)
(설명, 선택)
- 세부 항목
- 세부 항목
  - 더 세부적인 항목

결과를 .md 파일로 만들어서 다운로드할 수 있게 해줘. (파일 다운로드가 안 되면 마크다운 텍스트만 줘도 괜찮아.)`;

export function initMarkdownImport({ onImported, setStatus }) {
  const toggleBtn = document.getElementById('md-import-btn');
  const panel = document.getElementById('md-import-panel');
  const promptEl = document.getElementById('md-import-prompt');
  const hintEl = document.getElementById('md-import-hint');
  const uploadBtn = document.getElementById('md-import-upload-btn');
  const fileInput = document.getElementById('md-import-file');
  const cancelBtn = document.getElementById('md-import-cancel');

  promptEl.textContent = SUMMARY_PROMPT;

  toggleBtn.addEventListener('click', async () => {
    toggleBtn.hidden = true;
    panel.hidden = false;
    try {
      await navigator.clipboard.writeText(SUMMARY_PROMPT);
      hintEl.textContent = '아래 프롬프트가 클립보드에 복사됐습니다. 대화 중이던 AI 세션에 붙여넣고, 결과를 .md 파일로 받아서 업로드하세요.';
    } catch {
      hintEl.textContent = '클립보드 복사에 실패했습니다. 아래 프롬프트를 직접 복사해서 대화 중이던 AI 세션에 붙여넣고, 결과를 .md 파일로 받아서 업로드하세요.';
    }
  });

  cancelBtn.addEventListener('click', closePanel);

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '').trim();
      if (!text) return;
      const tree = parseMarkdownOutline(text);
      const board = treeToBoard(tree);
      importBoard(board);
      closePanel();
      await onImported();
      setStatus(`"${board.title}" 마인드맵을 만들었습니다`);
    };
    reader.readAsText(file);
  });

  function closePanel() {
    panel.hidden = true;
    toggleBtn.hidden = false;
  }
}
