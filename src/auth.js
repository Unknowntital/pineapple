// ========================================
// Authentication Module (Mocked)
// ========================================

/**
 * Get the currently authenticated user
 * @returns {Object|null} User object
 */
export function getCurrentUser() {
  return {
    id: 'default_user_1',
    name: 'User',
    email: 'user@example.com'
  };
}
