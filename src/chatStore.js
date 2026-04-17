// ========================================
// Chat Store — Manages conversations
// ========================================

const CHATS_KEY_PREFIX = 'pineapple_chats_';

function getChatsKey(userId) {
  return CHATS_KEY_PREFIX + userId;
}

/**
 * Get all chats for a user
 * @returns {Array} list of chat objects
 */
export function getChats(userId) {
  const data = localStorage.getItem(getChatsKey(userId));
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save chats for a user
 */
function saveChats(userId, chats) {
  localStorage.setItem(getChatsKey(userId), JSON.stringify(chats));
}

/**
 * Create a new chat
 * @returns {Object} the new chat object
 */
export function createChat(userId) {
  const chats = getChats(userId);
  const chat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  chats.unshift(chat);
  saveChats(userId, chats);
  return chat;
}

/**
 * Get a specific chat
 */
export function getChat(userId, chatId) {
  const chats = getChats(userId);
  return chats.find(c => c.id === chatId) || null;
}

/**
 * Add a message to a chat
 */
export function addMessage(userId, chatId, role, content) {
  const chats = getChats(userId);
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

  saveChats(userId, chats);
  return message;
}

/**
 * Delete a chat
 */
export function deleteChat(userId, chatId) {
  let chats = getChats(userId);
  chats = chats.filter(c => c.id !== chatId);
  saveChats(userId, chats);
}

/**
 * Rename a chat
 */
export function renameChat(userId, chatId, newTitle) {
  const chats = getChats(userId);
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  chat.title = newTitle;
  chat.updatedAt = new Date().toISOString();
  saveChats(userId, chats);
}

/**
 * Get chat messages formatted for the API
 */
export function getApiMessages(userId, chatId) {
  const chat = getChat(userId, chatId);
  if (!chat) return [];
  return chat.messages.map(m => ({
    role: m.role,
    content: m.content
  }));
}
