// @ts-nocheck

import { ChatManagerController } from './controllers/chatManagerController.js';
import { ChatManagerState } from './data/chatManagerState.js';
import { ChatDataService } from './data/chatData.js';
import { ChatManagerUI } from './ui/chatManagerUI.js';
import { ChatManagerFeature } from './controllers/ChatManagerFeature.js';

export { 
    ChatManagerController,
    ChatManagerState,
    ChatDataService,
    ChatManagerUI,
    ChatManagerFeature
};

let chatManagerInstance = null;

export async function initializeChatManager(options = {}) {
  if (!chatManagerInstance) {
    chatManagerInstance = new ChatManagerController(options);
    await chatManagerInstance.initialize();
  }
  return chatManagerInstance;
}

export function destroyChatManager() {
  if (chatManagerInstance) {
    chatManagerInstance.destroy();
    chatManagerInstance = null;
  }
}

export function getChatManager() {
  return chatManagerInstance;
}
