/**
 * Centralized Token Storage Helper
 * Keeps client token handling isolated and maintainable,
 * enabling an easy drop-in transition to HttpOnly cookies in future auth hardening.
 */

const TOKEN_KEY = 'hms_access_token';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage might be unavailable in private browsing
  }
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage might be unavailable in private browsing
  }
};

export default {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
};
