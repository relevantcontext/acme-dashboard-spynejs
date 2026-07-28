import { SpyneTrait, SpyneAppProperties, ChannelPayloadFilter } from 'spyne';

export class AppLocalStorageTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'localStorage$');
  }

  // ---- Base Key Management ----
  static localStorage$GetKey() {
    // Return global key or default if not set
    return (
      SpyneAppProperties?.config?.storageConfig?.storageKey || 'spynejs-store'
    );
  }

  // ---- Single Value Accessors ----
  static localStorage$GetItem(subkey) {
    const base = this.localStorage$GetStore();
    return base ? base[subkey] : null;
  }

  static localStorage$SetItem(subkey, value) {
    const base = this.localStorage$GetStore() || {};
    base[subkey] = value;
    this.localStorage$SetStore(base);
  }

  // ---- Full Object Accessors ----
  static localStorage$GetStore() {
    const key = this.localStorage$GetKey();
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn(`Error reading localStorage key "${key}":`, err);
      return {};
    }
  }

  static localStorage$SetStore(obj) {
    const key = this.localStorage$GetKey();
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (err) {
      console.warn(`Error writing to localStorage key "${key}":`, err);
    }
  }

  static localStorage$InitAppSettings() {
    const key = this.localStorage$GetKey();
    const { storageConfig } = SpyneAppProperties.config || {};
    let finalStore = {};

    try {
      const raw = localStorage.getItem(key);

      if (!raw) {
        finalStore = storageConfig ? { ...storageConfig } : {};
        localStorage.setItem(key, JSON.stringify(finalStore));
        console.info(
          `[SpyneJS] Initialized localStorage store "${key}" with storageConfig.`,
        );
      } else {
        const existingStore = JSON.parse(raw);
        finalStore = { ...storageConfig, ...existingStore };
        localStorage.setItem(key, JSON.stringify(finalStore));
      }
    } catch (err) {
      console.warn(
        `[SpyneJS] Error initializing localStorage key "${key}":`,
        err,
      );
      finalStore = { ...storageConfig };
    }

    this.localStorage$SendInfoTo_LocalStorage_Channel(
      finalStore,
      'CHANNEL_LOCAL_STORAGE_APP_SETTINGS_INITIALIZED_EVENT',
    );

    return finalStore;
  }

  static localStorage$SendInfoTo_LocalStorage_Channel(
    payload = {},
    action = 'CHANNEL_LOCAL_STORAGE_EMPTY_EVENT',
  ) {
    this.sendInfoToChannel('CHANNEL_LOCAL_STORAGE', payload, action);
  }

  // ---- Utility ----
  static localStorage$Clear() {
    const key = this.localStorage$GetKey();
    localStorage.removeItem(key);
  }

  // --- channel local storage methods
  static localStorage$onChannelUpdateKeyRequest() {}

  static localStorage$ChannelOnRegistered() {
    const settinsPayloadFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_APP_SETTING_EVENT',
    });

    this.getChannel('CHANNEL_APP', settinsPayloadFilter).subscribe(
      this.localStorage$ChannelOnStatusSettingsEvent.bind(this),
    );
  }

  static localStorage$ChannelOnStatusSettingsEvent(e) {
    const { settingsType, settingsValue } = e.payload;

    this.localStorage$SetItem(settingsType, settingsValue);
  }

  static localStorage$ChannelOnViewStreamInfo(e) {
    const { payload, action } = e;
    this.sendChannelPayload(action, payload);
  }
}
