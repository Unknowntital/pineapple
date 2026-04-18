// ========================================
// Chat Store — Manages conversations
// ========================================

const CHATS_KEY = 'pineapple_chats_local';

/**
 * Get all chats
 * @returns {Array} list of chat objects
 */
export function getChats() {
  const data = localStorage.getItem(CHATS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save chats
 */
function saveChats(chats) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

/**
 * Create a new chat
 * @returns {Object} the new chat object
 */
export function createChat() {
  const chats = getChats();
  const chat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  chats.unshift(chat);
  saveChats(chats);
  return chat;
}

/**
 * Get a specific chat
 */
export function getChat(chatId) {
  const chats = getChats();
  return chats.find(c => c.id === chatId) || null;
}

/**
 * Add a message to a chat
 */
export function addMessage(chatId, role, content) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return null;

  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    role,
    content,
    timestamp: new Date().toISOString()
  };

  chat.messages.push(message);
  chat.updatedAt = new Date().toISOString();

  // Auto-title from first user message
  if (chat.title === 'New Chat' && role === 'user') {
    chat.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }

  saveChats(chats);
  return message;
}

/**
 * Delete a chat
 */
export function deleteChat(chatId) {
  let chats = getChats();
  chats = chats.filter(c => c.id !== chatId);
  saveChats(chats);
}

/**
 * Rename a chat
 */
export function renameChat(chatId, newTitle) {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  chat.title = newTitle;
  chat.updatedAt = new Date().toISOString();
  saveChats(chats);
}

/**
 * Get chat messages formatted for the API
 */
export function getApiMessages(chatId) {
  const chat = getChat(chatId);
  if (!chat) return [];
  return chat.messages.map(m => ({
    role: m.role,
    content: m.content
  }));
}
