const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Vehicle motion adapter for the existing Three.js Dhaka world.
 * Heading convention: 0 radians points toward world +Z.
 * Positive steering input turns left; negative steering turns right.
 */
export class VehicleController {
  constructor(config = {}) {
    this.baseConfig = {
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
    this.config = { ...this.baseConfig };
  }

  setVehicleType(type = 'car') {
    const profiles = {
      car: { acceleration: 22, maxForwardSpeed: 42, maxReverseSpeed: 13, steeringLowSpeed: 0.65, steeringHighSpeed: 2.15 },
      hatchback: { acceleration: 24, maxForwardSpeed: 40, maxReverseSpeed: 13, steeringLowSpeed: 0.72, steeringHighSpeed: 2.3 },
      suv: { acceleration: 19, maxForwardSpeed: 39, maxReverseSpeed: 12, steeringLowSpeed: 0.55, steeringHighSpeed: 1.85 },
      luxury: { acceleration: 26, maxForwardSpeed: 48, maxReverseSpeed: 14, steeringLowSpeed: 0.72, steeringHighSpeed: 2.35 },
      van: { acceleration: 16, maxForwardSpeed: 30, maxReverseSpeed: 9, steeringLowSpeed: 0.48, steeringHighSpeed: 1.55 },
      microbus: { acceleration: 17, maxForwardSpeed: 31, maxReverseSpeed: 9, steeringLowSpeed: 0.48, steeringHighSpeed: 1.5 },
      deliveryVan: { acceleration: 15, maxForwardSpeed: 28, maxReverseSpeed: 8, steeringLowSpeed: 0.45, steeringHighSpeed: 1.4 },
      pickup: { acceleration: 18, maxForwardSpeed: 34, maxReverseSpeed: 10, steeringLowSpeed: 0.5, steeringHighSpeed: 1.6 },
      bus: { acceleration: 12, maxForwardSpeed: 24, maxReverseSpeed: 6, steeringLowSpeed: 0.36, steeringHighSpeed: 1.1 },
      minibus: { acceleration: 14, maxForwardSpeed: 28, maxReverseSpeed: 7, steeringLowSpeed: 0.4, steeringHighSpeed: 1.25 },
      schoolBus: { acceleration: 11, maxForwardSpeed: 22, maxReverseSpeed: 5, steeringLowSpeed: 0.34, steeringHighSpeed: 1.05 },
      coach: { acceleration: 13, maxForwardSpeed: 30, maxReverseSpeed: 6, steeringLowSpeed: 0.34, steeringHighSpeed: 1.05 },
      truck: { acceleration: 10, maxForwardSpeed: 23, maxReverseSpeed: 6, steeringLowSpeed: 0.32, steeringHighSpeed: 1.0 },
      firetruck: { acceleration: 12, maxForwardSpeed: 25, maxReverseSpeed: 6, steeringLowSpeed: 0.34, steeringHighSpeed: 1.05 },
      ambulance: { acceleration: 23, maxForwardSpeed: 40, maxReverseSpeed: 11, steeringLowSpeed: 0.6, steeringHighSpeed: 1.8 },
      police: { acceleration: 25, maxForwardSpeed: 46, maxReverseSpeed: 13, steeringLowSpeed: 0.7, steeringHighSpeed: 2.2 },
      cng: { acceleration: 13, maxForwardSpeed: 21, maxReverseSpeed: 6, steeringLowSpeed: 0.55, steeringHighSpeed: 1.8 },
      rickshaw: { acceleration: 5, maxForwardSpeed: 8, maxReverseSpeed: 2, steeringLowSpeed: 0.5, steeringHighSpeed: 1.5 },
      batteryRickshaw: { acceleration: 8, maxForwardSpeed: 13, maxReverseSpeed: 3, steeringLowSpeed: 0.5, steeringHighSpeed: 1.5 },
      handcart: { acceleration: 3, maxForwardSpeed: 5, maxReverseSpeed: 1, steeringLowSpeed: 0.35, steeringHighSpeed: 1.0 },
      motorcycle: { acceleration: 30, maxForwardSpeed: 44, maxReverseSpeed: 5, steeringLowSpeed: 0.8, steeringHighSpeed: 2.8 },
      scooter: { acceleration: 19, maxForwardSpeed: 30, maxReverseSpeed: 4, steeringLowSpeed: 0.85, steeringHighSpeed: 2.6 },
      bicycle: { acceleration: 6, maxForwardSpeed: 11, maxReverseSpeed: 1, steeringLowSpeed: 0.7, steeringHighSpeed: 2.1 },
      boat: { acceleration: 9, maxForwardSpeed: 19, maxReverseSpeed: 5, steeringLowSpeed: 0.35, steeringHighSpeed: 1.0 },
      riverLaunch: { acceleration: 7, maxForwardSpeed: 15, maxReverseSpeed: 4, steeringLowSpeed: 0.28, steeringHighSpeed: 0.8 },
    };
    this.config = { ...this.baseConfig, ...(profiles[type] || profiles.car) };
  }

  update(player, input, dt) {
    if (!player || player.walking || !Number.isFinite(dt) || dt <= 0) return;
    const c = this.config;
    const grip = clamp(Number(this.gripMultiplier ?? 1), 0.45, 1.1);
    const throttle = clamp(Number(input.throttle) || 0, -1, 1);
    const steer = clamp(Number(input.steer) || 0, -1, 1);
    const brake = clamp(Number(input.brake) || 0, 0, 1);

    if (throttle > 0) player.speed = Math.min(c.maxForwardSpeed, player.speed + c.acceleration * throttle * grip * dt);
    else if (throttle < 0) player.speed = Math.max(-c.maxReverseSpeed, player.speed + c.brakeDeceleration * throttle * grip * dt);
    else player.speed *= Math.exp(-c.coastDrag * 60 * dt);

    player.speed *= Math.max(0, 1 - brake * 12 * dt * grip);
    if (Math.abs(player.speed) < 0.025) player.speed = 0;

    const speedFactor = Math.min(Math.abs(player.speed) / c.steeringSpeedReference, 1.5);
    const steeringRate = (c.steeringLowSpeed + speedFactor * (c.steeringHighSpeed - c.steeringLowSpeed) / 1.5) * grip;
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
