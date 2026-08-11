import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://off-the-books-api.onrender.com';

/**
 * Common API fetch client
 * @param {string} endpoint - API endpoint starting with '/' (e.g. '/api/items')
 * @param {object} options - Fetch options
 */
export const apiClient = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Load JWT token from SecureStore and append to headers
  try {
    const token = await SecureStore.getItemAsync('user_jwt');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Failed to retrieve JWT token from secure store', error);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `API error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

export default apiClient;
