const STATES = Object.freeze({ WALK: 'walk', WAIT: 'wait', CROSS: 'cross', IDLE: 'idle', SHOP: 'shop', TALK: 'talk', BOARD: 'board' });

/**
 * Deterministic low-cost pedestrian state machine.
 * Agent shape: { mesh, x, z, targetX, targetZ, speed, state, waitUntil, radius }.
 */
export class PedestrianAI {
  constructor({ walkSpeed = 1.25, arrivalRadius = 1.2, crossingWait = 1.5 } = {}) {
    this.walkSpeed = walkSpeed;
    this.arrivalRadius = arrivalRadius;
    this.crossingWait = crossingWait;
  }

  update(agents, dt, nowSeconds, isRoadSafe = () => true) {
    if (!Array.isArray(agents) || dt <= 0) return;
    for (const agent of agents) {
      if (!agent?.mesh) continue;
      if ([STATES.SHOP,STATES.TALK,STATES.BOARD].includes(agent.state)) {
        if (nowSeconds < (agent.actionUntil ?? 0)) continue;
        agent.state = STATES.WALK;
      }
      if (agent.state === STATES.IDLE) {
        if (nowSeconds < (agent.waitUntil ?? 0)) continue;
        agent.state = STATES.WALK;
      }
      if (agent.state === STATES.WAIT) {
        if (nowSeconds >= (agent.waitUntil ?? 0)) agent.state = STATES.CROSS;
        continue;
      }
      const dx = (agent.targetX ?? agent.x) - agent.x;
      const dz = (agent.targetZ ?? agent.z) - agent.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= this.arrivalRadius) {
        agent.state = STATES.IDLE;
        agent.waitUntil = nowSeconds + 1.2;
        agent.mesh.rotation.y = Math.atan2(dx, dz);
        continue;
      }
      if (agent.state === STATES.CROSS && !isRoadSafe(agent)) {
        agent.state = STATES.WAIT;
        agent.waitUntil = nowSeconds + this.crossingWait;
        continue;
      }
      agent.state = agent.state === STATES.CROSS ? STATES.CROSS : STATES.WALK;
      const speed = agent.speed ?? this.walkSpeed;
      const step = Math.min(distance, speed * dt);
      agent.x += (dx / distance) * step;
      agent.z += (dz / distance) * step;
      agent.mesh.position.x = agent.x;
      agent.mesh.position.z = agent.z;
      agent.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  static get States() { return STATES; }
}
