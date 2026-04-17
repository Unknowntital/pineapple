// ========================================
// Pineapple AI — Main Application
// ========================================

import './style.css';
import { getCurrentUser, login, register, logout, isAuthenticated } from './auth.js';
import { getChats, createChat, getChat, addMessage, deleteChat, getApiMessages, renameChat } from './chatStore.js';
import { sendMessage } from './api.js';

// ========================================
// State
// ========================================
let state = {
  currentChatId: null,
  sidebarOpen: true,
  isLoading: false,
  searchQuery: '',
  streamingText: '',
  abortController: null
};

// ========================================
// Router
// ========================================
function route() {
  if (!isAuthenticated()) {
    const hash = window.location.hash;
    if (hash === '#/register') {
      renderRegister();
    } else {
      renderLogin();
    }
  } else {
    renderChat();
  }
}

// ========================================
// Auth Pages
// ========================================
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🍍</div>
          <span class="auth-logo-text">Pineapple</span>
        </div>
        <p class="auth-subtitle">Welcome back! Sign in to continue your conversations.</p>
        
        <div id="auth-alert" class="alert-message error"></div>
        
        <form id="login-form" class="auth-form" autocomplete="on">
          <div class="form-group">
            <label class="form-label" for="login-email">Email address</label>
            <input class="form-input" type="email" id="login-email" 
                   placeholder="you@example.com" autocomplete="email" required />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" type="password" id="login-password" 
                   placeholder="Enter your password" autocomplete="current-password" required />
          </div>
          
          <button type="submit" class="auth-btn" id="login-btn">Sign In</button>
          
          <div class="auth-divider">or</div>
          
          <p class="auth-switch">
            Don't have an account? <a href="#/register" id="goto-register">Create one</a>
          </p>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);
}

