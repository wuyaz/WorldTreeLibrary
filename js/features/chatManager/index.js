// @ts-nocheck

import { ChatManagerFeature } from './controllers/ChatManagerFeature.js';

export { ChatManagerFeature };

let chatManagerInstance = null;

export async function initializeChatManager(options = {}) {
  if (!chatManagerInstance) {
    chatManagerInstance = new ChatManagerFeature(options);
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
