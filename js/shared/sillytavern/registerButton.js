// 注册聊天消息扩展按钮
// 依赖 st-api-wrapper 的全局对象
const ST_API = window.ST_API;

export async function registerMemoryButton(onClick) {
  return ST_API.ui.registerExtraMessageButton({
    id: 'WorldTreeLibrary.memory',
    icon: 'fa-solid fa-table',
    title: '记忆表格',
    onClick: async () => {
      await onClick();
    }
  });
}
