import { createModalController } from './modal.js';
import { getPastCharacterChats, deleteCharacterChatByName, renameGroupOrCharacterChat } from '../../../../../../script.js';

const CHAT_MANAGER_STATE_KEY = 'wtl.chatManager.state';
const CHAT_MANAGER_ROOT_ID = 'wtl-chat-manager-host';
const CHAT_MANAGER_STYLE_ID = 'wtl-chat-manager-style';
const CHAT_MANAGER_MODAL_ID = 'wtl-chat-manager-modal';

const DEFAULT_STATE = {
  viewMode: 'time',
  activeFilter: '全部',
  searchQuery: '',
  isBatchMode: false,
  selectedChats: [],
  previewCount: 6,
  pageSize: 20,
  currentPage: 1,
  folders: ['主线', '支线', '日常', '废案'],
  tags: ['高甜', '虐心', '战斗', 'R18'],
  chatFolder: {},
  chatTags: {},
  chatSummary: {},
  chatTitleOverride: {},
  pinnedChats: []
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const normalizeTimestamp = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const formatTime = (value) => {
  const ts = normalizeTimestamp(value);
  if (!ts) return '未知时间';
  try {
    return new Date(ts).toLocaleString();
  } catch (err) {
    return '未知时间';
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(CHAT_MANAGER_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE, selectedChats: new Set() };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      selectedChats: new Set(Array.isArray(parsed?.selectedChats) ? parsed.selectedChats : [])
    };
  } catch (err) {
    console.warn('[WorldTreeLibrary] load chat manager state failed', err);
    return { ...DEFAULT_STATE, selectedChats: new Set() };
  }
}

function persistState(state) {
  try {
    localStorage.setItem(CHAT_MANAGER_STATE_KEY, JSON.stringify({
      ...state,
      selectedChats: Array.from(state.selectedChats || [])
    }));
  } catch (err) {
    console.warn('[WorldTreeLibrary] save chat manager state failed', err);
  }
}

async function fetchCharacters(ctx) {
  let characters = window.characters || ctx?.characters || [];
  if ((!characters || !characters.length) && typeof ctx?.getCharacters === 'function') {
    try {
      await ctx.getCharacters();
      characters = window.characters || ctx?.characters || [];
    } catch (err) {
      console.warn('[WorldTreeLibrary] getCharacters failed', err);
    }
  }
  return Array.isArray(characters) ? characters : [];
}

async function postJson(url, payload, responseType = 'json') {
  const ctx = window.SillyTavern?.getContext?.();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(ctx?.getRequestHeaders ? ctx.getRequestHeaders() : {}),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (responseType === 'text') return res.text();
  return res.json();
}

function deriveCharId(char) {
  const avatar = char?.avatar || '';
  if (avatar) return avatar;
  return char?.name || '';
}

async function fetchAllChats() {
  const ctx = window.SillyTavern?.getContext?.();
  const characters = await fetchCharacters(ctx);
  const chats = [];

  for (const [characterIndex, char] of characters.entries()) {
    const charId = deriveCharId(char);
    const characterName = char?.name || charId;
    if (!charId) continue;

    try {
      const result = await getPastCharacterChats(characterIndex);
      if (Array.isArray(result) && result.length) {
        result.forEach((meta) => {
          const fileName = meta?.file_name || meta?.chat_file || meta?.name;
          if (!fileName) return;
          chats.push({
            character: characterName,
            charId,
            characterIndex,
            fileName: String(fileName).replace(/\.jsonl$/i, ''),
            timestamp: normalizeTimestamp(meta?.last_mes || meta?.create_date || meta?.last_active),
            preview: meta?.mes || '暂无预览',
            globalKey: `${charId}|${String(fileName).replace(/\.jsonl$/i, '')}`
          });
        });
      }
    } catch (err) {
      console.warn('[WorldTreeLibrary] getPastCharacterChats failed', err);
    }
  }

  return chats;
}

async function fetchChatContent(charId, fileName) {
  const fileVariants = [fileName, String(fileName || '').replace(/\.jsonl$/i, '')].filter(Boolean);
  const folderVariants = [charId, `default_${charId}`, String(charId || '').replace(/ /g, '_')].filter(Boolean);

  for (const folder of folderVariants) {
    for (const currentFile of fileVariants) {
      try {
        const result = await postJson('/api/chats/get', {
          ch_name: folder,
          file_name: currentFile,
          avatar_url: folder
        }, 'text');
        if (!result || result === '{}') continue;
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed?.lines)) return parsed.lines;
        } catch (err) {
          const lines = String(result)
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
          if (lines.length) return lines;
        }
      } catch (err) {
        console.warn('[WorldTreeLibrary] chat content fetch failed', err);
      }
    }
  }
  return [];
}

