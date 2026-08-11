import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

const QUEUE_KEY = '@offline_queue';

export const syncManager = {
  isSyncing: false,
  unsubscribeNetInfo: null,
  store: null, // Initialized dynamically in init(store) to avoid circular imports

  // Initialize network state listeners
  init(store) {
    this.store = store;
    if (this.unsubscribeNetInfo) return;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      console.log('Network connection status changed:', state.isConnected ? 'ONLINE' : 'OFFLINE');
      if (state.isConnected) {
        this.replayQueue();
      }
    });
  },

  // Clean up listeners
  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  },

  // Fetch current queue from storage
  async getQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to read offline sync queue', e);
      return [];
    }
  },

  // Save queue to storage
  async saveQueue(queue) {
    try {
      const raw = await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to write offline sync queue', e);
    }
  },

  // Add mutation to queue with conflict resolution/optimizations
  async enqueue(action, itemId, payload = null) {
    let queue = await this.getQueue();
    const timestamp = Date.now();

    if (action === 'DELETE') {
      const createIdx = queue.findIndex(q => q.itemId === itemId && q.action === 'CREATE');
      if (createIdx !== -1) {
        // Optimization 1: CREATE then DELETE on the same item cancels out entirely
        queue.splice(createIdx, 1);
        await this.saveQueue(queue);
        return;
      }

      // Optimization 2: Remove any queued UPDATE operations for this deleted item
      queue = queue.filter(q => !(q.itemId === itemId && q.action === 'UPDATE'));
    }

    if (action === 'UPDATE') {
      const createIdx = queue.findIndex(q => q.itemId === itemId && q.action === 'CREATE');
      if (createIdx !== -1) {
        // Optimization 3: UPDATE after CREATE -> Merge new fields directly into CREATE payload
        queue[createIdx].payload = { ...queue[createIdx].payload, ...payload };
        await this.saveQueue(queue);
        return;
      }

      const updateIdx = queue.findIndex(q => q.itemId === itemId && q.action === 'UPDATE');
      if (updateIdx !== -1) {
        // Optimization 4: Multiple updates -> Merge payloads
        queue[updateIdx].payload = { ...queue[updateIdx].payload, ...payload };
        queue[updateIdx].timestamp = timestamp;
        await this.saveQueue(queue);
        return;
      }
    }

    // Add mutation to queue
    queue.push({ action, itemId, payload, timestamp });
    await this.saveQueue(queue);
  },

  // Replay queued mutations sequentially (FIFO) with strict sequence guarantees
  async replayQueue() {
    if (this.isSyncing || !this.store) return;

    // Check if token exists before trying to replay
    const token = this.store.getState().token;
    if (!token) {
      console.log('Offline queue replay skipped: No active user session token.');
      return;
    }

    let queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`Replaying ${queue.length} offline mutations to the backend...`);

    let failedIndex = -1;

    for (let i = 0; i < queue.length; i++) {
      const mutation = queue[i];
      try {
        if (mutation.action === 'CREATE') {
          await apiClient('/api/items', {
            method: 'POST',
            body: JSON.stringify(mutation.payload),
          });
        } else if (mutation.action === 'UPDATE') {
          await apiClient(`/api/items/${mutation.itemId}`, {
            method: 'PUT',
            body: JSON.stringify(mutation.payload),
          });
        } else if (mutation.action === 'DELETE') {
          await apiClient(`/api/items/${mutation.itemId}`, {
            method: 'DELETE',
          });
        }
        console.log(`Offline sync successful: ${mutation.action} for item ${mutation.itemId}`);
      } catch (error) {
        console.warn(`Offline sync failed at item index ${i} (${mutation.action}):`, error.message);
        failedIndex = i;
        break; // Stop loop to preserve strict execution order of mutations
      }
    }

    if (failedIndex === -1) {
      // Replay completed successfully
      await this.saveQueue([]);
      console.log('All offline mutations successfully synced.');
      // Refresh items to guarantee client state is fully synchronized with DB
      await this.store.getState().loadItems();
    } else {
      // Replay was interrupted: keep the failing mutation and any subsequent items
      const remainingQueue = queue.slice(failedIndex);
      await this.saveQueue(remainingQueue);
      console.log(`Offline sync halted. ${remainingQueue.length} mutations left in queue.`);
    }

    this.isSyncing = false;
  }
};

export default syncManager;
