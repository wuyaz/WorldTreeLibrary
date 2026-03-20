// 顶部页签注册
// 依赖 st-api-wrapper 的全局对象
const ST_API = window.ST_API;

export async function registerTopTab(options = {}) {
  const {
    loadHtml,
    onOpen
  } = options;

  const html = loadHtml ? await loadHtml('wtl-ui.html') : '';

  return ST_API.ui.registerTopSettingsDrawer({
    id: 'WorldTreeLibrary.topTab',
    icon: 'fa-solid fa-table fa-fw',
    title: 'WorldTreeLibrary',
    expanded: false,
    content: {
      kind: 'html',
      html
    },
    onOpen: () => {
      const root = document.getElementById('wtl-root');
      if (!root || root.dataset.bound === 'true') return;
      root.dataset.bound = 'true';
      if (typeof onOpen === 'function') onOpen(root);
    }
  });
}
