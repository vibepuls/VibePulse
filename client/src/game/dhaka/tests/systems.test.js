import test from 'node:test';
import assert from 'node:assert/strict';
import { VehicleController } from '../systems/VehicleController.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { SaveManager } from '../systems/SaveManager.js';
import { CollisionWorld } from '../systems/CollisionWorld.js';
import { TrafficAI } from '../systems/TrafficAI.js';

test('vehicle controller accelerates and returns finite coordinates', () => {
  const controller = new VehicleController();
  const player = { x: 0, z: 0, heading: 0, speed: 0, walking: false };
  const step = controller.update(player, { throttle: 1, steer: 0, brake: 0 }, 1 / 60);
  assert.ok(player.speed > 0);
  assert.ok(Number.isFinite(step.nextX));
  assert.ok(Number.isFinite(step.nextZ));
});

test('mission system only rewards a valid active mission once', () => {
  const missions = new MissionSystem();
  assert.equal(missions.start('delivery', 2).ok, true);
  const reward = missions.complete();
  assert.equal(reward.reward, 700);
  assert.equal(missions.start('delivery', 5).ok, true);
  assert.equal(missions.export().completed.includes('delivery'), true);
});

test('mission timer counts down and never becomes negative', () => {
  const missions = new MissionSystem();
  missions.start('taxi', 10);
  assert.equal(missions.remaining(40), 150);
  assert.equal(missions.remaining(1000), 0);
});

test('save manager safely round-trips validated save data', () => {
  const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) };
  const saves = new SaveManager(storage);
  assert.equal(saves.save({ x: 10, z: -20, money: 1200, completedMissions: ['taxi'] }), true);
  const loaded = saves.load();
  assert.equal(loaded.x, 10);
  assert.equal(loaded.money, 1200);
  assert.deepEqual(loaded.completedMissions, ['taxi']);
});

test('collision grid returns only nearby entities', () => {
  const grid = new CollisionWorld(20);
  const items = [{ x: 2, z: 3, id: 'near' }, { x: 200, z: 200, id: 'far' }];
  grid.rebuild(items);
  assert.deepEqual(grid.nearby(0, 0, 10).map(x => x.id), ['near']);
});

test('multi-stop missions advance through their route before completing', () => {
  const landmarks = Array.from({length: 7}, (_, i) => ({ name: 'Landmark ' + i }));
  const missions = new MissionSystem({ landmarks });
  const started = missions.start('taxi', 1, 3);
  assert.equal(started.target.name, 'Landmark 4');
  const pickup = missions.advance();
  assert.equal(pickup.complete, false);
  assert.equal(pickup.target.name, 'Landmark 0');
  assert.equal(missions.advance().complete, true);
});

test('vehicle profiles change handling by vehicle category', () => {
  const controller = new VehicleController();
  controller.setVehicleType('bus');
  assert.equal(controller.config.maxForwardSpeed, 24);
  controller.setVehicleType('motorcycle');
  assert.equal(controller.config.maxForwardSpeed, 44);
});

test('traffic AI slows behind nearby traffic using its spatial grid', () => {
  const traffic = new TrafficAI({ minSpeed: 2.5, maxSpeed: 15, followingDistance: 8 });
  const car = { mesh: { position: { x: 0, y: 0, z: 0 } }, axis: 'x', dir: 1, lane: 0, speed: 8, desiredSpeed: 10 };
  const lead = { mesh: { position: { x: 5, y: 0, z: 0 } }, axis: 'x', dir: 1, lane: 0, speed: 3, desiredSpeed: 3 };
  traffic.update([car, lead], { x: 100, z: 100 }, 0.1, []);
  assert.ok(car.speed < 10);
  assert.ok(Number.isFinite(car.mesh.position.x));
});
