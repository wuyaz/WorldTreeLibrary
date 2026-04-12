export function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getHistoryStorageKey(getChatKey) {
  return `wtl.history.${getChatKey()}`;
}

export function getHistoryIndexStorageKey(getChatKey) {
  return `wtl.history.index.${getChatKey()}`;
}

export function appendHistoryEntry({ getChatKey, tableJson, tableMd, meta = {} }) {
  const key = getHistoryStorageKey(getChatKey);
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const entry = { time: new Date().toISOString(), tableJson, table: tableMd };
  if (meta && typeof meta === 'object') {
    if (meta.aiCommandText) entry.aiCommandText = meta.aiCommandText;
    if (meta.aiRawText) entry.aiRawText = meta.aiRawText;
    if (meta.source) entry.source = meta.source;
  }
  list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
  localStorage.setItem(getHistoryIndexStorageKey(getChatKey), String(list.length - 1));
}

export function buildHistoryHeader(index, item, total) {
  const title = document.createElement('div');
  title.className = 'wtl-row';
  title.style.justifyContent = 'space-between';

  const label = document.createElement('div');
  label.textContent = `历史记录 #${index + 1}/${total}`;

  const time = document.createElement('div');
  time.className = 'wtl-editor-hint';
  time.textContent = item?.time ? new Date(item.time).toLocaleString() : '';

  title.appendChild(label);
  title.appendChild(time);
  return title;
}

export function createHistoryModalController({
  getChatKey,
  modalCustomEl,
  modalContentEl,
  openModal,
  closeModal,
  saveState,
  setStatus,
  renderPreview,
  renderJsonToMarkdown,
  parseMarkdownTableToJson,
  getTableMarkdown,
  setTableMarkdown,
  getHiddenRows,
  setHiddenRows
}) {
  const openHistoryModal = () => {
    const list = JSON.parse(localStorage.getItem(getHistoryStorageKey(getChatKey)) || '[]');
    const total = list.length;
    let idx = Number(localStorage.getItem(getHistoryIndexStorageKey(getChatKey)) || total - 1);
    if (!Number.isFinite(idx) || idx < 0) idx = total - 1;
    if (idx >= total) idx = total - 1;

    const render = () => {
      const item = list[idx];
      const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
      if (modalCustomEl) {
        modalCustomEl.innerHTML = '';
        modalCustomEl.appendChild(buildHistoryHeader(idx, item, total));
        const summary = document.createElement('div');
        summary.className = 'wtl-editor-hint';
        summary.textContent = item?.source ? `来源：${item.source}` : '来源：手动/未知';
        modalCustomEl.appendChild(summary);
        if (item?.aiCommandText) {
          const label = document.createElement('div');
          label.className = 'wtl-badge';
          label.textContent = '填表指令（AI）';
          const block = document.createElement('div');
          block.className = 'wtl-modal-message';
          block.textContent = item.aiCommandText;
          modalCustomEl.appendChild(label);
          modalCustomEl.appendChild(block);
        }
      }
      if (modalContentEl) {
        modalContentEl.value = md || '';
        modalContentEl.readOnly = true;
      }
    };

    const prevBtn = document.createElement('button');
    prevBtn.className = 'menu_button';
    prevBtn.textContent = '上一个';
    prevBtn.addEventListener('click', () => {
      if (idx > 0) {
        idx -= 1;
        render();
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'menu_button';
    nextBtn.textContent = '下一个';
    nextBtn.addEventListener('click', () => {
      if (idx < total - 1) {
        idx += 1;
        render();
      }
    });

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'menu_button';
    restoreBtn.textContent = '恢复此版本';
    restoreBtn.addEventListener('click', async () => {
      const item = list[idx];
      const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
      setTableMarkdown(md || '');
      const json = item?.tableJson || parseMarkdownTableToJson(md || '');
      setHiddenRows(json.hiddenRows || {});
      renderPreview(md || '');
      await saveState();
      localStorage.setItem(getHistoryIndexStorageKey(getChatKey), String(idx));
      closeModal();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu_button';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', closeModal);

    openModal('回溯表格', '', [prevBtn, nextBtn, restoreBtn, closeBtn], () => {
      if (modalCustomEl) modalCustomEl.appendChild(buildHistoryHeader(idx, list[idx], total));
    });
    render();
  };

  const restoreHistoryByOffset = async (delta) => {
    const list = JSON.parse(localStorage.getItem(getHistoryStorageKey(getChatKey)) || '[]');
    const total = list.length;
    if (!total) {
      setStatus('无历史可回溯');
      return;
    }

    let idx = Number(localStorage.getItem(getHistoryIndexStorageKey(getChatKey)) || total - 1);
    if (!Number.isFinite(idx) || idx < 0) idx = total - 1;
    if (idx >= total) idx = total - 1;

    const next = Math.max(0, Math.min(total - 1, idx + delta));
    if (next === idx) {
      setStatus(delta < 0 ? '已是最早版本' : '已是最新版本');
      return;
    }

    const item = list[next];
    const md = item?.table || renderJsonToMarkdown(item?.tableJson || {});
    setTableMarkdown(md || '');
    const json = item?.tableJson || parseMarkdownTableToJson(md || '');
    setHiddenRows(json.hiddenRows || {});
    renderPreview(md || '');
    await saveState();
    localStorage.setItem(getHistoryIndexStorageKey(getChatKey), String(next));
    setStatus(delta < 0 ? '已回退' : '已撤销回退');
  };

  return {
    openHistoryModal,
    restoreHistoryByOffset,
    getHistoryKey: () => getHistoryStorageKey(getChatKey),
    getHistoryIndexKey: () => getHistoryIndexStorageKey(getChatKey),
    appendHistory: ({ tableJson, tableMd, meta }) => appendHistoryEntry({ getChatKey, tableJson, tableMd, meta })
  };
}
