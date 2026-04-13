import { getFeatureFlags, setFeatureFlags } from '../../core/storage.js';

const FEATURE_MENU_ID = 'WorldTreeLibrary.features';
const FEATURE_MODAL_ID = 'wtl-feature-menu-modal';

function renderFeatureMenuHtml() {
  return `
    <div id="wtl-feature-menu" class="wtl-card" style="display:flex; flex-direction:column; gap:12px; padding:12px;">
      <style>
        #wtl-feature-menu {
          color: var(--SmartThemeBodyColor);
        }
        #wtl-feature-menu .wtl-feature-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        #wtl-feature-menu .wtl-feature-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 12px;
          background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 84%, transparent);
        }
        #wtl-feature-menu .wtl-feature-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        #wtl-feature-menu .wtl-feature-title {
          font-weight: 700;
          color: var(--SmartThemeUnderlineColor);
        }
        #wtl-feature-menu .wtl-feature-desc {
          font-size: 12px;
          line-height: 1.5;
          opacity: 0.76;
        }
        #wtl-feature-menu .wtl-feature-note {
          font-size: 12px;
          line-height: 1.6;
          opacity: 0.76;
          padding: 10px 12px;
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 12px;
          background: color-mix(in srgb, var(--SmartThemeBgColor) 82%, transparent);
        }
        #wtl-feature-menu .wtl-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        #wtl-feature-menu .wtl-switch input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        #wtl-feature-menu .wtl-switch-track {
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--SmartThemeBodyColor) 12%, transparent);
          border: 1px solid var(--SmartThemeBorderColor);
          display: inline-flex;
          align-items: center;
          padding: 2px;
          transition: all 0.2s ease;
        }
        #wtl-feature-menu .wtl-switch-knob {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--SmartThemeBodyColor);
          transform: translateX(0);
          transition: transform 0.2s ease;
        }
        #wtl-feature-menu .wtl-switch input[type="checkbox"]:checked + .wtl-switch-track {
          background: var(--SmartThemeUnderlineColor);
          border-color: color-mix(in srgb, var(--SmartThemeUnderlineColor) 80%, transparent);
        }
        #wtl-feature-menu .wtl-switch input[type="checkbox"]:checked + .wtl-switch-track .wtl-switch-knob {
          transform: translateX(20px);
        }
      </style>
      <div class="wtl-feature-grid">
        <div class="wtl-feature-item">
          <div class="wtl-feature-copy">
            <div class="wtl-feature-title">记忆表格</div>
            <div class="wtl-feature-desc">控制 WorldTreeLibrary 主工作台与填表页签显示。</div>
          </div>
          <label class="wtl-switch">
            <input id="wtl-feature-memory-toggle" type="checkbox" />
            <span class="wtl-switch-track"><span class="wtl-switch-knob"></span></span>
          </label>
        </div>
        <div class="wtl-feature-item">
          <div class="wtl-feature-copy">
            <div class="wtl-feature-title">聊天管理</div>
            <div class="wtl-feature-desc">控制欢迎页聊天管理器注入、预览和快速跳转功能。</div>
          </div>
          <label class="wtl-switch">
            <input id="wtl-feature-chat-toggle" type="checkbox" />
            <span class="wtl-switch-track"><span class="wtl-switch-knob"></span></span>
          </label>
        </div>
      </div>
      <div class="wtl-feature-note" id="wtl-feature-menu-note"></div>
    </div>
  `;
}

function ensureFeatureModal() {
  let modal = document.getElementById(FEATURE_MODAL_ID);
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = FEATURE_MODAL_ID;
  modal.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'z-index:40000',
    'background:color-mix(in srgb, var(--SmartThemeBgColor) 56%, transparent)',
    'backdrop-filter:blur(4px)',
    'align-items:center',
    'justify-content:center',
    'padding:16px'
  ].join(';');

  modal.innerHTML = `
    <div style="width:min(520px, 96vw); max-height:86vh; overflow:auto; border:1px solid var(--SmartThemeBorderColor); border-radius:16px; background:var(--SmartThemeBlurTintColor); box-shadow:0 20px 40px color-mix(in srgb, var(--SmartThemeBgColor) 30%, transparent);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border-bottom:1px solid var(--SmartThemeBorderColor);">
        <strong style="color:var(--SmartThemeBodyColor);">WTL 功能开关</strong>
        <button type="button" data-action="close" class="menu_button"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div data-role="content"></div>
    </div>
  `;

  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-action="close"]')) {
      modal.style.display = 'none';
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function openFeatureModal(onChange) {
  const modal = ensureFeatureModal();
  const content = modal.querySelector('[data-role="content"]');
  if (!content) return;

  content.innerHTML = renderFeatureMenuHtml();
  const root = content.querySelector('#wtl-feature-menu');
  if (!root) return;

  const syncUi = () => {
    const flags = getFeatureFlags();
    const memoryToggleEl = root.querySelector('#wtl-feature-memory-toggle');
    const chatToggleEl = root.querySelector('#wtl-feature-chat-toggle');
    const noteEl = root.querySelector('#wtl-feature-menu-note');
    if (memoryToggleEl) memoryToggleEl.checked = flags.memoryTable !== false;
    if (chatToggleEl) chatToggleEl.checked = flags.chatManager !== false;
    if (noteEl) {
      noteEl.textContent = flags.chatManager !== false
        ? '聊天管理已启用，欢迎页最近聊天区域下方会显示管理面板。'
        : '聊天管理当前未注入欢迎页。启用后会自动挂载到欢迎页最近聊天区域。';
    }
  };

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const current = getFeatureFlags();
    let next = current;
    if (target.id === 'wtl-feature-memory-toggle') {
      next = setFeatureFlags({ ...current, memoryTable: target.checked });
    }
    if (target.id === 'wtl-feature-chat-toggle') {
      next = setFeatureFlags({ ...current, chatManager: target.checked });
    }
    syncUi();
    if (typeof onChange === 'function') onChange(next);
  });

  syncUi();
  modal.style.display = 'flex';
}

export async function registerFeatureMenu(options = {}) {
  const { onChange } = options;
  const ST_API = window.ST_API;
  if (!ST_API?.ui?.registerExtensionsMenuItem) {
    console.warn('[WorldTreeLibrary] registerFeatureMenu skipped: ST_API not ready');
    return null;
  }

  ensureFeatureModal();

  return ST_API.ui.registerExtensionsMenuItem({
    id: FEATURE_MENU_ID,
    label: 'WTL 功能开关',
    icon: 'fa-solid fa-sliders',
    onClick: () => {
      openFeatureModal(onChange);
    }
  });
}
