// import-export/import-export.js — manual JSON export/import of the whole
// app state (no server, no DB — this is the backup/restore mechanism).

import { getState, addImportedBoards } from '../state/store.js';

export function initImportExport({ onImported, setStatus }) {
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importData(file, { onImported, setStatus });
    e.target.value = '';
  });
}

function exportData() {
  const state = getState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindai-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file, { onImported, setStatus }) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.boards)) throw new Error('형식이 올바르지 않습니다');
      const count = parsed.boards.length;
      addImportedBoards(parsed.boards);
      await onImported();
      setStatus(`${count}개 마인드맵을 불러왔습니다`);
    } catch (err) {
      setStatus('불러오기 실패: ' + err.message, true);
    }
  };
  reader.readAsText(file);
}