function renderRegister() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🍍</div>
          <span class="auth-logo-text">Pineapple</span>
        </div>
        <p class="auth-subtitle">Create your account and start chatting with AI.</p>
        
        <div id="auth-alert" class="alert-message error"></div>
        
        <form id="register-form" class="auth-form" autocomplete="on">
          <div class="form-group">
            <label class="form-label" for="register-name">Full name</label>
            <input class="form-input" type="text" id="register-name" 
                   placeholder="John Doe" autocomplete="name" required />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="register-email">Email address</label>
            <input class="form-input" type="email" id="register-email" 
                   placeholder="you@example.com" autocomplete="email" required />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="register-password">Password</label>
            <input class="form-input" type="password" id="register-password" 
                   placeholder="Min 6 characters" autocomplete="new-password" required />
          </div>
          
          <button type="submit" class="auth-btn" id="register-btn">Create Account</button>
          
          <div class="auth-divider">or</div>
          
          <p class="auth-switch">
            Already have an account? <a href="#/login" id="goto-login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('register-form');
  form.addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const alert = document.getElementById('auth-alert');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  alert.classList.remove('visible');

  const result = await login(email, password);

  if (result.success) {
    window.location.hash = '#/chat';
    route();
  } else {
    alert.textContent = result.error;
    alert.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const alert = document.getElementById('auth-alert');
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  alert.classList.remove('visible');

  const result = await register(name, email, password);

  if (result.success) {
    window.location.hash = '#/chat';
    route();
  } else {
    alert.textContent = result.error;
    alert.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ========================================
// Chat UI
// ========================================
function renderChat() {
  const user = getCurrentUser();
  if (!user) return route();

  const allChats = getChats(user.id);
  const filteredChats = state.searchQuery 
    ? allChats.filter(c => c.title.toLowerCase().includes(state.searchQuery.toLowerCase()))
    : allChats;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="chat-app">
      <!-- Mobile overlay -->
      <div class="sidebar-overlay ${state.sidebarOpen ? 'visible' : ''}" id="sidebar-overlay"></div>
      
      <!-- Sidebar -->
      <aside class="sidebar ${state.sidebarOpen ? 'open' : ''}" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">🍍</div>
            <span class="sidebar-brand-name">Pineapple</span>
          </div>
          <button class="sidebar-close-btn" id="sidebar-close" title="Close sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
        
        <button class="new-chat-btn" id="new-chat-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          New Chat
        </button>
        
        <!-- Search -->
        <div class="sidebar-search">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" class="search-input" id="search-input" 
                 placeholder="Search chats..." value="${escapeHtml(state.searchQuery)}" />
          ${state.searchQuery ? '<button class="search-clear" id="search-clear">✕</button>' : ''}
        </div>
        
        <div class="sidebar-chats" id="sidebar-chats">
          ${filteredChats.length > 0 ? `
            ${categorizeChats(filteredChats)}
          ` : `
            <div class="sidebar-empty">
              <p>${state.searchQuery ? 'No chats found' : 'No conversations yet'}</p>
            </div>
          `}
        </div>
        
        <div class="sidebar-footer">
          <div class="user-profile" id="user-profile">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
              <div class="user-name">${escapeHtml(user.name)}</div>
              <div class="user-email">${escapeHtml(user.email)}</div>
            </div>
            <button class="logout-btn" id="logout-btn" title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
      
      <!-- Main -->
      <main class="chat-main">
        <header class="chat-topbar">
          <div class="topbar-left">
            <button class="toggle-sidebar-btn" id="toggle-sidebar" title="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div class="topbar-title">
              ${state.currentChatId ? `
                <span class="topbar-chat-title" id="topbar-chat-title">${escapeHtml(getChat(user.id, state.currentChatId)?.title || 'Chat')}</span>
              ` : 'Pineapple AI'}
              <span class="model-badge">
                <span class="model-dot"></span>
                NIPAN STUDIO
              </span>
            </div>
          </div>
          <div class="topbar-right">
            ${state.currentChatId ? `
              <button class="topbar-action-btn" id="clear-chat-btn" title="Delete this chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            ` : ''}
          </div>
        </header>
        
        <div class="chat-messages" id="chat-messages">
          ${state.currentChatId ? renderMessages(user.id, state.currentChatId) : renderWelcome(user.name)}
        </div>
        
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <div class="chat-input-box">
              <textarea class="chat-textarea" id="chat-input" 
                        placeholder="Message Pineapple..." 
                        rows="1"
                        ${state.isLoading ? 'disabled' : ''}></textarea>
              <button class="voice-btn" id="voice-btn" title="Voice Input" ${state.isLoading ? 'disabled' : ''}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </button>
              ${state.isLoading ? `
                <button class="stop-btn" id="stop-btn" title="Stop generating">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              ` : `
                <button class="send-btn" id="send-btn" title="Send message">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              `}
            </div>
            <div class="input-footer">
              <span class="input-disclaimer">Pineapple AI can make mistakes. Consider checking important information.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // Attach event listeners
  attachChatListeners();
  
  // Focus input
  const input = document.getElementById('chat-input');
  if (input && !state.isLoading) {
    input.focus();
  }
}

function renderWelcome(userName) {
  const firstName = userName.split(' ')[0];
  return `
    <div class="welcome-screen">
      <div class="welcome-glow"></div>
      <div class="welcome-icon">🍍</div>
      <h1 class="welcome-title">Hello, ${escapeHtml(firstName)}!</h1>
      <p class="welcome-sub">How can I help you today?</p>
      
      <div class="suggestions-grid">
        <div class="suggestion-card" data-suggestion="Explain quantum computing in simple terms">
          <div class="suggestion-icon">🧪</div>
          <div class="suggestion-content">
            <span class="suggestion-title">Explain quantum computing</span>
            <span class="suggestion-desc">in simple terms</span>
          </div>
        </div>
        <div class="suggestion-card" data-suggestion="Write a creative short story about space exploration">
          <div class="suggestion-icon">🚀</div>
          <div class="suggestion-content">
            <span class="suggestion-title">Write a creative short story</span>
            <span class="suggestion-desc">about space exploration</span>
          </div>
        </div>
        <div class="suggestion-card" data-suggestion="Help me plan a healthy meal prep for the week">
          <div class="suggestion-icon">🥗</div>
          <div class="suggestion-content">
            <span class="suggestion-title">Plan a healthy meal prep</span>
            <span class="suggestion-desc">for the entire week</span>
          </div>
        </div>
        <div class="suggestion-card" data-suggestion="What are the best practices for learning a new programming language?">
          <div class="suggestion-icon">💻</div>
          <div class="suggestion-content">
            <span class="suggestion-title">Best practices for learning</span>
            <span class="suggestion-desc">a new programming language</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function categorizeChats(chats) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const groups = { today: [], yesterday: [], week: [], month: [], older: [] };

  for (const chat of chats) {
    const d = new Date(chat.updatedAt || chat.createdAt);
    if (d >= today) groups.today.push(chat);
    else if (d >= yesterday) groups.yesterday.push(chat);
    else if (d >= weekAgo) groups.week.push(chat);
    else if (d >= monthAgo) groups.month.push(chat);
    else groups.older.push(chat);
  }

  let html = '';
  const sections = [
    ['Today', groups.today],
    ['Yesterday', groups.yesterday],
    ['Previous 7 Days', groups.week],
    ['Previous 30 Days', groups.month],
    ['Older', groups.older]
  ];

  for (const [label, items] of sections) {
    if (items.length === 0) continue;
    html += `<div class="sidebar-section-label">${label}</div>`;
    for (const chat of items) {
      html += renderChatItem(chat);
    }
  }

  return html;
}

function renderChatItem(chat) {
  return `
    <div class="chat-item ${state.currentChatId === chat.id ? 'active' : ''}" 
         data-chat-id="${chat.id}" id="chat-item-${chat.id}">
      <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <span class="title">${escapeHtml(chat.title)}</span>
      <div class="chat-item-actions">
        <button class="chat-action-btn" data-rename-id="${chat.id}" title="Rename">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="chat-action-btn delete" data-delete-id="${chat.id}" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderMessages(userId, chatId) {
  const chat = getChat(userId, chatId);
  if (!chat) return renderWelcome(getCurrentUser().name);

  const user = getCurrentUser();
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  let html = '<div class="messages-container">';
  
  for (let i = 0; i < chat.messages.length; i++) {
    const msg = chat.messages[i];
    const isLast = i === chat.messages.length - 1;
    
    html += `
      <div class="message ${msg.role}" id="${msg.id}">
        <div class="message-avatar">
          ${msg.role === 'user' ? initials : '🍍'}
        </div>
        <div class="message-body">
          <div class="message-header">
            <span class="message-role">${msg.role === 'user' ? escapeHtml(user.name) : 'Pineapple AI'}</span>
          </div>
          <div class="message-text">${formatMessage(msg.content)}</div>
          <div class="message-actions">
            <button class="msg-action-btn" data-copy-msg="${i}" title="Copy message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              <span>Copy</span>
            </button>
            ${msg.role === 'assistant' && isLast && !state.isLoading ? `
              <button class="msg-action-btn" id="regenerate-btn" title="Regenerate response">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                <span>Regenerate</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Show typing indicator / streaming
  if (state.isLoading) {
    if (state.streamingText) {
      html += `
        <div class="message assistant streaming" id="streaming-msg">
          <div class="message-avatar">🍍</div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-role">Pineapple AI</span>
              <span class="streaming-badge">Generating...</span>
            </div>
            <div class="message-text" id="streaming-content">${formatMessage(state.streamingText)}</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="message assistant" id="typing-msg">
          <div class="message-avatar">🍍</div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-role">Pineapple AI</span>
            </div>
            <div class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      `;
    }
  }

  html += '</div>';
  return html;
}

// ========================================
// Event Listeners
// ========================================
function attachChatListeners() {
  const user = getCurrentUser();

  // Toggle sidebar
  document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
    state.sidebarOpen = !state.sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open', state.sidebarOpen);
    overlay?.classList.toggle('visible', state.sidebarOpen);
  });

  // Close sidebar
  document.getElementById('sidebar-close')?.addEventListener('click', () => {
    state.sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  });

  // Overlay click
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    state.sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  });

  // New chat
  document.getElementById('new-chat-btn')?.addEventListener('click', () => {
    state.currentChatId = null;
    state.searchQuery = '';
    renderChat();
  });

  // Search
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderSidebarChats();
  });

  document.getElementById('search-clear')?.addEventListener('click', () => {
    state.searchQuery = '';
    renderSidebarChats();
    document.getElementById('search-input').value = '';
  });

  // Chat item clicks
  document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chat-action-btn')) return;
      const chatId = item.dataset.chatId;
      state.currentChatId = chatId;
      renderChat();
    });
  });

  // Delete chat
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.dataset.deleteId;
      if (confirm('Delete this chat?')) {
        deleteChat(user.id, chatId);
        if (state.currentChatId === chatId) {
          state.currentChatId = null;
        }
        renderChat();
      }
    });
  });

  // Rename chat
  document.querySelectorAll('[data-rename-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.dataset.renameId;
      const chat = getChat(user.id, chatId);
      if (!chat) return;
      
      const newTitle = prompt('Rename chat:', chat.title);
      if (newTitle && newTitle.trim()) {
        renameChat(user.id, chatId, newTitle.trim());
        renderChat();
      }
    });
  });

  // Clear current chat
  document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
    if (state.currentChatId && confirm('Delete this chat?')) {
      deleteChat(user.id, state.currentChatId);
      state.currentChatId = null;
      renderChat();
    }
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    state.currentChatId = null;
    window.location.hash = '#/login';
    route();
  });

  // Send message
  const sendBtn = document.getElementById('send-btn');
  const chatInput = document.getElementById('chat-input');
  const stopBtn = document.getElementById('stop-btn');

  sendBtn?.addEventListener('click', () => handleSend());
  stopBtn?.addEventListener('click', () => handleStop());

  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
  });

  // Suggestion cards
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const suggestion = card.dataset.suggestion;
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = suggestion;
        handleSend();
      }
    });
  });

  // Copy message
  document.querySelectorAll('[data-copy-msg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.copyMsg);
      const chat = getChat(user.id, state.currentChatId);
      if (chat && chat.messages[idx]) {
        copyToClipboard(chat.messages[idx].content, btn);
      }
    });
  });

  // Regenerate
  document.getElementById('regenerate-btn')?.addEventListener('click', handleRegenerate);

  // Copy code blocks
  document.querySelectorAll('.code-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block-wrapper')?.querySelector('code');
      if (codeBlock) {
        copyToClipboard(codeBlock.textContent, btn);
      }
    });
  });

  // Scroll to bottom
  scrollToBottom();

  // Voice Input Setup
  setupVoiceInput();
}

