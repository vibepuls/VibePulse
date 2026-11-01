const STORAGE_KEY = 'vibepulse-dhaka-save';
const SAVE_VERSION = 2;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export class SaveManager {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  load() {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return { version: SAVE_VERSION };
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') return { version: SAVE_VERSION };
      return {
        ...value,
        version: SAVE_VERSION,
        x: finite(value.x, -520), z: finite(value.z, -520),
        heading: finite(value.heading, 0), distance: Math.max(0, finite(value.distance, 0)),
        money: Math.max(0, Math.floor(finite(value.money, 12500))),
        targetIndex: Number.isInteger(value.targetIndex) ? value.targetIndex : 0,
        completedMissions: Array.isArray(value.completedMissions) ? value.completedMissions : [],
        ownedVehicles: Array.isArray(value.ownedVehicles) ? value.ownedVehicles.filter(v => typeof v === 'string').slice(0,40) : ['car'],
        ownedGarages: Array.isArray(value.ownedGarages) ? value.ownedGarages.filter(v => typeof v === 'string').slice(0,12) : ['starter'],
        vehicleType: typeof value.vehicleType === 'string' ? value.vehicleType : 'car',
        mission: value.mission && typeof value.mission === 'object' ? value.mission : {},
        settings: value.settings && typeof value.settings === 'object' ? value.settings : {},
      };
    } catch { return { version: SAVE_VERSION }; }
  }
  save(snapshot) {
    try {
      const safe = { ...snapshot, version: SAVE_VERSION, updatedAt: Date.now() };
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(safe));
      return true;
    } catch { return false; }
  }
  clear() { try { this.storage?.removeItem(STORAGE_KEY); return true; } catch { return false; } }
  static get key() { return STORAGE_KEY; }
}
