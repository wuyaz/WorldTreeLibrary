// 顶部页签 + 基础配置面板
// 依赖 st-api-wrapper 的全局对象
const ST_API = window.ST_API;

export async function registerBaseSettingsPanel() {
  return ST_API.ui.registerSettingsPanel({
    id: 'WorldTreeLibrary.settings',
    title: 'WorldTreeLibrary 基础配置',
    target: 'right',
    expanded: false,
    content: {
      kind: 'html',
      html: `
        <div class="flex-container flexFlowColumn">
          <label>记忆表格条目名称</label>
          <input class="text_pole" type="text" placeholder="WorldTreeMemory" />
          <label>世界书名称</label>
          <input class="text_pole" type="text" placeholder="Current Chat" />
          <button class="menu_button">保存（占位）</button>
        </div>
      `
    }
  });
}

export async function registerTopTab(onOpenPanel) {
  return ST_API.ui.registerTopSettingsDrawer({
    id: 'WorldTreeLibrary.topTab',
    icon: 'fa-solid fa-table fa-fw',
    title: 'WorldTreeLibrary',
    expanded: false,
    content: {
      kind: 'html',
      html: `
        <div class="flex-container flexFlowColumn">
          <table class="table">
            <tr>
              <td>
                <button id="wtl-open-panel" class="menu_button">打开基础配置面板</button>
              </td>
            </tr>
          </table>
        </div>
      `
    },
    onOpen: () => {
      const btn = document.getElementById('wtl-open-panel');
      if (btn) {
        btn.onclick = () => onOpenPanel();
      }
    }
  });
}

export async function registerTopTabWithPanel() {
  const panel = await registerBaseSettingsPanel();
  const drawer = await registerTopTab(() => {
    panel.drawer.classList.add('openDrawer');
    panel.drawer.classList.remove('closedDrawer');
    panel.content.classList.add('openDrawer');
    panel.content.classList.remove('closedDrawer');
  });

  return { panel, drawer };
}
