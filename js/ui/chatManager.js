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
/* 整体外壳 */
.wtl-chat-manager-shell {
  margin-top: 15px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  background: var(--SmartThemeBlurTintColor);
  backdrop-filter: blur(10px);
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

/* 顶部核心控制行 */
.wtl-chat-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
  gap: 8px;
}
.wtl-chat-manager-header:hover {
  border-bottom: 1px solid var(--SmartThemeBorderColor);
}

.wtl-chat-manager-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.wtl-chat-manager-title {
  font-weight: 700;
  color: var(--SmartThemeBodyColor);
  white-space: nowrap;
}
.wtl-chat-manager-subtitle {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wtl-chat-manager-header-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}
.wtl-chat-manager-count {
  font-size: 12px;
  opacity: 0.8;
  margin-right: 6px;
  white-space: nowrap;
}
.wtl-chat-manager-icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--SmartThemeBodyColor);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s;
  opacity: 0.7;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  white-space: nowrap;
}
.wtl-chat-manager-icon-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--SmartThemeBorderColor);
}
.wtl-chat-manager-icon-btn.is-active {
  color: var(--SmartThemeEmColor, #61afef);
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.wtl-chat-manager-panel {
  display: none;
  padding: 12px;
}
.wtl-chat-manager-panel.is-open {
  display: block;
}

.wtl-chat-manager-toolbar, .wtl-chat-manager-filters, .wtl-chat-manager-tabs, .wtl-chat-manager-batchbar {
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.wtl-chat-manager-toolbar { margin-bottom: 10px; justify-content: space-between; }
.wtl-chat-manager-filters { margin-bottom: 10px; }

.wtl-chat-manager-search, .wtl-chat-manager-input, .wtl-chat-manager-textarea, .wtl-chat-manager-select {
  width: 100%;
  background: rgba(0,0,0,0.3);
  color: var(--SmartThemeBodyColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  padding: 6px 10px;
  box-sizing: border-box;
}
.wtl-chat-manager-search { flex: 1 1 200px; min-width: 120px; }





/* Edge风格标签页样式 - 用于二级菜单，与聊天记录模块融合 */
.wtl-chat-manager-filters {
  position: relative;
  margin-bottom: 0;
  z-index: 1;
  border-radius: 12px 12px 0 0;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.wtl-chat-manager-filters .wtl-edge-pills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 4px 4px 0 4px;
  position: relative;
}

.wtl-chat-manager-filters .wtl-edge-pill {
  border: none;
  background: transparent;
  color: var(--SmartThemeBodyColor);
  padding: 8px 16px;
  cursor: pointer;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  position: relative;
  z-index: 1;
  border-radius: 8px 8px 0 0;
  margin: 0 2px;
  transition: color 0.2s ease, background 0.2s ease;
}

.wtl-chat-manager-filters .wtl-edge-pill:hover {
  background: rgba(255, 255, 255, 0.1);
}

.wtl-chat-manager-filters .wtl-edge-pill.is-active {
  color: var(--SmartThemeBodyColor);
  font-weight: 600;
  background: var(--SmartThemeBlurTintColor);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  border-bottom: none;
  position: relative;
  z-index: 2;
}

.wtl-chat-manager-filters .wtl-edge-pill.is-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--SmartThemeBlurTintColor);
  z-index: 3;
}

/* Edge风格选项卡背景（融合效果） */
.wtl-chat-manager-filters .wtl-edge-pill-background {
  position: absolute;
  top: 4px;
  bottom: 0;
  background: var(--SmartThemeBlurTintColor);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 0;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

/* 聊天记录模块与标签页融合 */
.wtl-chat-manager-list {
  background: var(--SmartThemeBlurTintColor);
  border-radius: 0 0 12px 12px;
  margin-top: -1px; /* 与标签页重叠1像素 */
  padding: 16px;
  position: relative;
  z-index: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 传统按钮样式 */
.wtl-chat-manager-btn, .wtl-chat-manager-pill, .wtl-chat-manager-mini {
  border: 1px solid var(--SmartThemeBorderColor);
  background: rgba(255,255,255,0.05);
  color: var(--SmartThemeBodyColor);
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
}
.wtl-chat-manager-btn:hover, .wtl-chat-manager-pill:hover { background: rgba(255,255,255,0.1); }
.wtl-chat-manager-pill.is-active, .wtl-chat-manager-btn.is-active {
  background: var(--SmartThemeBorderColor);
  font-weight: bold;
}

/* === 聊天卡片终极布局 === */
.wtl-chat-manager-card {
  position: relative;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 74%, transparent);
  padding: 10px 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  transition: 0.2s;
}
.wtl-chat-manager-card.is-pinned {
  border-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 56%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 78%, transparent));
}
.wtl-chat-manager-check { display: none; align-items: center; }
.wtl-chat-manager-panel.is-batch .wtl-chat-manager-check { display: flex; }

.wtl-chat-title-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex: 0 0 auto;
}
.wtl-chat-title-tools button {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  color: var(--SmartThemeBodyColor);
  opacity: 0.4;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s;
}
.wtl-chat-title-tools button:hover { opacity: 1; transform: scale(1.1); }
.wtl-chat-title-tools button.is-active { color: var(--SmartThemeQuoteColor, #e5c07b); opacity: 1; }

.wtl-chat-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.wtl-chat-card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.wtl-chat-card-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: bold;
  color: var(--SmartThemeEmColor, #61afef);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 0;
}
.wtl-chat-card-title:hover { text-decoration: underline; }
.wtl-chat-card-time {
  text-align: right;
  flex: 0 0 auto;
  font-size: 11px;
  opacity: 0.5;
}
.wtl-chat-card-summary {
  font-size: 12px;
  color: var(--SmartThemeQuoteColor, #e5c07b);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 1px 0;
}
.wtl-chat-card-preview { font-size: 11px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wtl-chat-card-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; opacity: 0.75; }
.wtl-chat-card-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  min-width: 0;
}
.wtl-chat-card-badges {
  flex: 1;
  min-width: 0;
}
.wtl-chat-card-filename {
  margin-left: auto;
  flex: 0 0 auto;
  font-size: 10px;
  opacity: 0.35;
  text-align: right;
  font-family: monospace;
  white-space: nowrap;
}

.wtl-chat-manager-meta-chip {
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  border: 1px solid var(--SmartThemeBorderColor);
}

.wtl-chat-card-grid {
  display: grid;
  grid-template-columns: 36px 36px;
  grid-template-rows: 36px 36px;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}
.wtl-chat-card-grid button {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  background: color-mix(in srgb, var(--SmartThemeBodyColor) 5%, transparent);
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: 0.2s;
  writing-mode: horizontal-tb;
  white-space: nowrap;
}
.wtl-chat-card-grid button:hover { background: color-mix(in srgb, var(--SmartThemeBodyColor) 15%, transparent); }
.wtl-chat-btn-danger { border-color: rgba(224, 108, 117, 0.6) !important; color: #e06c75 !important; }
.wtl-chat-btn-danger:hover { background: rgba(224, 108, 117, 0.15) !important; border-color: #e06c75 !important; }

.wtl-chat-manager-batchbar {
  justify-content: space-between;
  padding: 8px 10px;
  margin-top: 10px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
}
.wtl-chat-manager-empty {
  text-align: center;
  padding: 20px;
  opacity: 0.6;
  font-style: italic;
}

  .wtl-chat-manager-modal {
    position: fixed; inset: 0; z-index: 50000;
    display: none; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(6px);
    padding: 16px; box-sizing: border-box;
    opacity: 0; transition: opacity 0.2s ease;
  }
  .wtl-chat-manager-modal.is-open {
    display: flex; opacity: 1;
  }
  .wtl-chat-manager-modal-card {
    width: 100%; max-width: 480px;
    max-height: 85vh; display: flex; flex-direction: column;
    border: 1px solid var(--SmartThemeBorderColor); border-radius: 16px;
    background: var(--SmartThemeBlurTintColor, #21252b);
    color: var(--SmartThemeBodyColor, #abb2bf);
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    transform: translateY(20px); transition: transform 0.2s ease;
    overflow: hidden;
  }
  .wtl-chat-manager-modal.is-open .wtl-chat-manager-modal-card {
    transform: translateY(0);
  }
  .wtl-chat-manager-modal-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 20px; background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--SmartThemeBorderColor);
    font-size: 16px; font-weight: bold; color: var(--SmartThemeEmColor, #61afef);
    flex-shrink: 0;
  }
  .wtl-chat-manager-modal-head button {
    background: transparent; border: none; color: inherit; opacity: 0.7;
    cursor: pointer; font-size: 20px; padding: 8px; transition: 0.2s;
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 8px;
    line-height: 1;
  }
  .wtl-chat-manager-modal-head button:hover {
    opacity: 1; color: #e06c75; background: rgba(224, 108, 117, 0.1); transform: scale(1.1);
  }
  .wtl-chat-manager-modal-body-wrap {
    flex: 1; overflow-y: auto; padding: 20px;
  }
  .wtl-chat-manager-modal-body {
    display: flex; flex-direction: column; gap: 16px;
  }
  .wtl-chat-manager-modal-input {
    width: 100%; box-sizing: border-box;
    background: rgba(0,0,0,0.3); color: var(--SmartThemeBodyColor);
    border: 1px solid var(--SmartThemeBorderColor); border-radius: 8px;
    padding: 10px 12px; font-size: 14px; transition: border-color 0.2s;
  }
  .wtl-chat-manager-modal-input:focus {
    border-color: var(--SmartThemeEmColor, #61afef); outline: none;
  }
  textarea.wtl-chat-manager-modal-input {
    min-height: 80px; resize: vertical; line-height: 1.5;
  }
  .wtl-chat-manager-tag-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;
  }
  .wtl-chat-manager-tag-option {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border: 1px solid var(--SmartThemeBorderColor); border-radius: 8px;
    background: rgba(255,255,255,0.05); cursor: pointer; transition: 0.2s;
  }
  .wtl-chat-manager-tag-option:hover {
    background: rgba(255,255,255,0.1); border-color: var(--SmartThemeQuoteColor, #e5c07b);
  }
  .wtl-chat-manager-tag-option input[type="checkbox"] {
    accent-color: var(--SmartThemeQuoteColor, #c678dd); width: 16px; height: 16px; margin:0; cursor:pointer;
  }
  .wtl-chat-manager-tag-option-text {
    font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .wtl-chat-manager-modal-actions {
    display: flex; justify-content: flex-end; gap: 12px;
    padding: 16px 20px; background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid var(--SmartThemeBorderColor);
    flex-shrink: 0;
  }
  .wtl-chat-manager-modal-actions button {
    padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: bold;
    cursor: pointer; transition: 0.2s; border: 1px solid transparent;
  }
  .wtl-chat-manager-modal-actions button[data-action="close-modal"] {
    background: transparent; border-color: var(--SmartThemeBorderColor); color: var(--SmartThemeBodyColor);
  }
  .wtl-chat-manager-modal-actions button[data-action="close-modal"]:hover {
    background: rgba(255,255,255,0.1);
  }
  .wtl-chat-manager-modal-actions button:not([data-action="close-modal"]) {
    background: var(--SmartThemeEmColor, #61afef); color: #000;
  }
  .wtl-chat-manager-modal-actions button:not([data-action="close-modal"]):hover {
    filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(97, 175, 239, 0.3);
  }
  /* 酒馆风格按钮 */
  .menu_button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--SmartThemeBorderColor);
    background: rgba(255, 255, 255, 0.08);
    color: var(--SmartThemeBodyColor);
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 36px;
  }
  .menu_button:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--SmartThemeEmColor);
  }
  .menu_button:active {
    transform: translateY(1px);
  }
  .menu_button.primary {
    background: var(--SmartThemeEmColor);
    border-color: var(--SmartThemeEmColor);
    color: #000;
  }
  .menu_button.primary:hover {
    background: var(--SmartThemeEmColorHover, color-mix(in srgb, var(--SmartThemeEmColor) 90%, #000));
    border-color: var(--SmartThemeEmColorHover, color-mix(in srgb, var(--SmartThemeEmColor) 90%, #000));
  }
  /* 酒馆风格按钮 */
  .menu_button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--SmartThemeBorderColor);
    background: rgba(255, 255, 255, 0.08);
    color: var(--SmartThemeBodyColor);
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 36px;
  }
  .menu_button:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--SmartThemeEmColor);
  }
  .menu_button:active {
    transform: translateY(1px);
  }
  .menu_button.primary {
    background: var(--SmartThemeEmColor);
    border-color: var(--SmartThemeEmColor);
    color: #000;
  }
  .menu_button.primary:hover {
    background: var(--SmartThemeEmColorHover, color-mix(in srgb, var(--SmartThemeEmColor) 90%, #000));
    border-color: var(--SmartThemeEmColorHover, color-mix(in srgb, var(--SmartThemeEmColor) 90%, #000));
  }

.wtl-chat-manager-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  padding: 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  border: 1px solid var(--SmartThemeBorderColor);
}
.wtl-chat-manager-pagination-main { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.wtl-chat-manager-message {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--SmartThemeBorderColor);
  background: rgba(255,255,255,0.06);
  white-space: pre-wrap;
  line-height: 1.55;
}
.wtl-chat-manager-message.is-user {
  margin-left: auto;
  background: rgba(97, 174, 239, 0.12);
}
.wtl-chat-manager-message-name { font-size: 12px; opacity: 0.72; margin-bottom: 4px; }

@media (max-width: 768px) {
  .wtl-chat-manager-subtitle { display: none; }
  .wtl-chat-manager-toolbar { 
    flex-direction: row !important; 
    align-items: center !important;
    flex-wrap: wrap;
    gap: 8px;
  }
  .wtl-chat-manager-search { 
    width: auto !important; 
    flex: 1 1 180px;
    min-width: 120px;
  }
  .wtl-edge-tabs {
    flex-wrap: wrap;
    gap: 4px;
  }
  .wtl-edge-tab {
    padding: 8px 12px;
    font-size: 12px;
    margin-right: -6px;
    border-radius: 8px 8px 0 0;
  }
}
  .wtl-chat-manager-card { padding: 12px; gap: 8px; }
  .wtl-chat-card-grid { grid-template-columns: 32px 32px; grid-template-rows: 32px 32px; }
  .wtl-chat-card-title-row,
  .wtl-chat-card-meta-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .wtl-chat-card-time,
  .wtl-chat-card-filename {
    margin-left: 0;
  }
  .wtl-chat-manager-modal-card { 
    max-width: 100%; 
    max-height: 90vh; 
    border-radius: 12px; 
    margin: 0;
    width: calc(100% - 32px);
  }
  .wtl-chat-manager-modal {
    padding: 16px;
    align-items: center;
    justify-content: center;
  }
  .wtl-chat-manager-modal-head { 
    padding: 12px 16px; 
    font-size: 14px;
  }
  .wtl-chat-manager-modal-body-wrap { 
    padding: 16px; 
    max-height: calc(90vh - 120px);
  }
  .wtl-chat-manager-modal-actions { 
    padding: 12px 16px; 
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .wtl-chat-manager-modal-actions button {
    padding: 10px 16px;
    font-size: 13px;
    flex: 0 0 auto;
    min-width: 80px;
  }
  .wtl-chat-manager-tag-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  .wtl-chat-manager-tag-option {
    padding: 6px 8px;
    font-size: 12px;
  }
  .wtl-chat-manager-filters .wtl-edge-pill {
    padding: 6px 12px;
    font-size: 13px;
  }
  .wtl-chat-manager-modal-input {
    padding: 8px 10px;
    font-size: 13px;
  }
  textarea.wtl-chat-manager-modal-input {
    min-height: 60px;
  }
  .wtl-chat-manager-pagination { flex-direction: column; align-items: stretch; }
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
          <button type="button" data-action="close-modal" title="关闭">×</button>
        </div>
        <div class="wtl-chat-manager-modal-body-wrap">
        <textarea class="wtl-chat-manager-modal-input" data-role="content" style="display:none;"></textarea>
        <div class="wtl-chat-manager-modal-body" data-role="custom"></div>
        </div>
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

  const chooseFromList = async ({ title, items, currentValue = '', allowEmpty = false, emptyLabel = '未设置', type = 'select' }) => {
    if (type === 'tabs') {
      const tabsHtml = items.map((item) => `
        <button type="button" class="wtl-chat-manager-pill ${item === currentValue ? 'is-active' : ''}" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>
      `).join('');
      const emptyTab = allowEmpty ? `<button type="button" class="wtl-chat-manager-pill ${currentValue === '' ? 'is-active' : ''}" data-value="">${escapeHtml(emptyLabel)}</button>` : '';
      const html = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="font-weight: bold; font-size: 15px; color: var(--SmartThemeEmColor); margin-bottom: 8px;">${escapeHtml(title)}</div>
          <div class="wtl-chat-manager-filters" style="margin: 0; padding: 16px; background: rgba(0,0,0,0.1); border-radius: 12px;">
            ${emptyTab}
            ${tabsHtml}
          </div>
          <div style="text-align: center; font-size: 12px; opacity: 0.7; margin-top: 8px;">点击任一标签选择分组</div>
        </div>
      `;
      openModal({
        title,
        body: html,
        actions: ''
      });
      return new Promise((resolve) => {
        const modal = ensureModal();
        const finalize = (value) => {
          modal.removeEventListener('click', onClick);
          resolve(value);
        };
        const onClick = (event) => {
          const tabEl = event.target.closest('.wtl-chat-manager-pill');
          if (tabEl) {
            closeModal();
            finalize(tabEl.dataset.value ?? '');
          }
        };
        modal.addEventListener('click', onClick);
      });
    } else {
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
          <button type="button" class="menu_button primary" data-action="confirm-choice">确定</button>
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
    }
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

    const filterHtml = filterItems.length > 0 ? `
      <div class="wtl-edge-pills-container" id="wtl-edge-pills-container">
        ${filterItems.map((item, index) => `
          <button type="button" 
                  class="wtl-edge-pill ${state.activeFilter === item ? 'is-active' : ''}" 
                  data-action="filter" 
                  data-value="${escapeHtml(item)}"
                  data-index="${index}">
            ${escapeHtml(item)}
          </button>
        `).join('')}
        <div class="wtl-edge-pill-background" id="wtl-edge-pill-background"></div>
      </div>
    ` : '';

    const listHtml = pagedChats.length ? pagedChats.map((chat) => {
      const key = chat.globalKey;
      const folder = state.chatFolder[key] || '未分类';
      const tags = state.chatTags[key] || [];
      const summary = state.chatSummary[key] || '';
      const title = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');
      const isPinned = state.pinnedChats.includes(key);
      const checked = state.selectedChats.has(key) ? 'checked' : '';
      const metaChips = [
        `<span class="wtl-chat-manager-meta-chip"><i class="fa-regular fa-folder"></i> ${escapeHtml(folder)}</span>`,
        ...tags.map((tag) => `<span class="wtl-chat-manager-meta-chip"><i class="fa-solid fa-tag"></i> ${escapeHtml(tag)}</span>`)
      ].join('');
      return `
        <article class="wtl-chat-manager-card ${isPinned ? 'is-pinned' : ''}" data-key="${escapeHtml(key)}">
          <label class="wtl-chat-manager-check"><input type="checkbox" data-action="select" data-key="${escapeHtml(key)}" ${checked} /></label>

          <div class="wtl-chat-card-content">
            <div class="wtl-chat-card-title-row">
              <div class="wtl-chat-card-title" data-action="open-chat" data-char="${escapeHtml(chat.charId)}" data-file="${escapeHtml(chat.fileName)}" title="点击加载该聊天">${escapeHtml(title)}</div>
              <div class="wtl-chat-card-time">${escapeHtml(formatTime(chat.timestamp))}</div>
              <div class="wtl-chat-title-tools">
                <button type="button" title="预览最近对话" data-action="preview" data-char="${escapeHtml(chat.charId)}" data-file="${escapeHtml(chat.fileName)}"><i class="fa-solid fa-eye"></i></button>
                <button type="button" title="置顶" data-action="toggle-pin" data-key="${escapeHtml(key)}" class="${isPinned ? 'is-active' : ''}"><i class="fa-solid fa-thumbtack"></i></button>
              </div>
            </div>
            ${summary ? `<div class="wtl-chat-card-summary">${escapeHtml(summary)}</div>` : ''}
            <div class="wtl-chat-card-preview">${escapeHtml(chat.preview || '暂无预览...')}</div>
            <div class="wtl-chat-card-meta-row">
              <div class="wtl-chat-card-badges">${metaChips}</div>
              <div class="wtl-chat-card-filename">@${escapeHtml(chat.fileName)}</div>
            </div>
          </div>

          <div class="wtl-chat-card-grid">
            <button type="button" title="分配分组" data-action="set-folder" data-key="${escapeHtml(key)}"><i class="fa-regular fa-folder"></i></button>
            <button type="button" title="打标签" data-action="set-tag" data-key="${escapeHtml(key)}"><i class="fa-solid fa-tag"></i></button>
            <button type="button" title="编辑标题和简介" data-action="edit-chat" data-key="${escapeHtml(key)}"><i class="fa-solid fa-pen"></i></button>
            <button type="button" title="永久删除该聊天" class="wtl-chat-btn-danger" data-action="delete-chat" data-key="${escapeHtml(key)}"><i class="fa-solid fa-trash"></i></button>
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
        <div class="wtl-chat-manager-tabs">${tabHtml}</div>
        <input type="search" class="wtl-chat-manager-search" placeholder="搜索标题、角色、简介或预览..." value="${escapeHtml(state.searchQuery || '')}" data-action="search" />
      </div>
      ${filterItems.length ? `<div class="wtl-chat-manager-filters">${filterHtml}</div>` : ''}
      <div class="wtl-chat-manager-summary-row">
        <div class="wtl-chat-manager-count">当前显示 ${pagedChats.length} / ${filteredChats.length}（总计 ${chats.length}）</div>
      </div>
      <div class="wtl-chat-manager-list">${listHtml}</div>
      ${paginationHtml}
      ${batchHtml}
    `;
    
    // 更新Edge风格标签页背景位置
    setTimeout(updateEdgePillsBackground, 10);
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
    const chat = getChatByKey(key);
    if (!chat) return;
    const currentTitle = state.chatTitleOverride[key] || String(chat.fileName || '').replace(/\.jsonl$/i, '');
    const currentSummary = state.chatSummary[key] || '';
    
    openModal({
      title: '编辑聊天',
      body: `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label>聊天标题</label>
            <input class="wtl-chat-manager-modal-input" data-role="chat-title" value="${escapeHtml(currentTitle)}" placeholder="输入聊天标题" />
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label>聊天简介</label>
            <textarea class="wtl-chat-manager-modal-input" data-role="chat-summary" placeholder="输入聊天简介" rows="4">${escapeHtml(currentSummary)}</textarea>
          </div>
        </div>
      `,
      actions: `
        <button type="button" class="menu_button primary" data-action="save-chat-edit" data-key="${escapeHtml(key)}">保存</button>
      `
    });
  };

  const setFolder = async (key, targetFolder = null) => {
    let folder = targetFolder;
    if (!folder) {
      folder = await chooseFromList({
        title: '选择分组',
        items: state.folders,
        currentValue: state.chatFolder[key] || '',
        allowEmpty: true,
        emptyLabel: '未分类',
        type: 'tabs'
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
        <button type="button" class="menu_button primary" data-action="confirm-tags" data-key="${escapeHtml(key)}">保存</button>
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
        <button type="button" class="menu_button primary" data-action="save-settings">保存设置</button>
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

  const createFilter = async () => {
    const type = state.viewMode === 'folder' ? '分组' : state.viewMode === 'tag' ? '标签' : '';
    if (!type) return;
    const value = await requestInput({ title: `输入新的${type}名称`, placeholder: `请输入${type}名称` });
    if (value === null || !String(value).trim()) return;
    const clean = String(value).trim();
    if (type === '分组' && !state.folders.includes(clean)) state.folders.push(clean);
    if (type === '标签' && !state.tags.includes(clean)) state.tags.push(clean);
    saveAndRender();
  };

  const handleBatch = (mode) => {
    if (!ensureSelection()) return;
    const count = state.selectedChats.size;
    
    if (mode === 'folder') {
      openModal({
        title: `为 ${count} 条聊天设置分组`,
        body: `
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="margin-bottom: 8px;">请选择分组：</div>
            <div class="wtl-chat-manager-filters" style="margin: 0; padding: 16px; background: rgba(0,0,0,0.1); border-radius: 12px;">
              <button type="button" class="wtl-chat-manager-pill" data-value="">未分类</button>
              ${state.folders.map(folder => `
                <button type="button" class="wtl-chat-manager-pill" data-value="${escapeHtml(folder)}">${escapeHtml(folder)}</button>
              `).join('')}
            </div>
            <div style="font-size: 12px; opacity: 0.7; text-align: center;">点击任一标签为选中的聊天设置分组</div>
          </div>
        `,
        actions: ''
      });
      
      const modal = ensureModal();
      const onClick = (event) => {
        const pillEl = event.target.closest('.wtl-chat-manager-pill');
        if (pillEl) {
          const value = pillEl.dataset.value || '';
          const clean = String(value).trim();
          if (clean && !state.folders.includes(clean)) state.folders.push(clean);
          state.selectedChats.forEach((key) => {
            if (clean) state.chatFolder[key] = clean;
            else delete state.chatFolder[key];
          });
          state.isBatchMode = false;
          state.selectedChats.clear();
          closeModal();
          saveAndRender();
          modal.removeEventListener('click', onClick);
        }
      };
      modal.addEventListener('click', onClick);
      return;
    }
    
    if (mode === 'tag-add') {
      openModal({
        title: `为 ${count} 条聊天添加标签`,
        body: `
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="margin-bottom: 8px;">请选择要添加的标签：</div>
            <div class="wtl-chat-manager-tag-grid">
              ${state.tags.map(tag => `
                <label class="wtl-chat-manager-tag-option">
                  <input type="checkbox" value="${escapeHtml(tag)}" data-role="batch-tag-option" />
                  <span class="wtl-chat-manager-tag-option-text">${escapeHtml(tag)}</span>
                </label>
              `).join('')}
              ${state.tags.length === 0 ? '<div class="wtl-chat-manager-empty">当前没有可用标签，请先在设置里创建。</div>' : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <label>新增标签（多个标签用逗号分隔）</label>
              <input class="wtl-chat-manager-modal-input" type="text" data-role="batch-new-tags" placeholder="例如：高甜,虐心,R18" />
            </div>
          </div>
        `,
        actions: `
          <button type="button" class="menu_button primary" data-action="batch-tag-add-confirm">添加标签</button>
        `
      });
      return;
    }
    
    if (mode === 'tag-remove') {
      const allTags = new Set();
      state.selectedChats.forEach((key) => {
        const tags = state.chatTags[key] || [];
        tags.forEach(tag => allTags.add(tag));
      });
      const tagsArray = Array.from(allTags);
      
      openModal({
        title: `为 ${count} 条聊天移除标签`,
        body: `
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="margin-bottom: 8px;">请选择要移除的标签：</div>
            <div class="wtl-chat-manager-tag-grid">
              ${tagsArray.map(tag => `
                <label class="wtl-chat-manager-tag-option">
                  <input type="checkbox" value="${escapeHtml(tag)}" data-role="batch-tag-option" />
                  <span class="wtl-chat-manager-tag-option-text">${escapeHtml(tag)}</span>
                </label>
              `).join('')}
              ${tagsArray.length === 0 ? '<div class="wtl-chat-manager-empty">选中的聊天没有标签。</div>' : ''}
            </div>
          </div>
        `,
        actions: `
          <button type="button" class="menu_button primary" data-action="batch-tag-remove-confirm">移除标签</button>
        `
      });
      return;
    }
  };

  const updateEdgePillsBackground = () => {
    const container = rootEl?.querySelector('#wtl-edge-pills-container');
    const background = rootEl?.querySelector('#wtl-edge-pill-background');
    if (container && background) {
      const activeTab = container.querySelector('.wtl-edge-pill.is-active');
      if (activeTab) {
        const rect = activeTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        background.style.left = `${rect.left - containerRect.left}px`;
        background.style.width = `${rect.width}px`;
        background.style.opacity = '1';
      } else {
        background.style.opacity = '0';
      }
    }
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
      setTimeout(updateEdgePillsBackground, 10);
      return;
    }
    if (action === 'filter') {
      state.activeFilter = actionEl.dataset.value || '全部';
      state.currentPage = 1;
      render();
      setTimeout(updateEdgePillsBackground, 10);
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
    
    if (action === 'edit-chat') {
      await editChat(actionEl.dataset.key || '');
      return;
    }
    if (action === 'save-chat-edit') {
      const key = actionEl.dataset.key || '';
      const chat = getChatByKey(key);
      if (!chat) return;
      
      const modal = ensureModal();
      const titleInput = modal.querySelector('[data-role="chat-title"]');
      const summaryInput = modal.querySelector('[data-role="chat-summary"]');
      
      const nextTitle = titleInput?.value || '';
      const nextSummary = summaryInput?.value || '';
      
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
        closeModal();
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
      return;
    }
    if (action === 'batch-tag-add-confirm') {
      const modal = ensureModal();
      const selectedTags = Array.from(modal.querySelectorAll('[data-role="batch-tag-option"]:checked')).map(el => el.value.trim()).filter(Boolean);
      const newTagsInput = modal.querySelector('[data-role="batch-new-tags"]');
      const newTags = newTagsInput ? newTagsInput.value.trim().split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      const allTags = [...selectedTags, ...newTags];
      allTags.forEach(tag => {
        if (!state.tags.includes(tag)) state.tags.push(tag);
      });
      
      state.selectedChats.forEach((key) => {
        state.chatTags[key] = Array.isArray(state.chatTags[key]) ? state.chatTags[key] : [];
        allTags.forEach(tag => {
          if (!state.chatTags[key].includes(tag)) state.chatTags[key].push(tag);
        });
      });
      
      state.isBatchMode = false;
      state.selectedChats.clear();
      closeModal();
      saveAndRender();
      return;
    }
    if (action === 'batch-tag-remove-confirm') {
      const modal = ensureModal();
      const selectedTags = Array.from(modal.querySelectorAll('[data-role="batch-tag-option"]:checked')).map(el => el.value.trim()).filter(Boolean);
      
      if (selectedTags.length === 0) {
        closeModal();
        return;
      }
      
      state.selectedChats.forEach((key) => {
        state.chatTags[key] = (state.chatTags[key] || []).filter((item) => !selectedTags.includes(item));
        if (state.chatTags[key].length === 0) delete state.chatTags[key];
      });
      
      state.isBatchMode = false;
      state.selectedChats.clear();
      closeModal();
      saveAndRender();
      return;
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
        <div class="wtl-chat-manager-header">
          <div class="wtl-chat-manager-header-main" data-action="toggle-panel" title="点击展开/折叠聊天管理">
            <i class="fa-solid fa-folder-tree"></i>
            <span class="wtl-chat-manager-title">聊天管理</span>
            <span class="wtl-chat-manager-subtitle" data-role="subtitle">（载入中...）</span>
          </div>
          <div class="wtl-chat-manager-header-tools">
            <span class="wtl-chat-manager-count" data-role="count">0 条</span>
            <button type="button" class="wtl-chat-manager-icon-btn ${state.isBatchMode ? 'is-active' : ''}" title="批量操作" data-action="toggle-batch"><i class="fa-solid fa-check-double"></i></button>
            <button type="button" class="wtl-chat-manager-icon-btn" title="刷新数据" data-action="refresh"><i class="fa-solid fa-rotate-right"></i></button>
            <button type="button" class="wtl-chat-manager-icon-btn" title="设置" data-action="settings"><i class="fa-solid fa-gear"></i></button>
            <button type="button" class="wtl-chat-manager-icon-btn" data-action="toggle-panel" title="展开或折叠"><i class="fa-solid fa-chevron-down" data-role="chevron"></i></button>
          </div>
        </div>
        <div class="wtl-chat-manager-panel"></div>
      `;
      recentWrap.appendChild(host);
      host.addEventListener('click', handleAction);
      host.addEventListener('input', handleInput);
      host.addEventListener('change', handleChange);
      window.addEventListener('resize', updateEdgePillsBackground);
    }
    rootEl = host;
    if (renderAfter || created) render();
  };

  const removeHost = () => {
    if (rootEl) {
      rootEl.removeEventListener('click', handleAction);
      rootEl.removeEventListener('input', handleInput);
      rootEl.removeEventListener('change', handleChange);
      window.removeEventListener('resize', updateEdgePillsBackground);
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
