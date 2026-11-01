const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Vehicle motion adapter for the existing Three.js Dhaka world.
 * Heading convention: 0 radians points toward world +Z.
 * Positive steering input turns left; negative steering turns right.
 */
export class VehicleController {
  constructor(config = {}) {
    this.config = {
      acceleration: 22,
      brakeDeceleration: 28,
      maxForwardSpeed: 42,
      maxReverseSpeed: 13,
      coastDrag: 0.035,
      steeringLowSpeed: 0.65,
      steeringHighSpeed: 2.15,
      steeringSpeedReference: 17,
      ...config,
    };
  }

  update(player, input, dt) {
    if (!player || player.walking || !Number.isFinite(dt) || dt <= 0) return;
    const c = this.config;
    const throttle = clamp(Number(input.throttle) || 0, -1, 1);
    const steer = clamp(Number(input.steer) || 0, -1, 1);
    const brake = clamp(Number(input.brake) || 0, 0, 1);

    if (throttle > 0) player.speed = Math.min(c.maxForwardSpeed, player.speed + c.acceleration * throttle * dt);
    else if (throttle < 0) player.speed = Math.max(-c.maxReverseSpeed, player.speed + c.brakeDeceleration * throttle * dt);
    else player.speed *= Math.exp(-c.coastDrag * 60 * dt);

    player.speed *= Math.max(0, 1 - brake * 12 * dt);
    if (Math.abs(player.speed) < 0.025) player.speed = 0;

    const speedFactor = Math.min(Math.abs(player.speed) / c.steeringSpeedReference, 1.5);
    const steeringRate = c.steeringLowSpeed + speedFactor * (c.steeringHighSpeed - c.steeringLowSpeed) / 1.5;
    const reverseFactor = player.speed < -0.1 ? -1 : 1;
    player.heading -= steer * steeringRate * dt * reverseFactor;

    const forwardX = -Math.sin(player.heading);
    const forwardZ = -Math.cos(player.heading);
    return {
      nextX: player.x + forwardX * player.speed * dt,
      nextZ: player.z + forwardZ * player.speed * dt,
      speed: player.speed,
    };
  }
}