export function createChatManagerController({ notifyStatus, setStatus } = {}) {
  let enabled = false;
  let observer = null;
  let rootEl = null;
  let modalController = null;
  let state = loadState();
  let chats = [];
  let isLoaded = false;
  let debounceTimer = null;

  const sortChats = () => {
    chats.sort((a, b) => {
      const pinnedA = state.pinnedChats.includes(a.globalKey);
      const pinnedB = state.pinnedChats.includes(b.globalKey);
      if (pinnedA && !pinnedB) return -1;
      if (!pinnedA && pinnedB) return 1;
      return normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp);
    });
  };

  const save = () => persistState(state);

  const ensureStyles = () => {
    if (document.getElementById(CHAT_MANAGER_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CHAT_MANAGER_STYLE_ID;
    style.textContent = `
.wtl-chat-manager-shell {
  margin-top: 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 14px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 86%, transparent);
  overflow: hidden;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--SmartThemeBgColor) 24%, transparent);
}
.wtl-chat-manager-toggle {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, color-mix(in srgb, var(--SmartThemeUnderlineColor) 18%, transparent), color-mix(in srgb, var(--SmartThemeQuoteColor) 12%, transparent));
  color: var(--SmartThemeBodyColor);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  min-width: 0;
}
.wtl-chat-manager-toggle:hover {
  background: linear-gradient(135deg, color-mix(in srgb, var(--SmartThemeUnderlineColor) 24%, transparent), color-mix(in srgb, var(--SmartThemeQuoteColor) 16%, transparent));
}
.wtl-chat-manager-toggle-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}
.wtl-chat-manager-toggle-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}
.wtl-chat-manager-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-align: left;
  overflow: hidden;
}
.wtl-chat-manager-toggle-title {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wtl-chat-manager-toggle-subtitle {
  font-size: 12px;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wtl-chat-manager-toggle-count {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.wtl-chat-manager-toggle-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex: 0 0 auto;
}
.wtl-chat-manager-panel {
  display: none;
  padding: 12px;
  background: color-mix(in srgb, var(--SmartThemeBgColor) 88%, transparent);
}
.wtl-chat-manager-panel.is-open {
  display: block;
}
.wtl-chat-manager-toolbar,
.wtl-chat-manager-filters,
.wtl-chat-manager-tabs,
.wtl-chat-manager-batchbar,
.wtl-chat-manager-summary-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.wtl-chat-manager-toolbar,
.wtl-chat-manager-filters,
.wtl-chat-manager-summary-row {
  margin-bottom: 10px;
}
.wtl-chat-manager-toolbar {
  align-items: center;
  justify-content: space-between;
}
.wtl-chat-manager-search,
.wtl-chat-manager-input,
.wtl-chat-manager-textarea,
.wtl-chat-manager-select {
  width: 100%;
  background: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  padding: 8px 10px;
  box-sizing: border-box;
}
.wtl-chat-manager-search {
  flex: 1 1 360px;
  min-width: 180px;
}
.wtl-chat-manager-toolbar-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  justify-content: space-between;
}
.wtl-chat-manager-toolbar-tools {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}
.wtl-chat-manager-tabs {
  flex: 0 1 auto;
  min-width: 0;
}
.wtl-chat-manager-btn,
.wtl-chat-manager-pill,
.wtl-chat-manager-mini {
  border: 1px solid var(--SmartThemeBorderColor);
  background: color-mix(in srgb, var(--SmartThemeBodyColor) 8%, transparent);
  color: var(--SmartThemeBodyColor);
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}
.wtl-chat-manager-btn:hover,
.wtl-chat-manager-pill:hover,
.wtl-chat-manager-mini:hover {
  border-color: var(--SmartThemeUnderlineColor);
  color: var(--SmartThemeUnderlineColor);
}
.wtl-chat-manager-pill.is-active,
.wtl-chat-manager-btn.is-active {
  background: color-mix(in srgb, var(--SmartThemeUnderlineColor) 20%, transparent);
  border-color: color-mix(in srgb, var(--SmartThemeUnderlineColor) 58%, transparent);
  color: var(--SmartThemeUnderlineColor);
}
.wtl-chat-manager-toggle .wtl-chat-manager-btn,
.wtl-chat-manager-toggle .wtl-chat-manager-pill,
.wtl-chat-manager-toggle .wtl-chat-manager-mini {
  padding: 6px 9px;
}
.wtl-chat-manager-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wtl-chat-manager-card {
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 74%, transparent);
  padding: 12px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}
.wtl-chat-manager-card.is-pinned {
  border-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 56%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--SmartThemeQuoteColor) 14%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 78%, transparent));
}
.wtl-chat-manager-check {
  display: none;
  align-items: flex-start;
  padding-top: 4px;
}
.wtl-chat-manager-panel.is-batch .wtl-chat-manager-check {
  display: flex;
}
.wtl-chat-manager-card-main {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 14px;
  align-items: stretch;
}
.wtl-chat-manager-card-main-body,
.wtl-chat-manager-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.wtl-chat-manager-card-main-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.wtl-chat-manager-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.wtl-chat-manager-title-btn {
  border: none;
  background: transparent;
  color: var(--SmartThemeEmColor, var(--SmartThemeUnderlineColor));
  font-size: 15px;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.wtl-chat-manager-title-btn:hover {
  opacity: 0.82;
}
.wtl-chat-manager-meta,
.wtl-chat-manager-preview,
.wtl-chat-manager-empty,
.wtl-chat-manager-count,
.wtl-chat-manager-card-time {
  font-size: 12px;
  opacity: 0.72;
}
.wtl-chat-manager-summary {
  margin: 8px 0;
  color: var(--SmartThemeQuoteColor);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.wtl-chat-manager-summary.is-empty {
  opacity: 0.6;
  font-style: italic;
}
.wtl-chat-manager-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wtl-chat-manager-meta-row {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.wtl-chat-manager-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--SmartThemeBodyColor) 8%, transparent);
  border: 1px solid var(--SmartThemeBorderColor);
}
.wtl-chat-manager-actions {
  justify-content: center;
  display: grid;
  grid-template-columns: repeat(3, 38px);
  gap: 8px;
  align-content: center;
  justify-content: end;
  align-self: stretch;
  min-width: 132px;
  padding-left: 8px;
  border-left: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 70%, transparent);
}
.wtl-chat-manager-mini {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.wtl-chat-manager-batchbar {
  justify-content: space-between;
  padding: 10px 12px;
  margin-top: 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 90%, transparent);
}
.wtl-chat-manager-empty {
  text-align: center;
  padding: 22px 16px;
  border: 1px dashed var(--SmartThemeBorderColor);
  border-radius: 12px;
}
.wtl-chat-manager-modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 50000;
  background: color-mix(in srgb, var(--SmartThemeBgColor) 48%, transparent);
  backdrop-filter: blur(4px);
  padding: 16px;
  box-sizing: border-box;
}
.wtl-chat-manager-modal.is-open {
  display: flex;
}
.wtl-chat-manager-modal-card {
  width: min(720px, 94vw);
  max-height: 86vh;
  overflow: auto;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 16px;
  background: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  padding: 14px;
  box-shadow: 0 20px 40px color-mix(in srgb, var(--SmartThemeBgColor) 32%, transparent);
}
.wtl-chat-manager-modal-input {
  width: 100%;
  min-height: 42px;
  resize: vertical;
  box-sizing: border-box;
  background: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  padding: 10px 12px;
}
.wtl-chat-manager-modal-head,
.wtl-chat-manager-modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.wtl-chat-manager-modal-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wtl-chat-manager-tag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.wtl-chat-manager-tag-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 78%, transparent);
  cursor: pointer;
}
.wtl-chat-manager-tag-option:hover {
  border-color: var(--SmartThemeUnderlineColor);
}
.wtl-chat-manager-tag-option input {
  margin: 0;
}
.wtl-chat-manager-tag-option-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wtl-chat-manager-modal-actions {
  justify-content: flex-end;
  margin-top: 12px;
}
.wtl-chat-manager-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 90%, transparent);
}
.wtl-chat-manager-pagination-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.wtl-chat-manager-message {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--SmartThemeBorderColor);
  background: color-mix(in srgb, var(--SmartThemeBodyColor) 6%, transparent);
  white-space: pre-wrap;
  line-height: 1.55;
}
.wtl-chat-manager-message.is-user {
  margin-left: auto;
  background: color-mix(in srgb, var(--SmartThemeUnderlineColor) 12%, transparent);
}
.wtl-chat-manager-message-name {
  font-size: 12px;
  opacity: 0.72;
  margin-bottom: 4px;
}
@media (max-width: 768px) {
  .wtl-chat-manager-toolbar,
  .wtl-chat-manager-filters,
  .wtl-chat-manager-summary-row,
  .wtl-chat-manager-card-top,
  .wtl-chat-manager-batchbar {
    align-items: stretch;
  }
  .wtl-chat-manager-toolbar-main {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .wtl-chat-manager-toggle {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }
  .wtl-chat-manager-toggle-tools,
  .wtl-chat-manager-toggle-count,
  .wtl-chat-manager-toggle-chevron {
    justify-content: flex-start;
  }
  .wtl-chat-manager-card {
    grid-template-columns: 1fr;
  }
  .wtl-chat-manager-card-main {
    grid-template-columns: 1fr;
  }
  .wtl-chat-manager-actions {
    grid-template-columns: repeat(3, 38px);
    min-width: 0;
    justify-content: start;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 70%, transparent);
    padding-top: 10px;
  }
  .wtl-chat-manager-tag-grid {
    grid-template-columns: 1fr;
  }
  .wtl-chat-manager-modal {
    padding: 12px;
  }
  .wtl-chat-manager-modal-card {
    width: min(720px, 100%);
    margin: auto;
  }
  .wtl-chat-manager-pagination {
    flex-direction: column;
    align-items: stretch;
  }
  .wtl-chat-manager-check {
    padding-top: 0;
  }
  .wtl-chat-manager-message {
    max-width: 100%;
  }
}
`;
    document.head.appendChild(style);
  };

  const ensureModal = () => {
    let modal = document.getElementById(CHAT_MANAGER_MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = CHAT_MANAGER_MODAL_ID;
    modal.className = 'wtl-chat-manager-modal';
    modal.innerHTML = `
      <div class="wtl-chat-manager-modal-card">
        <div class="wtl-chat-manager-modal-head">
          <strong data-role="title">聊天管理</strong>
          <button type="button" class="menu_button" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <textarea class="wtl-chat-manager-modal-input" data-role="content" style="display:none;"></textarea>
        <div class="wtl-chat-manager-modal-body" data-role="custom"></div>
        <div class="wtl-chat-manager-modal-actions" data-role="actions"></div>
      </div>
    `;
    modalController = createModalController({
      modalEl: modal,
      modalTitleEl: modal.querySelector('[data-role="title"]'),
      modalContentEl: modal.querySelector('[data-role="content"]'),
      modalCustomEl: modal.querySelector('[data-role="custom"]'),
      modalActionsEl: modal.querySelector('[data-role="actions"]')
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-action="close-modal"]')) {
        closeModal();
      }
    });
    modal.addEventListener('click', handleAction);
    document.body.appendChild(modal);
    return modal;
  };

  const closeModal = () => {
    modalController?.closeModal();
    const modal = document.getElementById(CHAT_MANAGER_MODAL_ID);
    if (modal) modal.classList.remove('is-open');
  };

  const openModal = ({ title, body, actions = '' }) => {
    const modal = ensureModal();
    const temp = document.createElement('div');
    temp.innerHTML = actions || '';
    const actionNodes = Array.from(temp.children);
    modalController?.openModal(title || '聊天管理', '', actionNodes, (wrap) => {
      wrap.innerHTML = body || '';
    }, { hideContent: true, readOnly: true });
    modal.classList.add('is-open');
  };

  const getFilteredChats = () => {
    const activeFilter = state.activeFilter || '全部';
    const search = String(state.searchQuery || '').trim().toLowerCase();
    return chats.filter((chat) => {
      const key = chat.globalKey;
      const folder = state.chatFolder[key] || '未分类';
      const tags = state.chatTags[key] || [];
      const summary = state.chatSummary[key] || '';
      const title = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');

      if (activeFilter !== '全部') {
        if (state.viewMode === 'folder' && folder !== activeFilter) return false;
        if (state.viewMode === 'tag' && !tags.includes(activeFilter)) return false;
        if (state.viewMode === 'character' && chat.character !== activeFilter) return false;
      }

      if (search) {
        const bag = `${title} ${summary} ${chat.character} ${chat.preview || ''}`.toLowerCase();
        if (!bag.includes(search)) return false;
      }

      return true;
    });
  };

  const renderFilters = () => {
    if (state.viewMode === 'folder') return ['全部', ...state.folders];
    if (state.viewMode === 'tag') return ['全部', ...state.tags];
    if (state.viewMode === 'character') return ['全部', ...Array.from(new Set(chats.map((item) => item.character))).filter(Boolean)];
    return [];
  };

  const getPreviewCount = () => Math.max(1, Number.parseInt(state.previewCount, 10) || 6);
  const getPageSize = () => Math.max(1, Number.parseInt(state.pageSize, 10) || 20);

  const getCtx = () => window.SillyTavern?.getContext?.();

  const requestInput = ({ title, value = '', placeholder = '', multiline = false }) => {
    const modal = ensureModal();
    return new Promise((resolve) => {
      const okBtn = document.createElement('button');
      okBtn.className = 'menu_button';
      okBtn.textContent = '保存';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'menu_button';
      cancelBtn.textContent = '取消';
      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
      };
      const onOk = () => {
        const input = modal.querySelector('[data-role="dialog-input"]');
        cleanup();
        closeModal();
        resolve(input?.value ?? '');
      };
      const onCancel = () => {
        cleanup();
        closeModal();
        resolve(null);
      };
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modalController?.openModal(title, '', [cancelBtn, okBtn], (wrap) => {
        if (multiline) {
          const textarea = document.createElement('textarea');
          textarea.className = 'wtl-chat-manager-modal-input';
          textarea.dataset.role = 'dialog-input';
          textarea.rows = 4;
          textarea.placeholder = placeholder;
          textarea.value = value;
          wrap.appendChild(textarea);
        } else {
          const input = document.createElement('input');
          input.className = 'wtl-chat-manager-modal-input';
          input.dataset.role = 'dialog-input';
          input.placeholder = placeholder;
          input.value = value;
          wrap.appendChild(input);
        }
      }, { hideContent: true, readOnly: true });
      modal.classList.add('is-open');
    });
  };

  const requestConfirm = ({ title, message, okText = '确认' }) => {
    const modal = ensureModal();
    return new Promise((resolve) => {
      const okBtn = document.createElement('button');
      okBtn.className = 'menu_button';
      okBtn.textContent = okText;
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'menu_button';
      cancelBtn.textContent = '取消';
      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
      };
      const onOk = () => {
        cleanup();
        closeModal();
        resolve(true);
      };
      const onCancel = () => {
        cleanup();
        closeModal();
        resolve(false);
      };
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modalController?.openConfirmModal(title, message, [cancelBtn, okBtn]);
      modal.classList.add('is-open');
    });
  };

  const chooseFromList = async ({ title, items, currentValue = '', allowEmpty = false, emptyLabel = '未设置' }) => {
    const rows = items.map((item) => `<option value="${escapeHtml(item)}" ${item === currentValue ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('');
    const html = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>${escapeHtml(title)}</div>
        <select class="wtl-chat-manager-select" data-role="choice-select">
          ${allowEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : ''}
          ${rows}
        </select>
      </div>
    `;
    openModal({
      title,
      body: html,
      actions: `
        <button type="button" class="menu_button" data-action="close-modal">取消</button>
        <button type="button" class="menu_button" data-action="confirm-choice">确定</button>
      `
    });
    return new Promise((resolve) => {
      const modal = ensureModal();
      const finalize = (value) => {
        modal.removeEventListener('click', onClick);
        resolve(value);
      };
      const onClick = (event) => {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        if (actionEl.dataset.action === 'confirm-choice') {
          const select = modal.querySelector('[data-role="choice-select"]');
          closeModal();
          finalize(select?.value ?? '');
        }
        if (actionEl.dataset.action === 'close-modal') {
          finalize(null);
        }
      };
      modal.addEventListener('click', onClick);
    });
  };

  const removeChatMeta = (key) => {
    delete state.chatFolder[key];
    delete state.chatTags[key];
    delete state.chatSummary[key];
    delete state.chatTitleOverride[key];
    state.pinnedChats = state.pinnedChats.filter((item) => item !== key);
    state.selectedChats.delete(key);
  };

  const migrateChatMeta = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    if (state.chatFolder[fromKey]) state.chatFolder[toKey] = state.chatFolder[fromKey];
    if (state.chatTags[fromKey]) state.chatTags[toKey] = [...state.chatTags[fromKey]];
    if (state.chatSummary[fromKey]) state.chatSummary[toKey] = state.chatSummary[fromKey];
    if (state.chatTitleOverride[fromKey]) state.chatTitleOverride[toKey] = state.chatTitleOverride[fromKey];
    if (state.pinnedChats.includes(fromKey)) {
      state.pinnedChats = state.pinnedChats.filter((item) => item !== fromKey);
      if (!state.pinnedChats.includes(toKey)) state.pinnedChats.push(toKey);
    }
    if (state.selectedChats.has(fromKey)) {
      state.selectedChats.delete(fromKey);
      state.selectedChats.add(toKey);
    }
    removeChatMeta(fromKey);
  };

  const render = () => {
    if (!rootEl) return;
    sortChats();
    const panel = rootEl.querySelector('.wtl-chat-manager-panel');
    const chevron = rootEl.querySelector('[data-role="chevron"]');
    const subtitle = rootEl.querySelector('[data-role="subtitle"]');
    const countEl = rootEl.querySelector('[data-role="count"]');
    const isOpen = panel?.classList.contains('is-open');
    const filteredChats = getFilteredChats();
    const filterItems = renderFilters();
    const totalPages = clampCurrentPage(filteredChats.length);
    const pageSize = getPageSize();
    const startIndex = (state.currentPage - 1) * pageSize;
    const pagedChats = filteredChats.slice(startIndex, startIndex + pageSize);

    if (countEl) countEl.textContent = `${chats.length} 条`;
    if (subtitle) subtitle.textContent = isLoaded ? `管理 ${chats.length} 条聊天记录` : '点击载入欢迎页聊天记录';
    if (chevron) chevron.className = `fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`;
    if (!panel) return;

    const tabs = [
      { key: 'time', label: '最近' },
      { key: 'character', label: '角色' },
      { key: 'folder', label: '分组' },
      { key: 'tag', label: '标签' }
    ];

    const tabHtml = tabs.map((tab) => `
      <button type="button" class="wtl-chat-manager-btn ${state.viewMode === tab.key ? 'is-active' : ''}" data-action="view" data-view="${tab.key}">${tab.label}</button>
    `).join('');

    const filterHtml = filterItems.map((item) => `
      <button type="button" class="wtl-chat-manager-pill ${state.activeFilter === item ? 'is-active' : ''}" data-action="filter" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>
    `).join('');

    const listHtml = pagedChats.length ? pagedChats.map((chat) => {
      const key = chat.globalKey;
      const folder = state.chatFolder[key] || '未分类';
      const tags = state.chatTags[key] || [];
      const summary = state.chatSummary[key] || '';
      const title = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');
      const isPinned = state.pinnedChats.includes(key);
      const checked = state.selectedChats.has(key) ? 'checked' : '';
      const metaChips = [
        `<span class="wtl-chat-manager-meta-chip"><i class="fa-regular fa-folder"></i>${escapeHtml(folder)}</span>`,
        ...tags.map((tag) => `<span class="wtl-chat-manager-meta-chip"><i class="fa-solid fa-tag"></i>${escapeHtml(tag)}</span>`)
      ].join('');
      return `
        <article class="wtl-chat-manager-card ${isPinned ? 'is-pinned' : ''}" data-key="${escapeHtml(key)}">
          <label class="wtl-chat-manager-check"><input type="checkbox" data-action="select" data-key="${escapeHtml(key)}" ${checked} /></label>
          <div class="wtl-chat-manager-card-main">
            <div class="wtl-chat-manager-card-main-body">
              <div class="wtl-chat-manager-card-top">
                <div>
                  <button type="button" class="wtl-chat-manager-title-btn" data-action="open-chat" data-char="${escapeHtml(chat.charId)}" data-file="${escapeHtml(chat.fileName)}">${escapeHtml(title)}</button>
                  <div class="wtl-chat-manager-meta">@${escapeHtml(chat.character)} · ${escapeHtml(chat.fileName)}</div>
                </div>
                <div class="wtl-chat-manager-card-time">${escapeHtml(formatTime(chat.timestamp))}</div>
              </div>
              ${summary ? `<div class="wtl-chat-manager-summary">${escapeHtml(summary)}</div>` : ''}
              <div class="wtl-chat-manager-preview">${escapeHtml(chat.preview || '暂无预览')}</div>
              <div class="wtl-chat-manager-meta-row">${metaChips}</div>
            </div>
            <div class="wtl-chat-manager-actions">
              <button type="button" class="wtl-chat-manager-mini" title="预览" data-action="preview" data-char="${escapeHtml(chat.charId)}" data-file="${escapeHtml(chat.fileName)}"><i class="fa-solid fa-eye"></i></button>
              <button type="button" class="wtl-chat-manager-mini" title="设置标签" data-action="set-tag" data-key="${escapeHtml(key)}"><i class="fa-solid fa-tag"></i></button>
              <button type="button" class="wtl-chat-manager-mini" title="设置分组" data-action="set-folder" data-key="${escapeHtml(key)}"><i class="fa-regular fa-folder"></i></button>
              <button type="button" class="wtl-chat-manager-mini" title="编辑标题和简介" data-action="edit-chat" data-key="${escapeHtml(key)}"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="wtl-chat-manager-mini ${isPinned ? 'is-active' : ''}" title="置顶" data-action="toggle-pin" data-key="${escapeHtml(key)}"><i class="fa-solid fa-thumbtack"></i></button>
              <button type="button" class="wtl-chat-manager-mini" title="删除聊天" data-action="delete-chat" data-key="${escapeHtml(key)}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </article>
      `;
    }).join('') : `<div class="wtl-chat-manager-empty">当前筛选下没有聊天记录。</div>`;

    const paginationHtml = filteredChats.length > pageSize ? `
      <div class="wtl-chat-manager-pagination">
        <div class="wtl-chat-manager-pagination-main">
          <span class="wtl-chat-manager-count">第 ${state.currentPage} / ${totalPages} 页</span>
          <span class="wtl-chat-manager-count">当前显示 ${startIndex + 1}-${Math.min(startIndex + pagedChats.length, filteredChats.length)} / ${filteredChats.length}</span>
        </div>
        <div class="wtl-chat-manager-pagination-main">
          <button type="button" class="wtl-chat-manager-btn" data-action="page-prev" ${state.currentPage <= 1 ? 'disabled' : ''}>上一页</button>
          <button type="button" class="wtl-chat-manager-btn" data-action="page-next" ${state.currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
        </div>
      </div>
    ` : '';

    const batchHtml = state.isBatchMode ? `
      <div class="wtl-chat-manager-batchbar">
        <div class="wtl-chat-manager-count">已选择 ${state.selectedChats.size} 条聊天</div>
        <div class="wtl-chat-manager-summary-row">
          <button type="button" class="wtl-chat-manager-btn" data-action="batch-folder">设分组</button>
          <button type="button" class="wtl-chat-manager-btn" data-action="batch-tag-add">加标签</button>
          <button type="button" class="wtl-chat-manager-btn" data-action="batch-tag-remove">删标签</button>
        </div>
      </div>
    ` : '';

    panel.classList.toggle('is-batch', state.isBatchMode);
    panel.innerHTML = `
      <div class="wtl-chat-manager-toolbar">
        <div class="wtl-chat-manager-toolbar-main">
          <div class="wtl-chat-manager-tabs">${tabHtml}</div>
          <input type="search" class="wtl-chat-manager-search" placeholder="搜索标题、角色、简介或预览..." value="${escapeHtml(state.searchQuery || '')}" data-action="search" />
        </div>
      </div>
      ${filterItems.length ? `<div class="wtl-chat-manager-filters">${filterHtml}</div>` : ''}
      <div class="wtl-chat-manager-summary-row">
        <div class="wtl-chat-manager-count">当前显示 ${pagedChats.length} / ${filteredChats.length}（总计 ${chats.length}）</div>
      </div>
      <div class="wtl-chat-manager-list">${listHtml}</div>
      ${paginationHtml}
      ${batchHtml}
    `;
  };

  const getChatByKey = (key) => chats.find((item) => item.globalKey === key);

  const refreshChats = async ({ silent = false } = {}) => {
    if (!silent) setStatus?.('聊天管理载入中');
    try {
      chats = await fetchAllChats();
      isLoaded = true;
      sortChats();
      render();
      if (!silent) notifyStatus?.('success', `聊天管理已载入 ${chats.length} 条记录`);
    } catch (err) {
      console.warn('[WorldTreeLibrary] refresh chats failed', err);
      notifyStatus?.('error', '聊天管理载入失败');
    } finally {
      if (!silent) setStatus?.('空闲');
    }
  };

  const toggleOpen = async () => {
    if (!rootEl) return;
    const panel = rootEl.querySelector('.wtl-chat-manager-panel');
    if (!panel) return;
    const nextOpen = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', nextOpen);
    if (nextOpen && !isLoaded) {
      panel.innerHTML = '<div class="wtl-chat-manager-empty">正在拉取聊天记录...</div>';
      await refreshChats({ silent: true });
    }
    render();
  };

  const promptText = (message, value = '') => window.prompt(message, value);

  const saveAndRender = () => {
    save();
    render();
  };

  const editTitle = async (key) => {
    const chat = getChatByKey(key);
    if (!chat) return;
    const current = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');
    const next = await requestInput({ title: '修改自定义标题', value: current });
    if (next === null) return;
    if (!String(next).trim()) delete state.chatTitleOverride[key];
    else state.chatTitleOverride[key] = String(next).trim();
    saveAndRender();
  };

  const editSummary = async (key) => {
    const next = await requestInput({ title: '修改一句话简介', value: state.chatSummary[key] || '', multiline: true });
    if (next === null) return;
    if (!String(next).trim()) delete state.chatSummary[key];
    else state.chatSummary[key] = String(next).trim();
    saveAndRender();
  };

  const editChat = async (key) => {
    await editTitle(key);
    await editSummary(key);
  };

  const setFolder = async (key, targetFolder = null) => {
    let folder = targetFolder;
    if (!folder) {
      folder = await chooseFromList({
        title: '选择分组',
        items: state.folders,
        currentValue: state.chatFolder[key] || '',
        allowEmpty: true,
        emptyLabel: '未分类'
      });
    }
    if (folder === null) return;
    const clean = String(folder).trim();
    if (!clean) delete state.chatFolder[key];
    else state.chatFolder[key] = clean;
    saveAndRender();
  };

  const setTag = async (key) => {
    const currentTags = state.chatTags[key] || [];
    const selectHtml = state.tags.map((tag) => {
      const checked = currentTags.includes(tag) ? 'checked' : '';
      return `
        <label class="wtl-chat-manager-tag-option">
          <input type="checkbox" value="${escapeHtml(tag)}" ${checked} data-role="tag-option" />
          <span class="wtl-chat-manager-tag-option-text">${escapeHtml(tag)}</span>
        </label>
      `;
    }).join('') || '<div class="wtl-chat-manager-empty">当前没有可用标签，请先在设置里创建。</div>';
    openModal({
      title: '设置标签',
      body: `<div class="wtl-chat-manager-tag-grid">${selectHtml}</div>`,
      actions: `
        <button type="button" class="menu_button" data-action="close-modal">取消</button>
        <button type="button" class="menu_button" data-action="confirm-tags" data-key="${escapeHtml(key)}">保存</button>
      `
    });
  };

  const saveSelectedTags = (key) => {
    const modal = ensureModal();
    const values = Array.from(modal.querySelectorAll('[data-role="tag-option"]:checked')).map((el) => el.value).filter(Boolean);
    if (values.length) state.chatTags[key] = values;
    else delete state.chatTags[key];
    saveAndRender();
  };

  const clampCurrentPage = (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / getPageSize()));
    state.currentPage = Math.min(Math.max(1, Number.parseInt(state.currentPage, 10) || 1), totalPages);
    return totalPages;
  };

  const togglePin = (key) => {
    if (state.pinnedChats.includes(key)) state.pinnedChats = state.pinnedChats.filter((item) => item !== key);
    else state.pinnedChats.push(key);
    saveAndRender();
  };

  const setSelected = (key, checked) => {
    if (checked) state.selectedChats.add(key);
    else state.selectedChats.delete(key);
    render();
  };

  const goToPage = (nextPage) => {
    state.currentPage = Math.max(1, Number.parseInt(nextPage, 10) || 1);
    render();
  };

  const ensureSelection = () => {
    if (state.selectedChats.size) return true;
    notifyStatus?.('warning', '请先选择至少一条聊天');
    return false;
  };

  const openSettings = () => {
    const folderRows = state.folders.map((folder, index) => `
      <div style="display:flex; gap:8px; align-items:center;">
        <input class="wtl-chat-manager-input" data-role="folder-name" data-index="${index}" value="${escapeHtml(folder)}" />
        <button type="button" class="wtl-chat-manager-mini" data-action="remove-folder-row" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join('');
    const tagRows = state.tags.map((tag, index) => `
      <div style="display:flex; gap:8px; align-items:center;">
        <input class="wtl-chat-manager-input" data-role="tag-name" data-index="${index}" value="${escapeHtml(tag)}" />
        <button type="button" class="wtl-chat-manager-mini" data-action="remove-tag-row" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join('');
    openModal({
      title: '聊天管理设置',
      body: `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label>预览最近楼层数</label>
            <input class="wtl-chat-manager-input" type="number" min="1" max="50" data-role="preview-count" value="${escapeHtml(getPreviewCount())}" />
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label>每页显示聊天数</label>
            <input class="wtl-chat-manager-input" type="number" min="1" max="100" data-role="page-size" value="${escapeHtml(getPageSize())}" />
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;"><strong>文件夹</strong><button type="button" class="wtl-chat-manager-btn" data-action="add-folder-row">新增文件夹</button></div>
            <div data-role="folder-list" style="display:flex; flex-direction:column; gap:8px;">${folderRows}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;"><strong>标签</strong><button type="button" class="wtl-chat-manager-btn" data-action="add-tag-row">新增标签</button></div>
            <div data-role="tag-list" style="display:flex; flex-direction:column; gap:8px;">${tagRows}</div>
          </div>
        </div>
      `,
      actions: `
        <button type="button" class="menu_button" data-action="close-modal">取消</button>
        <button type="button" class="menu_button" data-action="save-settings">保存设置</button>
      `
    });
  };

  const appendSettingsRow = (role, value = '') => {
    const modal = ensureModal();
    const list = modal.querySelector(`[data-role="${role}-list"]`);
    if (!list) return;
    const index = list.children.length;
    const label = role === 'folder' ? 'folder-name' : 'tag-name';
    const removeAction = role === 'folder' ? 'remove-folder-row' : 'remove-tag-row';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; align-items:center;';
    row.innerHTML = `<input class="wtl-chat-manager-input" data-role="${label}" data-index="${index}" value="${escapeHtml(value)}" /><button type="button" class="wtl-chat-manager-mini" data-action="${removeAction}" data-index="${index}"><i class="fa-solid fa-trash"></i></button>`;
    list.appendChild(row);
  };

  const removeSettingsRow = (role, index) => {
    const modal = ensureModal();
    const list = modal.querySelector(`[data-role="${role}-list"]`);
    const child = list?.children?.[Number(index)];
    if (child) child.remove();
  };

  const saveSettings = () => {
    const modal = ensureModal();
    const nextPreview = Math.max(1, Number.parseInt(modal.querySelector('[data-role="preview-count"]')?.value, 10) || 6);
    const nextPageSize = Math.max(1, Number.parseInt(modal.querySelector('[data-role="page-size"]')?.value, 10) || 20);
    const nextFolders = Array.from(modal.querySelectorAll('[data-role="folder-name"]')).map((el) => el.value.trim()).filter(Boolean);
    const nextTags = Array.from(modal.querySelectorAll('[data-role="tag-name"]')).map((el) => el.value.trim()).filter(Boolean);
    state.previewCount = nextPreview;
    state.pageSize = nextPageSize;
    state.folders = Array.from(new Set(nextFolders));
    state.tags = Array.from(new Set(nextTags));
    state.currentPage = 1;
    Object.keys(state.chatFolder).forEach((key) => {
      if (!state.folders.includes(state.chatFolder[key])) delete state.chatFolder[key];
    });
    Object.keys(state.chatTags).forEach((key) => {
      state.chatTags[key] = (state.chatTags[key] || []).filter((tag) => state.tags.includes(tag));
      if (!state.chatTags[key].length) delete state.chatTags[key];
    });
    closeModal();
    saveAndRender();
  };

  const previewChat = async (charId, fileName) => {
    const normalizedFileName = String(fileName || '').replace(/\.jsonl$/i, '');
    openModal({
      title: normalizedFileName,
      body: '<div class="wtl-chat-manager-empty">正在读取最近消息...</div>',
      actions: `<button type="button" class="menu_button" data-action="jump-chat" data-char="${escapeHtml(charId)}" data-file="${escapeHtml(normalizedFileName)}">跳转到此聊天</button>`
    });
    const lines = await fetchChatContent(charId, normalizedFileName);
    const recent = (lines || []).filter((item) => String(item?.mes || item?.message || '').trim()).slice(-getPreviewCount());
    const body = recent.length ? recent.map((item) => {
      const isUser = item?.is_user === true || item?.is_user === 'true';
      const sender = item?.name || item?.sender || (isUser ? 'You' : charId);
      const message = escapeHtml(String(item?.mes || item?.message || '')).replace(/\n/g, '<br>');
      return `
        <div class="wtl-chat-manager-message ${isUser ? 'is-user' : ''}">
          <div class="wtl-chat-manager-message-name">${escapeHtml(sender)}</div>
          <div>${message}</div>
        </div>
      `;
    }).join('') : '<div class="wtl-chat-manager-empty">未读取到可预览消息。</div>';

    const modal = ensureModal();
    const bodyEl = modal.querySelector('[data-role="body"]');
    if (bodyEl) bodyEl.innerHTML = body;
  };

  const openChat = async (charId, fileName) => {
    const ctx = window.SillyTavern?.getContext?.();
    if (!ctx?.openCharacterChat) {
      notifyStatus?.('warning', '当前环境未提供原生聊天跳转接口');
      return;
    }
    try {
      const characters = await fetchCharacters(ctx);
      const currentChar = characters?.[window.this_chid];
      if ((currentChar?.avatar || currentChar?.name) !== charId && typeof ctx.selectCharacterById === 'function') {
        const charIndex = characters.findIndex((item) => (item?.avatar || item?.name) === charId || item?.name === charId);
        if (charIndex >= 0) await ctx.selectCharacterById(charIndex);
      }
      await ctx.openCharacterChat(fileName);
      closeModal();
      const panel = rootEl?.querySelector('.wtl-chat-manager-panel');
      panel?.classList.remove('is-open');
      render();
    } catch (err) {
      console.warn('[WorldTreeLibrary] open chat failed', err);
      notifyStatus?.('error', '跳转聊天失败');
    }
  };

  const renameChatFile = async (chat, nextName) => {
    const clean = String(nextName || '').trim();
    const currentName = String(chat.fileName || '').replace(/\.jsonl$/i, '');
    if (!clean || clean === currentName) return false;
    await renameGroupOrCharacterChat({
      characterId: String(chat.characterIndex),
      oldFileName: currentName,
      newFileName: clean,
      loader: false
    });
    return clean;
  };

  const deleteChatFile = async (chat) => {
    await deleteCharacterChatByName(String(chat.characterIndex), String(chat.fileName || '').replace(/\.jsonl$/i, ''));
  };

  const requestDeleteChat = async (key) => {
    const chat = getChatByKey(key);
    if (!chat) return;
    const confirmed = await requestConfirm({ title: '删除聊天记录', message: '删除这个聊天记录？此操作不可撤销。', okText: '删除' });
    if (!confirmed) return;
    try {
      await deleteChatFile(chat);
      chats = chats.filter((item) => item.globalKey !== key);
      removeChatMeta(key);
      saveAndRender();
      notifyStatus?.('success', '聊天记录已删除');
    } catch (err) {
      console.warn('[WorldTreeLibrary] delete chat failed', err);
      notifyStatus?.('error', '删除聊天记录失败');
    }
  };

  const createFilter = () => {
    const type = state.viewMode === 'folder' ? '分组' : state.viewMode === 'tag' ? '标签' : '';
    if (!type) return;
    const input = promptText(`输入新的${type}名称`, '');
    if (input === null) return;
    const clean = String(input).trim();
    if (!clean) return;
    if (type === '分组' && !state.folders.includes(clean)) state.folders.push(clean);
    if (type === '标签' && !state.tags.includes(clean)) state.tags.push(clean);
    saveAndRender();
  };

  const handleBatch = (mode) => {
    if (!ensureSelection()) return;
    if (mode === 'folder') {
      const value = promptText(`为 ${state.selectedChats.size} 条聊天设置分组`, state.folders[0] || '');
      if (value === null) return;
      const clean = String(value).trim();
      if (!clean) return;
      if (!state.folders.includes(clean)) state.folders.push(clean);
      state.selectedChats.forEach((key) => {
        state.chatFolder[key] = clean;
      });
    }
    if (mode === 'tag-add') {
      const value = promptText(`为 ${state.selectedChats.size} 条聊天添加标签`, '');
      if (value === null) return;
      const clean = String(value).trim();
      if (!clean) return;
      if (!state.tags.includes(clean)) state.tags.push(clean);
      state.selectedChats.forEach((key) => {
        state.chatTags[key] = Array.isArray(state.chatTags[key]) ? state.chatTags[key] : [];
        if (!state.chatTags[key].includes(clean)) state.chatTags[key].push(clean);
      });
    }
    if (mode === 'tag-remove') {
      const value = promptText(`为 ${state.selectedChats.size} 条聊天移除标签`, '');
      if (value === null) return;
      const clean = String(value).trim();
      if (!clean) return;
      state.selectedChats.forEach((key) => {
        state.chatTags[key] = (state.chatTags[key] || []).filter((item) => item !== clean);
      });
    }
    state.isBatchMode = false;
    state.selectedChats.clear();
    saveAndRender();
  };

  const handleAction = async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'toggle-panel') {
      await toggleOpen();
      return;
    }
    if (action === 'close-modal') {
      closeModal();
      return;
    }
    if (action === 'refresh') {
      await refreshChats();
      return;
    }
    if (action === 'toggle-batch') {
      state.isBatchMode = !state.isBatchMode;
      state.selectedChats.clear();
      render();
      return;
    }
    if (action === 'view') {
      state.viewMode = actionEl.dataset.view || 'time';
      state.activeFilter = '全部';
      state.currentPage = 1;
      state.selectedChats.clear();
      state.isBatchMode = false;
      render();
      return;
    }
    if (action === 'filter') {
      state.activeFilter = actionEl.dataset.value || '全部';
      state.currentPage = 1;
      render();
      return;
    }
    if (action === 'create-filter') {
      createFilter();
      return;
    }
    if (action === 'settings') {
      openSettings();
      return;
    }
    if (action === 'edit-title') {
      await editTitle(actionEl.dataset.key || '');
      return;
    }
    if (action === 'edit-summary') {
      await editSummary(actionEl.dataset.key || '');
      return;
    }
    if (action === 'edit-chat') {
      const key = actionEl.dataset.key || '';
      const chat = getChatByKey(key);
      if (!chat) return;
      const currentTitle = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');
      const nextTitle = await requestInput({ title: '修改聊天标题（会同时重命名聊天文件）', value: currentTitle });
      if (nextTitle === null) return;
      const nextSummary = await requestInput({ title: '修改聊天简介（留空则清除）', value: state.chatSummary[key] || '', multiline: true });
      if (nextSummary === null) return;
      try {
        const oldKey = chat.globalKey;
        const renamed = await renameChatFile(chat, nextTitle);
        if (renamed) {
          chat.fileName = renamed;
          chat.globalKey = `${chat.charId}|${renamed}`;
          migrateChatMeta(oldKey, chat.globalKey);
          delete state.chatTitleOverride[chat.globalKey];
        } else {
          const trimmedTitle = String(nextTitle || '').trim();
          if (!trimmedTitle || trimmedTitle === String(chat.fileName || '').replace(/\.jsonl$/i, '')) {
            delete state.chatTitleOverride[chat.globalKey];
          } else {
            state.chatTitleOverride[chat.globalKey] = trimmedTitle;
          }
        }
        if (String(nextSummary).trim()) state.chatSummary[chat.globalKey] = String(nextSummary).trim();
        else delete state.chatSummary[chat.globalKey];
        saveAndRender();
        notifyStatus?.('success', '聊天记录已更新');
      } catch (err) {
        console.warn('[WorldTreeLibrary] edit chat failed', err);
        notifyStatus?.('error', '修改聊天记录失败');
      }
      return;
    }
    if (action === 'set-folder') {
      await setFolder(actionEl.dataset.key || '');
      return;
    }
    if (action === 'set-tag') {
      await setTag(actionEl.dataset.key || '');
      return;
    }
    if (action === 'confirm-tags') {
      saveSelectedTags(actionEl.dataset.key || '');
      closeModal();
      return;
    }
    if (action === 'toggle-pin') {
      togglePin(actionEl.dataset.key || '');
      return;
    }
    if (action === 'preview') {
      await previewChat(actionEl.dataset.char || '', actionEl.dataset.file || '');
      return;
    }
    if (action === 'open-chat' || action === 'jump-chat') {
      await openChat(actionEl.dataset.char || '', actionEl.dataset.file || '');
      return;
    }
    if (action === 'delete-chat') {
      await requestDeleteChat(actionEl.dataset.key || '');
      return;
    }
    if (action === 'add-folder-row') {
      appendSettingsRow('folder');
      return;
    }
    if (action === 'add-tag-row') {
      appendSettingsRow('tag');
      return;
    }
    if (action === 'remove-folder-row') {
      removeSettingsRow('folder', actionEl.dataset.index);
      return;
    }
    if (action === 'remove-tag-row') {
      removeSettingsRow('tag', actionEl.dataset.index);
      return;
    }
    if (action === 'save-settings') {
      saveSettings();
      return;
    }
    if (action === 'page-prev') {
      goToPage(state.currentPage - 1);
      return;
    }
    if (action === 'page-next') {
      goToPage(state.currentPage + 1);
      return;
    }
    if (action === 'batch-folder') {
      handleBatch('folder');
      return;
    }
    if (action === 'batch-tag-add') {
      handleBatch('tag-add');
      return;
    }
    if (action === 'batch-tag-remove') {
      handleBatch('tag-remove');
    }
  };

  const handleInput = (event) => {
    const actionEl = event.target.closest('[data-action="search"]');
    if (!actionEl) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchQuery = actionEl.value || '';
      state.currentPage = 1;
      render();
    }, 180);
  };

  const handleChange = (event) => {
    const actionEl = event.target.closest('[data-action="select"]');
    if (!actionEl) return;
    setSelected(actionEl.dataset.key || '', Boolean(actionEl.checked));
  };

  const injectHost = ({ renderAfter = true } = {}) => {
    if (!enabled) return;
    const welcomePanel = document.querySelector('.welcomePanel');
    if (!welcomePanel) return;
    const recentWrap = welcomePanel.querySelector('.welcomeRecent') || welcomePanel;
    let host = document.getElementById(CHAT_MANAGER_ROOT_ID);
    let created = false;
    if (!host) {
      created = true;
      host = document.createElement('section');
      host.id = CHAT_MANAGER_ROOT_ID;
      host.className = 'wtl-chat-manager-shell';
      host.innerHTML = `
        <button type="button" class="wtl-chat-manager-toggle" data-action="toggle-panel">
          <span class="wtl-chat-manager-toggle-main">
            <span class="wtl-chat-manager-toggle-copy">
              <span class="wtl-chat-manager-toggle-title">聊天管理</span>
              <span class="wtl-chat-manager-toggle-subtitle" data-role="subtitle">点击载入欢迎页聊天记录</span>
            </span>
          </span>
          <span class="wtl-chat-manager-toggle-tools">
            <button type="button" class="wtl-chat-manager-mini ${state.isBatchMode ? 'is-active' : ''}" title="批量" data-action="toggle-batch"><i class="fa-solid fa-check-double"></i></button>
            <button type="button" class="wtl-chat-manager-mini" title="刷新" data-action="refresh"><i class="fa-solid fa-rotate-right"></i></button>
            <button type="button" class="wtl-chat-manager-mini" title="设置" data-action="settings"><i class="fa-solid fa-gear"></i></button>
          </span>
          <span class="wtl-chat-manager-toggle-count">
            <span class="wtl-chat-manager-count" data-role="count">0 条</span>
          </span>
          <span class="wtl-chat-manager-toggle-chevron"><i class="fa-solid fa-chevron-down" data-role="chevron"></i></span>
        </button>
        <div class="wtl-chat-manager-panel"></div>
      `;
      recentWrap.appendChild(host);
      host.addEventListener('click', handleAction);
      host.addEventListener('input', handleInput);
      host.addEventListener('change', handleChange);
    }
    rootEl = host;
    if (renderAfter || created) render();
  };

  const removeHost = () => {
    if (rootEl) {
      rootEl.removeEventListener('click', handleAction);
      rootEl.removeEventListener('input', handleInput);
      rootEl.removeEventListener('change', handleChange);
      rootEl.remove();
      rootEl = null;
    }
    closeModal();
  };

  const ensureObserver = () => {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (!enabled) return;
      if (!document.getElementById(CHAT_MANAGER_ROOT_ID)) {
        injectHost({ renderAfter: false });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  return {
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      ensureStyles();
      ensureModal();
      ensureObserver();
      if (enabled) injectHost();
      else removeHost();
    },
    async refresh() {
      await refreshChats();
    }
  };
}
