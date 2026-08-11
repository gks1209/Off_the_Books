import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../services/api';
import syncManager from '../utils/syncManager';

const STORAGE_KEY = '@off_the_books_items_v2';

export const useItemStore = create((set, get) => ({
  items: [],
  ready: false,
  token: null,

  setReady: (ready) => set({ ready }),
  setToken: (token) => set({ token }),
  setItems: (items) => {
    set({ items });
    get().saveToLocal(items);
  },

  // Save to AsyncStorage helper
  saveToLocal: async (items) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Local backup failed', e);
    }
  },

  // Authentication Actions
  login: async (email, password) => {
    try {
      const response = await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response && response.token) {
        await SecureStore.setItemAsync('user_jwt', response.token);
        set({ token: response.token });
        await get().loadItems();
        return { success: true };
      }
      return { success: false, error: 'Token not returned from server' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  register: async (email, password) => {
    try {
      const response = await apiClient('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response && response.token) {
        await SecureStore.setItemAsync('user_jwt', response.token);
        set({ token: response.token });
        await get().loadItems();
        return { success: true };
      }
      return { success: false, error: 'Registration succeeded, but token not returned' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('user_jwt');
      set({ token: null, items: [] });
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session during logout', e);
    }
  },

  // Load items from API with AsyncStorage fallback
  loadItems: async () => {
    // 1. Session Hydration: Check if token exists in SecureStore on startup
    let activeToken = get().token;
    if (!activeToken) {
      try {
        activeToken = await SecureStore.getItemAsync('user_jwt');
        if (activeToken) {
          set({ token: activeToken });
        } else {
          // No token stored, stop loading. App will redirect to Auth screen.
          set({ ready: true });
          return;
        }
      } catch (e) {
        console.warn('No token in secure store, loading defaults', e.message);
        set({ ready: true });
        return;
      }
    }

    // 2. Fetch items from backend
    try {
      const data = await apiClient('/api/items');
      if (Array.isArray(data)) {
        set({ items: data, ready: true });
        await get().saveToLocal(data);
      }
    } catch (e) {
      console.warn('Backend load failed, trying local storage...', e);
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const hydrated = parsed.map(item => ({
              id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: item.name || '',
              category: item.category || '기타',
              status: item.status || 'selling',
              buyPrice: item.buyPrice || '',
              buyCurrency: item.buyCurrency || 'KRW',
              soldPrice: item.soldPrice || '',
              soldCurrency: item.soldCurrency || 'KRW',
              isReceived: item.isReceived !== undefined ? item.isReceived : true,
              ...item
            }));
            set({ items: hydrated });
          }
        }
      } catch (localErr) {
        console.warn('Local load failed', localErr);
      } finally {
        set({ ready: true });
      }
    }
  },

  // Add Item
  addItem: async (item) => {
    let savedItem = item;
    let isConnected = false;

    try {
      const netState = await NetInfo.fetch();
      isConnected = !!netState.isConnected;
    } catch (e) {
      console.warn('Failed to fetch network state', e);
    }

    if (isConnected) {
      try {
        const response = await apiClient('/api/items', {
          method: 'POST',
          body: JSON.stringify(item),
        });
        if (response && response.id) {
          savedItem = response;
        }
      } catch (e) {
        console.warn('API add failed, queueing mutation offline...', e.message);
        await syncManager.enqueue('CREATE', item.id, item);
      }
    } else {
      console.log('App is offline. Queueing CREATE mutation...');
      await syncManager.enqueue('CREATE', item.id, item);
    }

    const newItems = [savedItem, ...get().items];
    set({ items: newItems });
    await get().saveToLocal(newItems);
  },

  // Update Item
  updateItem: async (updated) => {
    let savedItem = updated;
    let isConnected = false;

    try {
      const netState = await NetInfo.fetch();
      isConnected = !!netState.isConnected;
    } catch (e) {
      console.warn('Failed to fetch network state', e);
    }

    if (isConnected) {
      try {
        const response = await apiClient(`/api/items/${updated.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (response && response.id) {
          savedItem = response;
        }
      } catch (e) {
        console.warn('API update failed, queueing mutation offline...', e.message);
        await syncManager.enqueue('UPDATE', updated.id, updated);
      }
    } else {
      console.log('App is offline. Queueing UPDATE mutation...');
      await syncManager.enqueue('UPDATE', updated.id, updated);
    }

    const newItems = get().items.map((i) => (i.id === updated.id ? savedItem : i));
    set({ items: newItems });
    await get().saveToLocal(newItems);
  },

  // Delete Item
  deleteItem: async (id) => {
    let isConnected = false;

    try {
      const netState = await NetInfo.fetch();
      isConnected = !!netState.isConnected;
    } catch (e) {
      console.warn('Failed to fetch network state', e);
    }

    if (isConnected) {
      try {
        await apiClient(`/api/items/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API delete failed, queueing mutation offline...', e.message);
        await syncManager.enqueue('DELETE', id);
      }
    } else {
      console.log('App is offline. Queueing DELETE mutation...');
      await syncManager.enqueue('DELETE', id);
    }

    const newItems = get().items.filter((i) => i.id !== id);
    set({ items: newItems });
    await get().saveToLocal(newItems);
  },
}));

export default useItemStore;
