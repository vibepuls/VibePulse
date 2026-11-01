const MISSION_TYPES = Object.freeze({
  explore: { id: 'explore', title: 'Landmark Explorer', description: 'Visit a marked Dhaka landmark.', reward: 500, duration: 0 },
  taxi: { id: 'taxi', title: 'CNG Taxi Run', description: 'Drive to the passenger pickup and drop-off points.', reward: 850, duration: 180 },
  delivery: { id: 'delivery', title: 'Market Delivery', description: 'Deliver a package across the city before time runs out.', reward: 700, duration: 150 },
  race: { id: 'race', title: 'Dhaka Street Sprint', description: 'Pass the route checkpoints in order.', reward: 1200, duration: 210 },
  rickshaw: { id: 'rickshaw', title: 'Rickshaw Passenger', description: 'Complete a short passenger route on foot or in a local vehicle.', reward: 600, duration: 160 },
  bus: { id: 'bus', title: 'City Bus Route', description: 'Visit the marked stops along the route.', reward: 1000, duration: 240 },
  collection: { id: 'collection', title: 'Vehicle Collector', description: 'Visit a vehicle collection point.', reward: 450, duration: 0 },
});

export class MissionSystem {
  constructor({ landmarks = [], saved = {} } = {}) {
    this.landmarks = landmarks;
    this.completed = new Set(Array.isArray(saved.completed) ? saved.completed : []);
    this.active = saved.active && MISSION_TYPES[saved.active] ? saved.active : 'explore';
    this.startedAt = Number.isFinite(saved.startedAt) ? saved.startedAt : 0;
    this.progress = Number.isFinite(saved.progress) ? saved.progress : 0;
    this.lastReward = Number.isFinite(saved.lastReward) ? saved.lastReward : 0;
    this.sequence = Number.isInteger(saved.sequence) ? saved.sequence : 0;
  }
  get definition() { return MISSION_TYPES[this.active] || MISSION_TYPES.explore; }
  get all() { return Object.values(MISSION_TYPES).map(m => ({ ...m, completed: this.completed.has(m.id), active: m.id === this.active })); }
  start(id, nowSeconds = 0) {
    if (!MISSION_TYPES[id]) return { ok: false, reason: 'Unknown mission.' };
    this.active = id; this.startedAt = nowSeconds; this.progress = 0; this.sequence += 1;
    return { ok: true, mission: this.definition };
  }
  addProgress(amount = 1) { this.progress = Math.max(0, this.progress + Math.max(0, Number(amount) || 0)); return this.progress; }
  remaining(nowSeconds = 0) {
    const duration = this.definition.duration;
    return duration > 0 && this.startedAt > 0 ? Math.max(0, duration - (nowSeconds - this.startedAt)) : duration;
  }
  complete(id = this.active) {
    if (!MISSION_TYPES[id]) return { ok: false, reward: 0 };
    this.completed.add(id); this.lastReward = MISSION_TYPES[id].reward;
    return { ok: true, reward: this.lastReward, mission: MISSION_TYPES[id] };
  }
  export() {
    return { active: this.active, completed: [...this.completed], startedAt: this.startedAt, progress: this.progress, lastReward: this.lastReward, sequence: this.sequence };
  }
  static get Types() { return MISSION_TYPES; }
}