function renderSidebarChats() {
  const user = getCurrentUser();
  const allChats = getChats(user.id);
  const filteredChats = state.searchQuery 
    ? allChats.filter(c => c.title.toLowerCase().includes(state.searchQuery.toLowerCase()))
    : allChats;

  const container = document.getElementById('sidebar-chats');
  if (!container) return;

  container.innerHTML = filteredChats.length > 0 
    ? categorizeChats(filteredChats)
    : `<div class="sidebar-empty"><p>${state.searchQuery ? 'No chats found' : 'No conversations yet'}</p></div>`;

  // Reattach chat item listeners
  const user2 = getCurrentUser();
  container.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chat-action-btn')) return;
      state.currentChatId = item.dataset.chatId;
      renderChat();
    });
  });

  container.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.dataset.deleteId;
      if (confirm('Delete this chat?')) {
        deleteChat(user2.id, chatId);
        if (state.currentChatId === chatId) state.currentChatId = null;
        renderChat();
      }
    });
  });

  container.querySelectorAll('[data-rename-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.dataset.renameId;
      const chat = getChat(user2.id, chatId);
      if (!chat) return;
      const newTitle = prompt('Rename chat:', chat.title);
      if (newTitle?.trim()) {
        renameChat(user2.id, chatId, newTitle.trim());
        renderChat();
      }
    });
  });
}

