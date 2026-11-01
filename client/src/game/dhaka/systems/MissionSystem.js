const MISSION_TYPES = Object.freeze({
  explore: { id: 'explore', title: 'Landmark Explorer', description: 'Visit a marked Dhaka landmark.', reward: 500, duration: 0 },
  taxi: { id: 'taxi', title: 'CNG Taxi Run', description: 'Pick up the passenger and drive to the drop-off landmark.', reward: 850, duration: 180 },
  delivery: { id: 'delivery', title: 'Market Delivery', description: 'Collect the parcel and deliver it to the destination before time runs out.', reward: 700, duration: 150 },
  race: { id: 'race', title: 'Dhaka Street Sprint', description: 'Pass every route checkpoint in order before time runs out.', reward: 1200, duration: 210 },
  rickshaw: { id: 'rickshaw', title: 'Rickshaw Passenger', description: 'Pick up a passenger and complete the short city route.', reward: 600, duration: 160 },
  bus: { id: 'bus', title: 'City Bus Route', description: 'Visit the marked bus stops in the required order.', reward: 1000, duration: 240 },
  collection: { id: 'collection', title: 'Vehicle Collector', description: 'Visit the vehicle collection point.', reward: 450, duration: 0 },
});

const ROUTES = Object.freeze({
  taxi: [4, 0], delivery: [2, 4], race: [1, 5, 6], rickshaw: [4, 5], bus: [6, 1, 2], collection: [3],
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
    this.startTargetIndex = Number.isInteger(saved.startTargetIndex) ? saved.startTargetIndex : 0;
    this.routeIndices = Array.isArray(saved.routeIndices) && saved.routeIndices.length
      ? saved.routeIndices.filter(i => Number.isInteger(i) && i >= 0 && i < landmarks.length)
      : this.makeRoute(this.active, this.startTargetIndex);
    if (!this.routeIndices.length) this.routeIndices = this.makeRoute('explore', this.startTargetIndex);
    this.waypointIndex = Number.isInteger(saved.waypointIndex) ? Math.min(saved.waypointIndex, this.routeIndices.length - 1) : 0;
  }
  makeRoute(id, startIndex = 0) {
    if (!this.landmarks.length) return [];
    const indices = id === 'explore' ? [startIndex] : (ROUTES[id] || [startIndex]);
    return indices.map(i => ((i % this.landmarks.length) + this.landmarks.length) % this.landmarks.length);
  }
  get definition() { return MISSION_TYPES[this.active] || MISSION_TYPES.explore; }
  get target() { return this.landmarks[this.routeIndices[this.waypointIndex]] || null; }
  get waypointCount() { return this.routeIndices.length; }
  get all() { return Object.values(MISSION_TYPES).map(m => ({ ...m, completed: this.completed.has(m.id), active: m.id === this.active })); }
  start(id, nowSeconds = 0, startTargetIndex = 0) {
    if (!MISSION_TYPES[id]) return { ok: false, reason: 'Unknown mission.' };
    this.active = id; this.startedAt = nowSeconds; this.progress = 0; this.sequence += 1;
    this.startTargetIndex = startTargetIndex;
    this.routeIndices = this.makeRoute(id, startTargetIndex); this.waypointIndex = 0;
    return { ok: true, mission: this.definition, target: this.target, waypointCount: this.waypointCount };
  }
  advance() {
    if (this.waypointIndex < this.routeIndices.length - 1) {
      this.waypointIndex += 1; this.progress = this.waypointIndex;
      return { complete: false, target: this.target, step: this.waypointIndex + 1, total: this.waypointCount };
    }
    return { complete: true, target: null, step: this.waypointCount, total: this.waypointCount };
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
    return { active: this.active, completed: [...this.completed], startedAt: this.startedAt, progress: this.progress, lastReward: this.lastReward, sequence: this.sequence, startTargetIndex: this.startTargetIndex, routeIndices: this.routeIndices, waypointIndex: this.waypointIndex };
  }
  static get Types() { return MISSION_TYPES; }
}
