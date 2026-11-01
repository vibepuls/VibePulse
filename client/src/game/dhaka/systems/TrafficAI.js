const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Lightweight lane-following traffic behavior. Pass only active vehicles.
 * Vehicle records: { mesh, axis: 'x'|'z', dir: -1|1, speed, lane, desiredSpeed, type }.
 */
export class TrafficAI {
  constructor({ minSpeed = 4, maxSpeed = 15, followingDistance = 8, yieldDistance = 12 } = {}) {
    this.minSpeed = minSpeed;
    this.maxSpeed = maxSpeed;
    this.followingDistance = followingDistance;
    this.yieldDistance = yieldDistance;
    this.tick = 0;
  }

  update(vehicles, player, dt, pedestrianPositions = []) {
    if (!Array.isArray(vehicles) || !Number.isFinite(dt) || dt <= 0) return;
    this.tick += dt;
    for (const vehicle of vehicles) {
      if (!vehicle?.mesh) continue;
      const axis = vehicle.axis === 'x' ? 'x' : 'z';
      const other = axis === 'x' ? 'z' : 'x';
      const pos = vehicle.mesh.position;
      let targetSpeed = clamp(vehicle.desiredSpeed ?? vehicle.speed ?? 8, this.minSpeed, this.maxSpeed);

      // Same-lane following: only slow for vehicles moving in the same direction.
      for (const ahead of vehicles) {
        if (ahead === vehicle || ahead.axis !== vehicle.axis || ahead.dir !== vehicle.dir) continue;
        const delta = (ahead.mesh.position[axis] - pos[axis]) * vehicle.dir;
        const laneDelta = Math.abs((ahead.lane ?? ahead.mesh.position[other]) - (vehicle.lane ?? pos[other]));
        if (delta > 0 && delta < this.followingDistance && laneDelta < 2.6) {
          targetSpeed = Math.min(targetSpeed, this.minSpeed + (delta / this.followingDistance) * (targetSpeed - this.minSpeed));
        }
      }

      // Yield to nearby pedestrians by reducing speed, not abruptly stopping the whole simulation.
      for (const pedestrian of pedestrianPositions) {
        const px = pedestrian.x ?? pedestrian.position?.x;
        const pz = pedestrian.z ?? pedestrian.position?.z;
        if (!Number.isFinite(px) || !Number.isFinite(pz)) continue;
        if (Math.hypot(px - pos.x, pz - pos.z) < this.yieldDistance) {
          targetSpeed = Math.min(targetSpeed, this.minSpeed);
          break;
        }
      }

      const response = Math.min(1, dt * 1.8);
      vehicle.speed += (targetSpeed - vehicle.speed) * response;
      pos[axis] += vehicle.dir * vehicle.speed * dt;
    }
  }
}
