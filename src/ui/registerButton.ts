// 注册聊天消息扩展按钮
// 依赖 st-api-wrapper 的全局对象
declare const ST_API: any;

type ButtonHandler = () => void | Promise<void>;

export async function registerMemoryButton(onClick: ButtonHandler) {
  return ST_API.ui.registerExtraMessageButton({
    id: 'WorldTreeLibrary.memory',
    icon: 'fa-solid fa-table',
    title: '记忆表格',
    onClick: async () => {
      await onClick();
    }
  });
}
