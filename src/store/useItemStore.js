import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

const STORAGE_KEY = '@off_the_books_items_v2';

export const useItemStore = create((set, get) => ({
  items: [],
  ready: false,
  token: null, // Pre-declared for Step 2 conditional navigation
  activeTab: 'dashboard',

  setReady: (ready) => set({ ready }),
  setToken: (token) => set({ token }),
  setActiveTab: (activeTab) => set({ activeTab }),
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

  // Load items from API with AsyncStorage fallback
  loadItems: async () => {
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
    try {
      const response = await apiClient('/api/items', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (response && response.id) {
        savedItem = response;
      }
    } catch (e) {
      console.warn('Backend add failed, applying local changes only.', e);
    }

    const newItems = [savedItem, ...get().items];
    set({ items: newItems, activeTab: 'inventory' });
    await get().saveToLocal(newItems);
  },

  // Update Item
  updateItem: async (updated) => {
    let savedItem = updated;
    try {
      const response = await apiClient(`/api/items/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      if (response && response.id) {
        savedItem = response;
      }
    } catch (e) {
      console.warn('Backend update failed, applying local changes only.', e);
    }

    const newItems = get().items.map((i) => (i.id === updated.id ? savedItem : i));
    set({ items: newItems });
    await get().saveToLocal(newItems);
  },

  // Delete Item
  deleteItem: async (id) => {
    try {
      await apiClient(`/api/items/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Backend delete failed, applying local changes only.', e);
    }

    const newItems = get().items.filter((i) => i.id !== id);
    set({ items: newItems });
    await get().saveToLocal(newItems);
  },
}));

export default useItemStore;
