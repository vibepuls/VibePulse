const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Spatially indexed lane-following traffic. All positions are in game-world meters.
 * Vehicle records are compatible with the existing Three.js game: {mesh, axis, dir,
 * lane, speed, desiredSpeed, type}. Updates are bounded to nearby grid cells instead
 * of comparing every active car against every other car.
 */
export class TrafficAI {
  constructor({ minSpeed = 4, maxSpeed = 15, followingDistance = 8, yieldDistance = 12, cellSize = 28, laneChangeCooldown = 3.5 } = {}) {
    this.minSpeed = minSpeed; this.maxSpeed = maxSpeed; this.followingDistance = followingDistance;
    this.yieldDistance = yieldDistance; this.cellSize = cellSize; this.laneChangeCooldown = laneChangeCooldown; this.speedMultiplier = 1; this.tick = 0;
  }
  cellKey(x, z) { return Math.floor(x / this.cellSize) + ':' + Math.floor(z / this.cellSize); }
  buildGrid(items, positionOf) {
    const grid = new Map();
    for (const item of items) {
      const p = positionOf(item); if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
      const key = this.cellKey(p.x, p.z); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(item);
    }
    return grid;
  }
  nearby(grid, x, z, radius = this.followingDistance + 10) {
    const out = [], minX = Math.floor((x-radius)/this.cellSize), maxX = Math.floor((x+radius)/this.cellSize);
    const minZ = Math.floor((z-radius)/this.cellSize), maxZ = Math.floor((z+radius)/this.cellSize);
    for (let gx=minX; gx<=maxX; gx++) for (let gz=minZ; gz<=maxZ; gz++) {
      const cell=grid.get(gx+':'+gz); if(cell) out.push(...cell);
    }
    return out;
  }
  update(vehicles, player, dt, pedestrianPositions = []) {
    if (!Array.isArray(vehicles) || !Number.isFinite(dt) || dt <= 0) return;
    this.tick += dt;
    const trafficGrid = this.buildGrid(vehicles, v => v?.mesh?.position);
    const pedGrid = this.buildGrid(pedestrianPositions, p => p?.position || p);
    for (const vehicle of vehicles) {
      if (!vehicle?.mesh) continue;
      const axis = vehicle.axis === 'x' ? 'x' : 'z', other = axis === 'x' ? 'z' : 'x', pos = vehicle.mesh.position;
      let targetSpeed = clamp(vehicle.desiredSpeed ?? vehicle.speed ?? 8, this.minSpeed, this.maxSpeed) * clamp(this.speedMultiplier, 0.25, 1.25);
      let blocked = false;
      const neighbors = this.nearby(trafficGrid, pos.x, pos.z);
      for (const ahead of neighbors) {
        if (ahead === vehicle || !ahead?.mesh || ahead.axis !== vehicle.axis || ahead.dir !== vehicle.dir) continue;
        const delta = (ahead.mesh.position[axis] - pos[axis]) * vehicle.dir;
        const laneDelta = Math.abs(ahead.mesh.position[other] - pos[other]);
        if (delta > 0 && delta < this.followingDistance && laneDelta < 2.8) {
          blocked = true;
          targetSpeed = Math.min(targetSpeed, this.minSpeed + (delta / this.followingDistance) * (targetSpeed - this.minSpeed));
        }
      }
      vehicle.laneChangeRemaining = Math.max(0, (vehicle.laneChangeRemaining || 0) - dt);
      if (blocked && vehicle.laneChangeRemaining <= 0) {
        const baseLane = Number.isFinite(vehicle.lane) ? vehicle.lane : pos[other];
        const candidates = [baseLane - 4.2, baseLane + 4.2].sort(() => Math.random() - 0.5);
        for (const candidate of candidates) {
          const safe = neighbors.every(otherVehicle => {
            if (otherVehicle === vehicle || !otherVehicle?.mesh || otherVehicle.axis !== vehicle.axis || otherVehicle.dir !== vehicle.dir) return true;
            const delta = (otherVehicle.mesh.position[axis] - pos[axis]) * vehicle.dir;
            return !(Math.abs(delta) < this.followingDistance && Math.abs(otherVehicle.mesh.position[other] - candidate) < 2.8);
          });
          if (safe) { vehicle.targetLane = candidate; vehicle.laneChangeRemaining = this.laneChangeCooldown; break; }
        }
      }
      const targetLane = Number.isFinite(vehicle.targetLane) ? vehicle.targetLane : (Number.isFinite(vehicle.lane) ? vehicle.lane : pos[other]);
      pos[other] += (targetLane - pos[other]) * Math.min(1, dt * 1.8);
      const nearbyPeds = this.nearby(pedGrid, pos.x, pos.z, this.yieldDistance);
      for (const pedestrian of nearbyPeds) {
        const p = pedestrian?.position || pedestrian, px = p?.x, pz = p?.z;
        if (Number.isFinite(px) && Number.isFinite(pz) && Math.hypot(px-pos.x,pz-pos.z)<this.yieldDistance) {
          targetSpeed = Math.min(targetSpeed, this.minSpeed); break;
        }
      }
      const response = Math.min(1, dt * 1.8);
      vehicle.speed += (targetSpeed - vehicle.speed) * response;
      pos[axis] += vehicle.dir * vehicle.speed * dt;
    }
  }
}
