import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_KEY = '@exchange_rate_config';
const DEFAULT_FALLBACK_RATE = 1500; // 기존 정합성을 위해 1,500원 유지

export const exchangeRateService = {
  // Fetch full configuration from storage
  async getConfig() {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read exchange rate config', e);
    }
    // Default initial config
    return {
      rate: DEFAULT_FALLBACK_RATE,
      timestamp: 0,
      isManual: false,
      manualRate: DEFAULT_FALLBACK_RATE,
    };
  },

  // Save configuration to storage
  async saveConfig(config) {
    try {
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save exchange rate config', e);
    }
  },

  // Get active rate, handling API call, 24h caching, and manual override
  async getActiveRate() {
    const config = await this.getConfig();

    // 1. Manual Override Active
    if (config.isManual) {
      return config.manualRate;
    }

    // 2. Cache Check (24h = 86,400,000 ms)
    const now = Date.now();
    const isCacheValid = now - config.timestamp < 24 * 60 * 60 * 1000;

    if (isCacheValid && config.timestamp > 0) {
      return config.rate;
    }

    // 3. Cache expired or not set -> Fetch from API
    console.log('Fetching live exchange rate from API...');
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('API server error');
      const data = await response.json();
      
      const liveRate = data.rates && data.rates.KRW;
      if (liveRate) {
        const roundedRate = Math.round(liveRate);
        const updatedConfig = {
          ...config,
          rate: roundedRate,
          timestamp: now,
        };
        await this.saveConfig(updatedConfig);
        console.log(`Live exchange rate updated: 1 USD = ${roundedRate} KRW`);
        return roundedRate;
      }
    } catch (e) {
      console.warn('Failed to fetch live exchange rate, falling back to cached value.', e.message);
    }

    // Return cached rate, or default if everything fails
    return config.rate || DEFAULT_FALLBACK_RATE;
  },

  // Set manual rate override
  async setManualRate(manualRate, isManual) {
    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      isManual,
      manualRate: Number(manualRate) || DEFAULT_FALLBACK_RATE,
    };
    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }
};

export default exchangeRateService;