// ========================================
// Send Message Handler
// ========================================
async function handleSend() {
  const input = document.getElementById('chat-input');
  const text = input?.value?.trim();
  if (!text || state.isLoading) return;

  const user = getCurrentUser();
  if (!user) return;

  // Create chat if needed
  if (!state.currentChatId) {
    const chat = createChat(user.id);
    state.currentChatId = chat.id;
  }

  // Save user message
  addMessage(user.id, state.currentChatId, 'user', text);
  input.value = '';
  input.style.height = 'auto';

  // Show loading state
  state.isLoading = true;
  state.streamingText = '';
  renderChat();
  scrollToBottom();

  // Get conversation context
  const apiMessages = getApiMessages(user.id, state.currentChatId);

  // Call API with streaming callback
  const { error, output } = await sendMessage(apiMessages, (chunk) => {
    state.streamingText = chunk;
    updateStreamingContent();
    scrollToBottom();
  });

  if (error) {
    addMessage(user.id, state.currentChatId, 'assistant', 
      `⚠️ I encountered an error: ${error}\n\nPlease try again.`);
  } else {
    addMessage(user.id, state.currentChatId, 'assistant', output || 'I had trouble generating a response. Please try again.');
  }

  state.isLoading = false;
  state.streamingText = '';
  renderChat();
  scrollToBottom();
}

function handleStop() {
  state.isLoading = false;
  const user = getCurrentUser();
  if (state.streamingText && user) {
    addMessage(user.id, state.currentChatId, 'assistant', state.streamingText);
  }
  state.streamingText = '';
  renderChat();
}

