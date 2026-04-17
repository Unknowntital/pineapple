// ========================================
// Authentication Module
// Simple localStorage-based auth system
// ========================================

const AUTH_KEY = 'pineapple_auth';
const USERS_KEY = 'pineapple_users';

/**
 * Get the currently authenticated user
 * @returns {Object|null} User object or null
 */
export function getCurrentUser() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Get all registered users
 * @returns {Array} List of users
 */
function getUsers() {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save users to localStorage
 */
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Hash a password (simple hash for demo — in production use bcrypt + server)
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pineapple_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Register a new user
 * @returns {{ success: boolean, error?: string }}
 */
export async function register(name, email, password) {
  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  if (!email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    return { success: false, error: 'An account with this email already exists' };
  }

  const hashedPassword = await hashPassword(password);
  const user = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  // Auto-login after registration
  const { password: _, ...safeUser } = user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));

  return { success: true, user: safeUser };
}

/**
 * Login with email and password
 * @returns {{ success: boolean, error?: string }}
 */
export async function login(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    return { success: false, error: 'No account found with this email' };
  }

  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) {
    return { success: false, error: 'Incorrect password' };
  }

  const { password: _, ...safeUser } = user;
  localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));

  return { success: true, user: safeUser };
}

/**
 * Logout the current user
 */
export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}
