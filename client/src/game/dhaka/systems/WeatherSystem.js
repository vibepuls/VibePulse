import * as THREE from 'three';

const WEATHER = Object.freeze({
  clear: { label: 'Clear', fog: 0x9ab9ca, fogNear: 160, fogFar: 1050, rain: 0, wet: 0, wind: 0 },
  smog: { label: 'Dhaka Smog', fog: 0xb4b0a0, fogNear: 75, fogFar: 560, rain: 0, wet: 0, wind: 0.15 },
  rain: { label: 'Rain', fog: 0x60798a, fogNear: 90, fogFar: 650, rain: 650, wet: 0.65, wind: 0.8 },
  monsoon: { label: 'Monsoon', fog: 0x3f5665, fogNear: 55, fogFar: 440, rain: 1500, wet: 0.95, wind: 1.8 },
  fog: { label: 'Morning Fog', fog: 0x9aaab0, fogNear: 25, fogFar: 290, rain: 0, wet: 0.05, wind: 0.05 },
});

export class WeatherSystem {
  constructor(THREERef = THREE) { this.THREE = THREERef; this.type = 'clear'; this.points = null; this.velocities = null; this.wetMaterials = new Set(); }
  attach(scene, camera) {
    this.scene = scene; this.camera = camera;
    const count = 1800, positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count);
    for (let i=0;i<count;i++) { positions[i*3]=(Math.random()-.5)*90; positions[i*3+1]=Math.random()*55; positions[i*3+2]=(Math.random()-.5)*90; this.velocities[i]=18+Math.random()*22; }
    const geometry = new this.THREE.BufferGeometry(); geometry.setAttribute('position', new this.THREE.BufferAttribute(positions,3));
    const material = new this.THREE.PointsMaterial({color:0xb9d8ee,size:0.12,transparent:true,opacity:0.55,depthWrite:false});
    this.points = new this.THREE.Points(geometry,material); this.points.frustumCulled = false; this.points.visible = false; scene.add(this.points);
  }
  registerMaterial(material) { if (material && 'roughness' in material) this.wetMaterials.add({material, roughness:material.roughness, metalness:material.metalness}); }
  set(type, scene = this.scene) {
    this.type = WEATHER[type] ? type : 'clear'; const cfg = WEATHER[this.type];
    if (scene) { scene.fog = new this.THREE.Fog(cfg.fog,cfg.fogNear,cfg.fogFar); if (scene.background?.set) scene.background.set(cfg.fog); }
    if (this.points) { this.points.visible = cfg.rain > 0; this.points.material.opacity = this.type === 'monsoon' ? 0.8 : 0.48; }
    for (const entry of this.wetMaterials) { entry.material.roughness = Math.max(0.08, entry.roughness - cfg.wet * 0.55); entry.material.metalness = Math.min(0.7, entry.metalness + cfg.wet * 0.18); entry.material.needsUpdate = true; }
    return cfg;
  }
  update(dt, player) {
    if (!this.points || !this.scene || !player) return;
    const cfg = WEATHER[this.type], positions = this.points.geometry.attributes.position.array;
    this.points.position.set(player.x,0,player.z);
    if (cfg.rain > 0) {
      const count = positions.length / 3, now = performance.now() * 0.0005;
      for (let i=0;i<count;i++) { const j=i*3; positions[j+1]-=this.velocities[i]*dt*cfg.wind; positions[j]+=Math.sin(i+now)*dt*cfg.wind; if(positions[j+1]<0){positions[j+1]=20+Math.random()*35;positions[j]=(Math.random()-.5)*90;positions[j+2]=(Math.random()-.5)*90;} }
      this.points.geometry.attributes.position.needsUpdate = true;
    }
  }
  dispose() { if(this.points){this.scene?.remove(this.points);this.points.geometry.dispose();this.points.material.dispose();this.points=null;} this.wetMaterials.clear(); }
  static get Presets() { return WEATHER; }
}