async function handleRegenerate() {
  const user = getCurrentUser();
  if (!user || !state.currentChatId || state.isLoading) return;

  const chat = getChat(user.id, state.currentChatId);
  if (!chat || chat.messages.length < 2) return;

  // Remove last assistant message
  const lastMsg = chat.messages[chat.messages.length - 1];
  if (lastMsg.role === 'assistant') {
    chat.messages.pop();
    // Save the modified chat
    const allChats = getChats(user.id);
    const idx = allChats.findIndex(c => c.id === chat.id);
    if (idx !== -1) {
      allChats[idx] = chat;
      localStorage.setItem('pineapple_chats_' + user.id, JSON.stringify(allChats));
    }
  }

  state.isLoading = true;
  state.streamingText = '';
  renderChat();
  scrollToBottom();

  const apiMessages = getApiMessages(user.id, state.currentChatId);
  const { error, output } = await sendMessage(apiMessages, (chunk) => {
    state.streamingText = chunk;
    updateStreamingContent();
    scrollToBottom();
  });

  if (error) {
    addMessage(user.id, state.currentChatId, 'assistant', `⚠️ ${error}`);
  } else {
    addMessage(user.id, state.currentChatId, 'assistant', output || 'Failed to regenerate.');
  }

  state.isLoading = false;
  state.streamingText = '';
  renderChat();
  scrollToBottom();
}

function updateStreamingContent() {
  const el = document.getElementById('streaming-content');
  if (el) {
    el.innerHTML = formatMessage(state.streamingText);
  } else {
    // Need to switch from typing indicator to streaming view
    const typingMsg = document.getElementById('typing-msg');
    if (typingMsg) {
      const user = getCurrentUser();
      typingMsg.outerHTML = `
        <div class="message assistant streaming" id="streaming-msg">
          <div class="message-avatar">🍍</div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-role">Pineapple AI</span>
              <span class="streaming-badge">Generating...</span>
            </div>
            <div class="message-text" id="streaming-content">${formatMessage(state.streamingText)}</div>
          </div>
        </div>
      `;
    }
  }
}

// ========================================
// Utilities
// ========================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatMessage(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Code blocks (triple backtick) — with copy button and language badge
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const displayLang = lang || 'code';
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${displayLang}</span>
        <button class="code-copy-btn" title="Copy code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre><code class="language-${lang}">${code.trim()}</code></pre>
    </div>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Unordered lists (handle - and * markers)
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Line breaks to paragraphs
  html = html.split('\n\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || 
        p.startsWith('<div') || p.startsWith('<blockquote') || p.startsWith('<hr')) return p;
    return `<p>${p}</p>`;
  }).join('');
  
  html = html.replace(/<p><\/p>/g, '');
  
  // Single line breaks within paragraphs
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function copyToClipboard(text, btnEl) {
  try {
    await navigator.clipboard.writeText(text);
    const originalHTML = btnEl.innerHTML;
    btnEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Copied!</span>
    `;
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.innerHTML = originalHTML;
      btnEl.classList.remove('copied');
    }, 2000);
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const container = document.getElementById('chat-messages');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K = search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
  
  // Escape = close sidebar on mobile
  if (e.key === 'Escape') {
    state.sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  }
});

// ========================================
// Initialize
// ========================================
window.addEventListener('hashchange', route);
route();

// ========================================
// Voice Input Logic
// ========================================
let recognition = null;
let isSpeaking = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    const textarea = document.getElementById('chat-input');
    if (textarea) {
      textarea.value = transcript;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  recognition.onend = () => {
    isSpeaking = false;
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.remove('listening');
    document.getElementById('chat-input')?.focus();
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    isSpeaking = false;
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.remove('listening');
  };
}

function setupVoiceInput() {
  const voiceBtn = document.getElementById('voice-btn');
  if (!voiceBtn) return;
  
  if (!recognition) {
    voiceBtn.style.display = 'none';
    return;
  }

  voiceBtn.addEventListener('click', () => {
    if (isSpeaking) {
      recognition.stop();
    } else {
      const textarea = document.getElementById('chat-input');
      if (textarea) textarea.value = ''; // clear before listening
      try {
        recognition.start();
        isSpeaking = true;
        voiceBtn.classList.add('listening');
      } catch (err) {
        console.error("Could not start recognition:", err);
      }
    }
  });
}
