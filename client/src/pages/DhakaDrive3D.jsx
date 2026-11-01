import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VehicleController } from '../game/dhaka/systems/VehicleController';
import { TrafficAI } from '../game/dhaka/systems/TrafficAI';
import { PedestrianAI } from '../game/dhaka/systems/PedestrianAI';
import { MissionSystem } from '../game/dhaka/systems/MissionSystem';
import { SaveManager } from '../game/dhaka/systems/SaveManager';
import { AudioManager } from '../game/dhaka/systems/AudioManager';
import { WeatherSystem } from '../game/dhaka/systems/WeatherSystem';
import api from '../services/api';
import { CarFront, MapPin, Pause, Play, RotateCcw, Volume2, VolumeX, Gauge, Footprints } from 'lucide-react';

const AREAS = [
  { name: 'Gulshan', x: -500, z: -500 }, { name: 'Banani', x: 500, z: -700 },
  { name: 'Farmgate', x: -500, z: 500 }, { name: 'Shahbagh', x: 500, z: 400 },
  { name: 'Old Dhaka', x: -850, z: 1050 }, { name: 'Sadarghat', x: 150, z: 1350 },
  { name: 'Motijheel', x: 1000, z: 700 }, { name: 'Mirpur', x: 1050, z: -900 },
  { name: 'Airport Road', x: 1500, z: -100 }, { name: 'Dhanmondi', x: -1150, z: 450 },
  { name: 'Uttara', x: 1450, z: -1250 }, { name: 'Mohakhali', x: -120, z: -780 }, { name: 'Jatrabari', x: 1250, z: 1250 }
];
const LANDMARKS = [
  { name: 'Lalbagh Fort', x: -880, z: 1030, color: 0xb96d45, type: 'fort' },
  { name: 'Ahsan Manzil', x: 180, z: 1300, color: 0xe9b7a0, type: 'palace' },
  { name: 'Sadarghat Terminal', x: 400, z: 1450, color: 0x4a9ca6, type: 'terminal' },
  { name: 'National Parliament', x: -350, z: -100, color: 0xaaa99e, type: 'parliament' },
  { name: 'Gulshan Circle 2', x: -520, z: -520, color: 0x79a9b6, type: 'tower' },
  { name: 'Shaheed Minar', x: 550, z: 320, color: 0xf0eee3, type: 'monument' },
  { name: 'Mirpur Stadium', x: 1200, z: -930, color: 0x638f72, type: 'stadium' },
  { name: 'TSC / Dhaka University', x: 120, z: 180, color: 0xc9ad78, type: 'tower' },
  { name: 'Buriganga Riverfront', x: 530, z: 1510, color: 0x397e9c, type: 'terminal' }
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeVehicle(THREE, color, type = 'car', player = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202833, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8cb7c8, metalness: 0.2, roughness: 0.18 });
  const bodyLength = ['bus','schoolBus','coach'].includes(type) ? 7.5 : ['minibus','microbus'].includes(type) ? 5.8 : ['truck','firetruck'].includes(type) ? 7.2 : type === 'pickup' ? 5.4 : ['van','deliveryVan','ambulance'].includes(type) ? 5.1 : type === 'suv' ? 4.9 : ['boat','riverLaunch'].includes(type) ? 7.5 : ['rickshaw','batteryRickshaw','handcart'].includes(type) ? 2.5 : type === 'cng' ? 2.8 : ['motorcycle','scooter'].includes(type) ? 2.1 : type === 'bicycle' ? 1.8 : 4.4;
  const bodyWidth = ['bus','schoolBus','coach','minibus','microbus'].includes(type) ? 2.3 : ['truck','firetruck','pickup'].includes(type) ? 2.35 : ['van','deliveryVan','ambulance','suv','police','luxury'].includes(type) ? 2.05 : ['boat','riverLaunch'].includes(type) ? 2.6 : ['rickshaw','batteryRickshaw','handcart'].includes(type) ? 1.65 : type === 'cng' ? 1.55 : ['motorcycle','scooter'].includes(type) ? 0.85 : type === 'bicycle' ? 0.65 : 1.9;
  const bodyHeight = ['bus','schoolBus','coach'].includes(type) ? 2.7 : ['minibus','microbus'].includes(type) ? 2.25 : ['truck','firetruck','pickup'].includes(type) ? 2.25 : ['van','deliveryVan','ambulance'].includes(type) ? 2.1 : type === 'suv' ? 1.6 : ['boat','riverLaunch'].includes(type) ? 1.15 : ['rickshaw','batteryRickshaw','handcart'].includes(type) ? 1.5 : type === 'cng' ? 1.6 : ['motorcycle','scooter'].includes(type) ? 0.9 : type === 'bicycle' ? 0.8 : 1.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
  body.position.y = type === 'rickshaw' ? 0.85 : type === 'bus' ? 1.75 : 0.9;
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  if (['bus','minibus','microbus','schoolBus','coach'].includes(type)) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.88, 1.05, bodyLength * 0.88), glass);
    cabin.position.set(0, 2.55, -0.15); cabin.castShadow = true; group.add(cabin);
    for (let z = -2.6; z <= 2.7; z += 1.05) for (const x of [-1.17, 1.17]) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.72), glass); win.position.set(x, 2.05, z); group.add(win); }
  } else if (['truck','pickup','firetruck'].includes(type)) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.65, 2.1), bodyMat); cab.position.set(0, 1.8, -2.0); group.add(cab);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.06), glass); windshield.position.set(0, 2.05, -3.07); group.add(windshield);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.75, 4.0), new THREE.MeshStandardMaterial({color:pick([0x9eaaad,0xb7a17b,0x3d7e74,0x9d493b]),roughness:.8})); cargo.position.set(0, 2.0, 1.15); group.add(cargo);
  } else if (type === 'boat' || type === 'riverLaunch') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth*0.92,0.12,bodyLength*0.82),new THREE.MeshStandardMaterial({color:0x9a7c52,roughness:.85}));deck.position.set(0,bodyHeight*0.55,0.1);group.add(deck);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth*0.58,1.35,bodyLength*0.35),new THREE.MeshStandardMaterial({color:type==='riverLaunch'?0xe8d9b8:0xeee8d9,roughness:.8}));cabin.position.set(0,bodyHeight+0.7,0.35);group.add(cabin);
    const windowMat = new THREE.MeshStandardMaterial({color:0x6fa6bb,roughness:.2,metalness:.15});for(const x of [-bodyWidth*.3,bodyWidth*.3]){const win=new THREE.Mesh(new THREE.BoxGeometry(.06,.55,1.2),windowMat);win.position.set(x,bodyHeight+.75,.35);group.add(win);}
  } else if (type === 'cng') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 1.8), new THREE.MeshStandardMaterial({color:0x18834c,roughness:.65})); roof.position.set(0, 1.8, 0.05); group.add(roof);
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.06), glass); frontGlass.position.set(0, 1.35, -1.25); group.add(frontGlass);
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.9), glass); for(const x of [-0.79,0.79]){const win=sideGlass.clone();win.position.set(x,1.35,0.05);group.add(win);}
  } else if (type === 'boat' || type === 'riverLaunch') {
    // Watercraft use a low hull and cabin; no road wheels are attached.
  } else if (type === 'motorcycle' || type === 'scooter' || type === 'bicycle') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.85), dark); seat.position.set(0, 1.0, 0.12); group.add(seat);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bodyMat); tank.scale.set(0.8,0.7,1.15); tank.position.set(0, 1.0, -0.25); group.add(tank);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), dark); handle.position.set(0, 1.2, -0.7); group.add(handle);
    const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.42,3,6), new THREE.MeshStandardMaterial({color:0x34465d})); rider.position.set(0,1.35,0.18); rider.rotation.x=-0.2; group.add(rider);
  } else if (type === 'rickshaw') {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.13, 1.65), new THREE.MeshStandardMaterial({ color: 0xe4bd44, roughness: 0.8 }));
    canopy.position.set(0, 1.72, -0.15); group.add(canopy);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 0.75), dark); seat.position.set(0, 1.0, 0.25); group.add(seat);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), bodyMat); front.position.set(0, 0.8, -0.85); group.add(front);
  }
  if (['police','ambulance','firetruck'].includes(type)) {
    const redMat=new THREE.MeshStandardMaterial({color:0xff2525,emissive:0x8b0000});
    const blueMat=new THREE.MeshStandardMaterial({color:0x258bff,emissive:0x003b99});
    const bar=new THREE.Mesh(new THREE.BoxGeometry(bodyWidth*.58,.12,.42),dark);bar.position.set(0,bodyHeight+1.02,-.1);group.add(bar);
    for(const [x,mat] of [[-.38,redMat],[.38,blueMat]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.34,.2,.3),mat);lamp.position.set(x,bodyHeight+1.2,-.1);group.add(lamp);}
  }
  const wheelRadius = type === 'motorcycle' || type === 'scooter' || type === 'bicycle' ? 0.38 : type === 'rickshaw' || type === 'batteryRickshaw' || type === 'handcart' ? 0.28 : type === 'cng' ? 0.31 : 0.38;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.22, 12);
  if (type === 'motorcycle') {
    for (const z of [-0.72, 0.72]) { const wheel = new THREE.Mesh(wheelGeo, dark); wheel.rotation.z = Math.PI/2; wheel.position.set(0, 0.4, z); group.add(wheel); }
  } else {
    const axles = type === 'rickshaw' ? [-bodyLength * 0.25, bodyLength * 0.28] : [-bodyLength * 0.31, bodyLength * 0.31];
    for (const x of [-bodyWidth / 2 - 0.04, bodyWidth / 2 + 0.04]) for (const z of axles) {
      if (type === 'rickshaw' && x > 0) continue;
      const wheel = new THREE.Mesh(wheelGeo, dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, type === 'rickshaw' ? 0.32 : type === 'cng' ? 0.34 : 0.42, z); wheel.castShadow = true; group.add(wheel);
    }
  }
  if (player) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.9, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0xe7e9e8, metalness: 0.55 }));
    bumper.position.set(0, 0.52, -bodyLength / 2 - 0.05); group.add(bumper);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0x66551e });
    for (const x of [-0.62, 0.62]) { const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), lightMat); light.position.set(x, 0.9, -bodyLength / 2 - 0.04); group.add(light); }
  }
  group.userData.length = bodyLength;
  return group;
}

function makePedestrian(THREE) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pick([0x9c6347, 0xb77c59, 0xd29a73, 0x80523e]) });
  const shirt = new THREE.MeshStandardMaterial({ color: pick([0x2c6e91, 0xb94e40, 0x3f7b58, 0xd2a943, 0xe5e0d3, 0x4c526b]) });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 3, 7), shirt); torso.position.y = 1.05; torso.castShadow = true; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin); head.position.y = 1.52; head.castShadow = true; group.add(head);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x333b48 });
  const legs=[];
  for (const x of [-0.11, 0.11]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.15), legsMat); leg.position.set(x, 0.45, 0); group.add(leg); legs.push(leg); }
  const arms=[];
  for (const side of [-1,1]) { const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.32,3,6),shirt);arm.position.set(side*.29,1.12,0);arm.rotation.z=side*.16;group.add(arm);arms.push(arm); }
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),new THREE.MeshStandardMaterial({color:pick([0x191817,0x29211c,0x3a3027])}));hair.scale.set(1,.5,1);hair.position.set(0,1.64,0);group.add(hair);
  group.userData.legs=legs;group.userData.arms=arms;group.userData.walkPhase=Math.random()*Math.PI*2;
  return group;
}

export default function DhakaDrive() {
  const mountRef = useRef(null);
  const engine = useRef(null);
  const mapCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const serverSessionRef = useRef(null);
  const serverSyncIntervalRef = useRef(null);
  const [onlineProfile, setOnlineProfile] = useState(null);
  const [onlineLeaderboard, setOnlineLeaderboard] = useState([]);
  const [running, setRunning] = useState(true);
  const [weather, setWeather] = useState(() => { try { return JSON.parse(localStorage.getItem('vibepulse-dhaka-save') || '{}').weather || 'clear'; } catch { return 'clear'; } });
  const [vehicleType, setVehicleType] = useState(() => { try { return JSON.parse(localStorage.getItem('vibepulse-dhaka-save') || '{}').vehicleType || 'car'; } catch { return 'car'; } });
  const carColorRef = useRef(carColor);
  useEffect(() => { carColorRef.current = carColor; }, [carColor]);
  const [walkMode, setWalkMode] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hud, setHud] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('vibepulse-dhaka-save') || '{}'); return { speed: 0, area: 'Gulshan', money: Number.isFinite(saved.money) ? saved.money : 12500, mission: 'Explore Dhaka', distance: Number.isFinite(saved.distance) ? saved.distance : 0 }; }
    catch { return { speed: 0, area: 'Gulshan', money: 12500, mission: 'Explore Dhaka', distance: 0 }; }
  });
  const [notice, setNotice] = useState('Welcome to Dhaka. Drive safely and explore the city.');
  const [quality, setQuality] = useState('High');
  const [nightMode, setNightMode] = useState(false);
  const [autoDayCycle, setAutoDayCycle] = useState(false);
  const [cameraMode, setCameraMode] = useState('Chase');
  const [carColor, setCarColor] = useState('#c72f2f');

  useEffect(() => {
    audioRef.current = new AudioManager();
    return () => audioRef.current?.dispose();
  }, []);
  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;
    let cancelled = false;
    api.get('/dhaka-game/profile').then(({data}) => { if(!cancelled) setOnlineProfile(data.profile || null); }).catch(() => {});
    api.get('/dhaka-game/leaderboard').then(({data}) => { if(!cancelled) setOnlineLeaderboard(Array.isArray(data) ? data : []); }).catch(() => {});
    api.post('/dhaka-game/sessions').then(({data}) => { if(cancelled) return; serverSessionRef.current = data?.session?.id || null; const sync = async () => { const game=engine.current, id=serverSessionRef.current; if(!game||!id)return; const p=game.world.player; try { await api.post('/dhaka-game/sessions/'+id+'/heartbeat',{x:p.x,z:p.z,heading:p.heading,vehicleType:game.world.playerCarType||'car'}); const nearby=await api.get('/dhaka-game/sessions/nearby',{params:{x:p.x,z:p.z}}); game.syncRemotePlayers(nearby.data); } catch {} }; sync(); serverSyncIntervalRef.current=window.setInterval(sync,3000); }).catch(() => {});
    return () => { cancelled = true; if(serverSyncIntervalRef.current)window.clearInterval(serverSyncIntervalRef.current); const id = serverSessionRef.current; if(id) api.post('/dhaka-game/sessions/' + id + '/finish').catch(() => {}); };
  }, []);
  useEffect(() => { audioRef.current?.setMuted(muted); }, [muted]);
  useEffect(() => { engine.current?.world.weather?.set(weather, engine.current.scene); audioRef.current?.setWeather(weather); }, [weather]);
  useEffect(() => { if(engine.current) engine.current.world.autoDayCycle = autoDayCycle; }, [autoDayCycle, quality]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer, scene, camera, animationId, resizeObserver;
    let disposed = false;
    const keys = {};
    const saveManager = new SaveManager();
    const savedGame = saveManager.load();
    const savedTargetIndex = Number.isInteger(savedGame.targetIndex) ? clamp(savedGame.targetIndex, 0, LANDMARKS.length - 1) : 0;
    const world = {
      player: { x: Number.isFinite(savedGame.x) ? clamp(savedGame.x, -1650, 1650) : -520, z: Number.isFinite(savedGame.z) ? clamp(savedGame.z, -1650, 1650) : -520, heading: Number.isFinite(savedGame.heading) ? savedGame.heading : 0, speed: 0, walking: false, jumpY: 0, jumpVelocity: 0, distance: Number.isFinite(savedGame.distance) ? savedGame.distance : 0 },
      autoDayCycle, timeOfDay: 14,
      cars: [], police: [], wantedLevel: 0, lastCrimeFrame: -9999, peds: [], trees: [], colliders: [], labels: [], lastHud: 0, frame: 0,
      missionTarget: LANDMARKS[savedTargetIndex], targetIndex: savedTargetIndex, money: Number.isFinite(savedGame.money) ? savedGame.money : 12500, running: true, keys, cameraMode: 'Chase', saveManager,
      missions: new MissionSystem({ landmarks: LANDMARKS, saved: { ...(savedGame.mission || {}), startTargetIndex: savedTargetIndex } }), weather: null, audio: audioRef.current, remotePlayers: new Map()
    };
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x9ab9ca);
      scene.fog = new THREE.Fog(0x9ab9ca, 160, 1050);
      camera = new THREE.PerspectiveCamera(62, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 2200);
      renderer = new THREE.WebGLRenderer({ antialias: quality !== 'Low', powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'Low' ? 1 : 1.6));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = quality !== 'Low';
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      mount.appendChild(renderer.domElement);
      const hemi = new THREE.HemisphereLight(0xddeeff, 0x697353, 2.0); scene.add(hemi);
      const weatherSystem = new WeatherSystem(THREE); weatherSystem.attach(scene, camera); weatherSystem.set(weather, scene); world.weather = weatherSystem;
      const sun = new THREE.DirectionalLight(0xffe0b1, 3.1); sun.position.set(-180, 260, -80); sun.castShadow = quality !== 'Low'; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -180; sun.shadow.camera.right = 180; sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180; scene.add(sun);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x738b6c, roughness: 1 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.receiveShadow = true; scene.add(ground);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x353b42, roughness: 0.96 }); weatherSystem.registerMaterial(roadMat); weatherSystem.set(weather, scene);
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xbab5a5, roughness: 1 });
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xe6d7a4, roughness: 1 });
      const block = 110, roadWidth = 18, half = 1700;
      // Wide urban road grid with sidewalks and lane markings.
      for (let p = -half; p <= half; p += block) {
        const roadH = new THREE.Mesh(new THREE.BoxGeometry(3600, 0.12, roadWidth), roadMat); roadH.position.set(0, 0.01, p); roadH.receiveShadow = true; scene.add(roadH);
        const roadV = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.12, 3600), roadMat); roadV.position.set(p, 0.012, 0); roadV.receiveShadow = true; scene.add(roadV);
        for (const side of [-1, 1]) {
          const curbH = new THREE.Mesh(new THREE.BoxGeometry(3600, 0.2, 1.1), sidewalkMat); curbH.position.set(0, 0.12, p + side * (roadWidth / 2 + 0.8)); scene.add(curbH);
          const curbV = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 3600), sidewalkMat); curbV.position.set(p + side * (roadWidth / 2 + 0.8), 0.12, 0); scene.add(curbV);
        }
        for (let q = -half + 12; q < half; q += 28) {
          const dashH = new THREE.Mesh(new THREE.BoxGeometry(10, 0.025, 0.22), lineMat); dashH.position.set(q, 0.085, p); scene.add(dashH);
          const dashV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 10), lineMat); dashV.position.set(p, 0.086, q); scene.add(dashV);
        }
      }
      const buildingMats = [0xbab3a3, 0x8da1aa, 0xd1c4af, 0x9aa99a, 0x7c8d9c, 0xd5d0c5, 0xc19c7b, 0x9b8e82].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x7397a5, roughness: 0.26, metalness: 0.15 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c6669, roughness: 0.9 });
      // Procedural blocks, buildings, roof tanks, windows, shops and street trees.
      for (let x = -half + 38; x <= half - 38; x += block) {
        for (let z = -half + 38; z <= half - 38; z += block) {
          if (Math.random() < 0.14) {
            const park = new THREE.Mesh(new THREE.BoxGeometry(58, 0.25, 58), new THREE.MeshStandardMaterial({ color: 0x4f8050, roughness: 1 }));
            park.position.set(x + 15, 0.02, z + 15); park.receiveShadow = true; scene.add(park);
            for (let t = 0; t < 4; t++) {
              const tree = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 6), new THREE.MeshStandardMaterial({ color: 0x6c4b31 }));
              trunk.position.y = 1.5; tree.add(trunk);
              const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random(), 7, 6), new THREE.MeshStandardMaterial({ color: pick([0x397149, 0x4e8551, 0x5b8a50]), roughness: 1 }));
              crown.position.y = 4; crown.castShadow = true; tree.add(crown); tree.position.set(x + (Math.random() - .5) * 45, 0, z + (Math.random() - .5) * 45); scene.add(tree); world.trees.push(tree);
            }
            continue;
          }
          const w = 22 + Math.random() * 39, d = 22 + Math.random() * 39;
          const floors = 2 + Math.floor(Math.random() * 12);
          const h = floors * (2.4 + Math.random() * 0.45);
          const mat = pick(buildingMats);
          const building = new THREE.Group();
          const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); base.position.y = h / 2 + 0.2; base.castShadow = true; base.receiveShadow = true; building.add(base);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 1.3, d * 0.7), roofMat); roof.position.set(0, h + 0.9, 0); roof.castShadow = true; building.add(roof);
          if (floors > 5) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x667c84, metalness: 0.25 }));
            tank.position.set(w * 0.18, h + 2.5, d * 0.12); building.add(tank);
          }
          // Repeated window bands on all four sides.
          const rows = Math.min(floors, 4), cols = Math.min(4, Math.max(2, Math.floor(w / 7)));
          for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.0, 0.08), glassMat);
            win.position.set(-w / 2 + (col + 0.7) * w / (cols + 0.5), 1.7 + row * 2.45, d / 2 + 0.045); building.add(win);
            
          }
          building.position.set(x + (Math.random() - .5) * 16, 0, z + (Math.random() - .5) * 16);
          scene.add(building);
          world.colliders.push({ x: building.position.x, z: building.position.z, w: w + 3, d: d + 3 });
          // Ground-floor shops / awnings.
          if (Math.random() < 0.45) {
            const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.45, 2.2), new THREE.MeshStandardMaterial({ color: pick([0xb44738, 0xd5a63d, 0x2d7181, 0x3b7c4e]) }));
            awning.position.set(building.position.x, 2.3, building.position.z + d / 2 + 1.4); scene.add(awning);
          }
        }
      }
      // River edge and water with ghats on the south-east side.
      const river = new THREE.Mesh(new THREE.PlaneGeometry(850, 3600), new THREE.MeshStandardMaterial({ color: 0x397e9c, roughness: 0.28, metalness: 0.08 }));
      river.rotation.x = -Math.PI / 2; river.position.set(1500, -0.03, 0); scene.add(river);
      for (let i = 0; i < 8; i++) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 35), new THREE.MeshStandardMaterial({ color: 0x8c877b }));
        pier.position.set(1330 + i * 45, 0.3, 800 + (i % 3) * 55); scene.add(pier);
        const boat = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 18), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x8c4934 : 0xddd2b0 }));
        hull.position.y = 0.6; boat.add(hull);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 5), new THREE.MeshStandardMaterial({ color: 0xeee0bd })); cabin.position.y = 2; boat.add(cabin);
        boat.position.set(1360 + i * 44, 0, 930 + (i % 3) * 75); scene.add(boat);
      }
      // Landmark set pieces with custom silhouettes.
      for (const lm of LANDMARKS) {
        const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: lm.color, roughness: 0.7 });
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(42, 1.4, 38), new THREE.MeshStandardMaterial({ color: 0x918b7c })); plinth.position.y = 0.7; g.add(plinth);
        if (lm.type === 'fort') {
          for (const [dx, dz] of [[-12,-9],[12,-9],[-12,9],[12,9]]) { const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.7,13,8),m); tower.position.set(dx,7,dz); tower.castShadow=true;g.add(tower); }
          const wall = new THREE.Mesh(new THREE.BoxGeometry(31,8,3),m); wall.position.y=4;g.add(wall);
        } else if (lm.type === 'palace') {
          const main = new THREE.Mesh(new THREE.BoxGeometry(28,15,17),m); main.position.y=8; main.castShadow=true;g.add(main);
          for(let i=0;i<7;i++){const col=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,8,8),new THREE.MeshStandardMaterial({color:0xf3dfce}));col.position.set(-12+i*4,4,9);g.add(col);}
          const dome = new THREE.Mesh(new THREE.SphereGeometry(5,12,8,0,Math.PI*2,0,Math.PI/2),m);dome.position.set(0,15,0);g.add(dome);
        } else if (lm.type === 'stadium') {
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(21,24,8,24,1,true),m);bowl.position.y=4;g.add(bowl);
          const field = new THREE.Mesh(new THREE.CircleGeometry(15,24),new THREE.MeshStandardMaterial({color:0x3d8c52}));field.rotation.x=-Math.PI/2;field.position.y=1;g.add(field);
        } else if (lm.type === 'monument') {
          for(let i=0;i<5;i++){const pillar=new THREE.Mesh(new THREE.BoxGeometry(1.6,10-i*.7,1.5),m);pillar.position.set((i-2)*3,5-i*.35,0);g.add(pillar);}
          const arch=new THREE.Mesh(new THREE.TorusGeometry(5,0.65,6,24,Math.PI),m);arch.position.y=9;arch.rotation.z=Math.PI;g.add(arch);
        } else if (lm.type === 'terminal') {
          const hall=new THREE.Mesh(new THREE.BoxGeometry(30,10,15),m);hall.position.y=5;g.add(hall);
          for(let i=0;i<6;i++){const column=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,8,7),new THREE.MeshStandardMaterial({color:0xd9d4c5}));column.position.set(-13+i*5,4,8);g.add(column);}
        } else {
          const tower=new THREE.Mesh(new THREE.BoxGeometry(lm.type==='parliament'?34:19,lm.type==='parliament'?16:34,lm.type==='parliament'?30:19),m);tower.position.y=lm.type==='parliament'?8:17;g.add(tower);
          if(lm.type==='tower'){const top=new THREE.Mesh(new THREE.BoxGeometry(11,12,11),glassMat);top.position.y=40;g.add(top);}
        }
        g.position.set(lm.x,0,lm.z);scene.add(g);
        world.labels.push({ name: lm.name, position: new THREE.Vector3(lm.x, 32, lm.z) });
      }
      // Street light poles, signal heads and local traffic.
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x505b60, metalness: 0.55 });
      for(let x=-half+110;x<=half-100;x+=220)for(let z=-half+110;z<=half-100;z+=220){
        if(Math.random()<.55)continue;
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,7,6),poleMat);pole.position.set(x+14,3.5,z+14);scene.add(pole);
        const head=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,.9),new THREE.MeshStandardMaterial({color:pick([0x247b49,0xc39a29,0xa43e34]),emissive:0x100e08}));head.position.set(x+14,6.6,z+14);scene.add(head);
      }
      // Dense Dhaka-style informal commerce: tea, fuchka, fruit and jhalmuri carts with Bengali signboards.
      const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;
      const signCtx=signCanvas.getContext('2d');
      signCtx.fillStyle='#123c2c';signCtx.fillRect(0,0,512,128);signCtx.strokeStyle='#e8c65a';signCtx.lineWidth=7;signCtx.strokeRect(5,5,502,118);
      signCtx.fillStyle='#fff3c4';signCtx.font='bold 46px sans-serif';signCtx.textAlign='center';signCtx.textBaseline='middle';signCtx.fillText('চা • ফুচকা • ঝালমুড়ি',256,64);
      const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
      const signMaterial=new THREE.SpriteMaterial({map:signTexture,transparent:true,depthWrite:false});
      for(let i=0;i<48;i++){
        const x=(Math.random()-.5)*half*1.8,z=(Math.random()-.5)*half*1.8;
        const stall=new THREE.Group();
        const cart=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.15,1.8),new THREE.MeshStandardMaterial({color:pick([0x9c6b3e,0x3c6b56,0x8b4a35,0x6a647b]),roughness:.85}));cart.position.y=.65;stall.add(cart);
        const counter=new THREE.Mesh(new THREE.BoxGeometry(3.65,.14,1.95),new THREE.MeshStandardMaterial({color:0x9b8c72,roughness:.9}));counter.position.y=1.28;stall.add(counter);
        const canopy=new THREE.Mesh(new THREE.BoxGeometry(4.2,.16,2.6),new THREE.MeshStandardMaterial({color:pick([0xc84d3b,0x2e7b53,0xd6b744,0x2d6c91]),roughness:.8}));canopy.position.y=2.55;stall.add(canopy);
        for(const wx of [-1.25,1.25]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.16,10),new THREE.MeshStandardMaterial({color:0x20252a}));wheel.rotation.z=Math.PI/2;wheel.position.set(wx,.32,.72);stall.add(wheel);}
        const sign=new THREE.Sprite(signMaterial);sign.scale.set(4.2,1.05,1);sign.position.set(0,3.45,-1.22);stall.add(sign);
        stall.position.set(x,0,z);stall.rotation.y=Math.random()*Math.PI*2;scene.add(stall);
      }
      // Sagging overhead electrical wires and concrete utility poles, a recognizable dense-street silhouette.
      const wireMaterial=new THREE.LineBasicMaterial({color:0x252d31,transparent:true,opacity:.82});
      for(let x=-half+block;x<half-block;x+=block*1.65){
        for(let z=-half+block;z<half-block;z+=block*1.65){
          const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,7.5,6),new THREE.MeshStandardMaterial({color:0x62696a,roughness:.95}));
          pole.position.set(x,3.75,z);scene.add(pole);
          const pts=[new THREE.Vector3(x,7.1,z),new THREE.Vector3(x+block*.45,6.0,z+block*.25),new THREE.Vector3(x+block*.9,6.25,z+block*.7),new THREE.Vector3(x+block*1.25,7.1,z+block)];
          const wireGeo=new THREE.BufferGeometry().setFromPoints(pts);scene.add(new THREE.Line(wireGeo,wireMaterial));
        }
      }
      // Broken asphalt patches and potholes placed on the procedural street grid.
      for(let i=0;i<46;i++){
        const pothole=new THREE.Mesh(new THREE.CircleGeometry(.45+Math.random()*.8,9),new THREE.MeshStandardMaterial({color:0x25292b,roughness:1}));
        pothole.rotation.x=-Math.PI/2;pothole.scale.set(1.3,.72,1);pothole.position.set((Math.floor(Math.random()*25)-12)*block+.3,.035,(Math.floor(Math.random()*25)-12)*block+.6);scene.add(pothole);
      }
      const trafficColors=[0xf0c53e,0xe9e6df,0xc84a3b,0x286e9d,0x242b33,0x23825b,0xc4c9c9];
      for(let i=0;i<140;i++){
        const horizontal=Math.random()<.5, lane=(Math.random()<.5?-1:1)*4.7, road= Math.round((Math.random()*28-14))*block;
        const typeRoll=Math.random();
        const type=typeRoll<0.08?'bus':typeRoll<0.15?'truck':typeRoll<0.30?'cng':typeRoll<0.47?'rickshaw':typeRoll<0.62?'motorcycle':'car';
        const v=makeVehicle(THREE,pick(trafficColors),type);
        v.position.set(horizontal?(Math.random()*3000-1500):road,0,horizontal?road:(Math.random()*3000-1500));
        v.rotation.y=horizontal?(Math.random()<.5?0:Math.PI):(Math.random()<.5?Math.PI/2:-Math.PI/2);
        scene.add(v);const dir=Math.random()<.5?-1:1;world.cars.push({mesh:v,horizontal,axis:horizontal?'x':'z',road,lane:road,speed:3+Math.random()*9,desiredSpeed:3+Math.random()*9,dir});
      }
      for(let i=0;i<90;i++){
        const p=makePedestrian(THREE);p.position.set((Math.random()*3000-1500),0,(Math.random()*3000-1500));scene.add(p);
        const px=p.position.x,pz=p.position.z;world.peds.push({mesh:p,phase:Math.random()*6.28,originX:px,originZ:pz,angle:Math.random()*6.28,speed:.7+Math.random()*.6,x:px,z:pz,targetX:px+(Math.random()-.5)*18,targetZ:pz+(Math.random()-.5)*18,state:'walk',waitUntil:0});
      }
      const playerCar=makeVehicle(THREE,new THREE.Color(carColor).getHex(),vehicleType,true);playerCar.position.set(world.player.x,0,world.player.z);scene.add(playerCar);world.playerCarType=vehicleType;
      const playerPed=makePedestrian(THREE);playerPed.position.set(world.player.x,0,world.player.z);playerPed.visible=false;scene.add(playerPed);
      world.playerCar=playerCar;world.playerPed=playerPed;world.sun=sun;world.hemi=hemi;world.scene=scene;
      const destinationMarker=new THREE.Group();
      const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.4,8,32),new THREE.MeshStandardMaterial({color:0x55f3b2,emissive:0x0d5a3b}));ring.rotation.x=Math.PI/2;ring.position.y=.3;destinationMarker.add(ring);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.2,.7,20,10,1,true),new THREE.MeshBasicMaterial({color:0x55f3b2,transparent:true,opacity:.35,side:THREE.DoubleSide}));beam.position.y=10;destinationMarker.add(beam);scene.add(destinationMarker);world.destinationMarker=destinationMarker;
      const changeVehicleType = (type) => { const allowed=['car','hatchback','suv','luxury','van','microbus','deliveryVan','pickup','bus','minibus','schoolBus','coach','truck','firetruck','ambulance','police','cng','rickshaw','batteryRickshaw','handcart','motorcycle','scooter','bicycle','boat','riverLaunch']; if(!allowed.includes(type))return; const old=world.playerCar; if(old){scene.remove(old);old.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});} const car=makeVehicle(THREE,new THREE.Color(carColorRef.current).getHex(),type,true);car.position.set(world.player.x,0,world.player.z);car.rotation.y=world.player.heading;scene.add(car);world.playerCar=car;world.playerCarType=type;world.player.speed=0;vehicleController.setVehicleType(type);setVehicleType(type);setNotice('Vehicle changed to '+type.toUpperCase()+'.'); };
      const syncRemotePlayers = (players = []) => { if(!Array.isArray(players))return; const seen=new Set(); for(const remote of players){if(!remote?.user_id||!Number.isFinite(Number(remote.player_x))||!Number.isFinite(Number(remote.player_z)))continue;const id=remote.user_id;seen.add(id);let mesh=world.remotePlayers.get(id);if(!mesh){const type=['car','hatchback','suv','luxury','van','microbus','deliveryVan','pickup','bus','minibus','schoolBus','coach','truck','firetruck','ambulance','police','cng','rickshaw','batteryRickshaw','handcart','motorcycle','scooter','bicycle','boat','riverLaunch'].includes(remote.vehicle_type)?remote.vehicle_type:'car';mesh=makeVehicle(THREE,0x35d399,type,false);mesh.traverse(o=>{if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.transparent=true;m.opacity=.68;});}o.castShadow=false;});const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=96;const labelCtx=labelCanvas.getContext('2d');labelCtx.fillStyle='rgba(3,10,18,.82)';labelCtx.fillRect(0,0,512,96);labelCtx.strokeStyle='#34d399';labelCtx.lineWidth=5;labelCtx.strokeRect(3,3,506,90);labelCtx.fillStyle='#f8fafc';labelCtx.font='bold 38px sans-serif';labelCtx.textAlign='center';labelCtx.textBaseline='middle';labelCtx.fillText(String(remote.username||'VibePulse Player').slice(0,24),256,48);const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,transparent:true,depthTest:false}));label.scale.set(5.4,1.05,1);label.position.set(0,4.8,0);mesh.add(label);mesh.userData.labelTexture=labelTexture;scene.add(mesh);world.remotePlayers.set(id,mesh);}mesh.position.set(Number(remote.player_x),0,Number(remote.player_z));mesh.rotation.y=Number(remote.player_heading)||0;}for(const [id,mesh] of world.remotePlayers){if(!seen.has(id)){scene.remove(mesh);mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});if(mesh.userData.labelTexture)mesh.userData.labelTexture.dispose();world.remotePlayers.delete(id);}}};
      const setTarget = (lm) => { world.missionTarget=lm;world.targetIndex=Math.max(0,LANDMARKS.findIndex(item=>item.name===lm.name));destinationMarker.position.set(lm.x,0,lm.z);setHud(old=>({...old,mission:'Reach '+lm.name}));setNotice('New objective: reach '+lm.name+'.'); };
      setTarget(LANDMARKS[savedTargetIndex]);
      const startMission = (id, targetIndex = (world.targetIndex + 1) % LANDMARKS.length) => { const result = world.missions.start(id, clock.elapsedTime, targetIndex); if (!result.ok) { setNotice(result.reason); return; } const sessionId = serverSessionRef.current; if(sessionId) api.post('/dhaka-game/sessions/' + sessionId + '/missions/' + id + '/start').catch(() => {}); const next = result.target || LANDMARKS[targetIndex]; setTarget(next); setHud(old => ({ ...old, mission: result.mission.title + ': ' + next.name })); setNotice(result.mission.title + ' started — ' + result.mission.description + (result.waypointCount>1?' · '+result.waypointCount+' checkpoints':'')); };
      const onKeyDown=(e)=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;if(k==='h'){world.audio?.horn();setNotice('Horn sounded.');}if(k==='b'){world.audio?.rickshawBell();}if(k===' '&&world.player.walking&&world.player.jumpY<=0){world.player.jumpVelocity=7.5;}if(k==='c'){ world.player.walking=!world.player.walking;setWalkMode(world.player.walking);world.player.speed=0;setNotice(world.player.walking?'On foot — explore the streets.':'You are back in the car.');}if(k==='v'){world.cameraMode=world.cameraMode==='Chase'?'Close':world.cameraMode==='Close'?'Cinematic':'Chase';setCameraMode(world.cameraMode);}if(k==='escape')setRunning(v=>!v);if(k==='r'){world.player.x=-520;world.player.z=-520;world.player.heading=0;world.player.speed=0;}};
      const onKeyUp=(e)=>{keys[e.key.toLowerCase()]=false;};
      window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
      const onResize=()=>{if(!mount||disposed)return;camera.aspect=mount.clientWidth/Math.max(1,mount.clientHeight);camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);};
      resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(mount);
      const clock=new THREE.Clock();
      const tempTarget=new THREE.Vector3();
      const vehicleController=new VehicleController();vehicleController.setVehicleType(vehicleType);
      const trafficAI=new TrafficAI({minSpeed:2.5,maxSpeed:15,followingDistance:10,yieldDistance:8});
      const pedestrianAI=new PedestrianAI({walkSpeed:1.1,arrivalRadius:1.2,crossingWait:1.5});
      const animate=()=>{
        if(disposed)return;animationId=requestAnimationFrame(animate);
        const dt=Math.min(clock.getDelta(),.04);world.frame++;
        const p=world.player;
        if(world.running){
          vehicleController.gripMultiplier=world.weather?.type==='monsoon'?0.58:world.weather?.type==='rain'?0.78:world.weather?.type==='fog'?0.9:1;
          world.weather?.update(dt, p);
          world.audio?.updateEngine(p.speed, p.walking);
          if (world.missions.definition.duration > 0 && world.missions.startedAt > 0 && world.missions.remaining(clock.elapsedTime) <= 0) { setNotice(world.missions.definition.title + ' expired. Start the mission again to retry.'); const nextIndex=(world.targetIndex+1)%LANDMARKS.length; world.missions.start('explore',clock.elapsedTime,nextIndex); setTarget(world.missions.target||LANDMARKS[nextIndex]); }
          let vehicleStep=null;
          if(!p.walking){
            const throttle=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);
            const steer=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0);
            vehicleStep=vehicleController.update(p,{throttle,steer,brake:keys[' ']?1:0},dt);
          }else{
            p.speed=0;const move=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),turn=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0);const walkSpeed=keys.shift?16:9;
            p.heading-=turn*dt*2.2;p.x-=Math.sin(p.heading)*move*walkSpeed*dt;p.z-=Math.cos(p.heading)*move*walkSpeed*dt;
            p.jumpVelocity=(p.jumpVelocity||0)-18*dt;p.jumpY=Math.max(0,(p.jumpY||0)+p.jumpVelocity*dt);if(p.jumpY===0)p.jumpVelocity=0;
          }
          if(!p.walking){const nx=vehicleStep?.nextX??p.x,nz=vehicleStep?.nextZ??p.z;
            const buildingHit=world.colliders.some(b=>Math.abs(nx-b.x)<b.w/2+1.5&&Math.abs(nz-b.z)<b.d/2+2.4);
            const trafficHit=world.cars.some(v=>Math.abs(nx-v.mesh.position.x)<(v.mesh.userData.length||4.4)*0.48+1.8&&Math.abs(nz-v.mesh.position.z)<(v.mesh.userData.length||4.4)*0.35+1.0);
            const hit=buildingHit||trafficHit;
            if(hit){p.speed*=-.18;if(trafficHit&&world.frame-world.lastCrimeFrame>90){world.lastCrimeFrame=world.frame;world.wantedLevel=Math.min(5,world.wantedLevel+1);setNotice('Traffic incident reported! Police wanted level: '+world.wantedLevel+'/5.');}else if(world.frame%30===0)setNotice(buildingHit?'Building collision! Steer back onto the road.':'Traffic collision! Slow down and steer carefully.');}else{p.x=nx;p.z=nz;p.distance+=Math.abs(p.speed*dt)/1000;}
          }
          p.x=clamp(p.x,-1650,1650);p.z=clamp(p.z,-1650,1650);
          trafficAI.speedMultiplier=world.weather?.type==='monsoon'?0.55:world.weather?.type==='rain'?0.72:world.weather?.type==='fog'?0.82:1;pedestrianAI.walkSpeed=world.weather?.type==='monsoon'?0.75:world.weather?.type==='rain'?0.9:1.1;trafficAI.update(world.cars,p,dt,world.peds.map(ped=>ped.mesh.position));for(const v of world.cars){const m=v.mesh;if(v.horizontal){if(m.position.x>1700)m.position.x=-1700;if(m.position.x< -1700)m.position.x=1700;}else{if(m.position.z>1700)m.position.z=-1700;if(m.position.z< -1700)m.position.z=1700;}}
          // Police pursuit: collisions with traffic raise the wanted level; patrol cars actively chase the player.
          const wantedCars=Math.min(world.wantedLevel,3);
          while(world.police.length<wantedCars){const patrol=makeVehicle(THREE,0xf1f5f9,'car');patrol.position.set(p.x+(Math.random()-.5)*90,0,p.z+(Math.random()-.5)*90);patrol.userData.length=4.4;scene.add(patrol);world.police.push({mesh:patrol,speed:0,flash:Math.random()*Math.PI*2});}
          for(let i=0;i<world.police.length;i++){const cop=world.police[i],m=cop.mesh;const dx=p.x-m.position.x,dz=p.z-m.position.z,dist=Math.hypot(dx,dz)||1;cop.speed=Math.min(24,cop.speed+dt*8);const desired=Math.atan2(-dx,-dz);let delta=((desired-m.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;m.rotation.y+=clamp(delta,-dt*1.6,dt*1.6);m.position.x+=(-Math.sin(m.rotation.y))*cop.speed*dt;m.position.z+=(-Math.cos(m.rotation.y))*cop.speed*dt;m.position.y=0;
            if(dist<8&&world.frame%120===0){p.speed*=.55;setNotice('Police pursuit! Lose the patrol by creating distance.');}
            // Alternating emergency lights on the roof.
            if(!cop.lights){const red=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.25),new THREE.MeshStandardMaterial({color:0xff2020,emissive:0x8a0000}));const blue=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.25),new THREE.MeshStandardMaterial({color:0x258bff,emissive:0x002b8a}));red.position.set(-.28,1.55,-.1);blue.position.set(.28,1.55,-.1);m.add(red,blue);cop.lights=[red,blue];}
            cop.flash+=dt*8;cop.lights[0].visible=Math.sin(cop.flash)>0;cop.lights[1].visible=Math.sin(cop.flash)<=0;
          }
          if(world.wantedLevel>0&&world.police.length&&world.police.every(cop=>Math.hypot(cop.mesh.position.x-p.x,cop.mesh.position.z-p.z)>220)){world.wantedLevel=Math.max(0,world.wantedLevel-1);if(world.wantedLevel===0){for(const cop of world.police){scene.remove(cop.mesh);}world.police=[];setNotice('You escaped the police. Wanted level cleared.');}}
          for(const ped of world.peds){if(ped.state==='idle'){ped.targetX=clamp(ped.originX+(Math.random()-.5)*24,-1600,1600);ped.targetZ=clamp(ped.originZ+(Math.random()-.5)*24,-1600,1600);ped.state='walk';} }pedestrianAI.update(world.peds,dt,clock.elapsedTime,agent=>!world.cars.some(v=>Math.hypot(v.mesh.position.x-agent.x,v.mesh.position.z-agent.z)<5));
          for(const ped of world.peds){const mesh=ped.mesh,phase=clock.elapsedTime*6+(ped.phase||0),swing=(ped.state==='walk'||ped.state==='cross')?Math.sin(phase)*.42:0;if(mesh.userData.legs?.length===2){mesh.userData.legs[0].rotation.x=swing;mesh.userData.legs[1].rotation.x=-swing;}if(mesh.userData.arms?.length===2){mesh.userData.arms[0].rotation.x=-swing*.7;mesh.userData.arms[1].rotation.x=swing*.7;}}
          if(p.walking&&world.playerPed.userData.legs?.length===2){const swing=Math.sin(clock.elapsedTime*8)*.5;world.playerPed.userData.legs[0].rotation.x=swing;world.playerPed.userData.legs[1].rotation.x=-swing;}
        }
        const active= p.walking?world.playerPed:world.playerCar;active.visible=true; (p.walking?world.playerCar:world.playerPed).visible=false;
        active.position.set(p.x,p.walking?(p.jumpY||0):0,p.z);active.rotation.y=p.heading;
        if(p.walking){active.position.y+=(p.jumpY>0?0:Math.abs(Math.sin(world.frame*.18))*.05);}
        const firstPerson=world.cameraMode==='First Person';
        const behind=firstPerson?-0.35:world.cameraMode==='Close'?(p.walking?3.4:5.4):world.cameraMode==='Cinematic'?(p.walking?16:25):(p.walking?10:17);
        const height=firstPerson?(p.walking?1.65:1.55):world.cameraMode==='Close'?(p.walking?2.8:3.5):world.cameraMode==='Cinematic'?(p.walking?10:13):(p.walking?6:8);
        const desired=new THREE.Vector3(p.x+Math.sin(p.heading)*behind,height,p.z+Math.cos(p.heading)*behind);
        camera.position.lerp(desired,1-Math.pow(.001,dt));
        if(firstPerson)tempTarget.set(p.x-Math.sin(p.heading)*12,height,p.z-Math.cos(p.heading)*12);else tempTarget.set(p.x,world.cameraMode==='Close'?(p.walking?1.6:1.0):(p.walking?1.25:1.4),p.z);
        camera.lookAt(tempTarget);
        if(world.autoDayCycle){world.timeOfDay=(world.timeOfDay+dt*0.06)%24;const sunPhase=Math.sin(((world.timeOfDay-6)/12)*Math.PI);const daylight=clamp((sunPhase+0.12)/1.12,0.04,1);world.sun.intensity=daylight*(world.weather?.type==='monsoon'?1.2:3.1);world.hemi.intensity=0.35+daylight*1.65;world.sun.color.set(daylight<0.2?0x9bbcff:0xffe0b1);}
        world.destinationMarker.rotation.y+=dt*.5;
        if(world.frame-world.lastHud>12){
          world.lastHud=world.frame;
          const area=AREAS.reduce((best,a)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-best.x,p.z-best.z)?a:best,AREAS[0]).name;
          setHud(old=>({...old,speed:Math.round(Math.abs(p.speed)*3.6),area,distance:p.distance.toFixed(1),wantedLevel:world.wantedLevel,missionTime:world.missions.remaining(clock.elapsedTime),missionTitle:world.missions.definition.title}));
          saveManager.save({x:p.x,z:p.z,heading:p.heading,distance:p.distance,money:Math.max(0,Math.floor(Number(world.money)||12500)),targetIndex:world.targetIndex,vehicleType:world.playerCarType||'car',mission:world.missions.export(),weather:world.weather?.type||'clear',settings:{quality,nightMode,cameraMode}});
          if(Math.hypot(p.x-world.missionTarget.x,p.z-world.missionTarget.z)<35){
            const reached=world.missionTarget;
            const step=world.missions.advance();
            if(!step.complete){
              setTarget(step.target);
              setHud(old=>({...old,mission:world.missions.definition.title+': Checkpoint '+step.step+'/'+step.total}));
              setNotice(world.missions.definition.title+' — checkpoint '+step.step+'/'+step.total+' reached. Next: '+step.target.name+'.');
            } else {
              const completedMissionId=world.missions.active;
              const result=world.missions.complete();
              const reward=result.ok?result.reward:500;
              const sessionId=serverSessionRef.current;
              if(sessionId){
                api.post('/dhaka-game/sessions/'+sessionId+'/missions/'+completedMissionId+'/complete').then(({data})=>{
                  setOnlineProfile(data.profile||null);
                  api.get('/dhaka-game/leaderboard').then(({data:rows})=>setOnlineLeaderboard(Array.isArray(rows)?rows:[])).catch(()=>{});
                  api.post('/dhaka-game/sessions/'+sessionId+'/missions/explore/start').catch(()=>{});
                }).catch(error=>{
                  api.post('/dhaka-game/sessions/'+sessionId+'/missions/explore/start').catch(()=>{});
                  if(error.response?.status!==409)setNotice(error.response?.data?.error||'Game progress is saved locally; online sync will retry next session.');
                });
              }
              const nextIndex=(world.targetIndex+1)%LANDMARKS.length;
              world.money+=reward;world.audio?.missionComplete();
              world.missions.start('explore',clock.elapsedTime,nextIndex);
              setTarget(world.missions.target||LANDMARKS[nextIndex]);
              setHud(old=>({...old,money:world.money,mission:'Reach '+world.missionTarget.name}));
              setNotice('Mission complete: '+reached.name+'! ৳'+reward+' earned. Next: '+world.missionTarget.name+'.');
            }
          }
        }
        renderer.render(scene,camera);
      };
      engine.current={setTarget,startMission,changeVehicleType,syncRemotePlayers,world,renderer,scene,camera};
      animate();
      return ()=>{disposed=true;cancelAnimationFrame(animationId);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);resizeObserver?.disconnect();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});renderer.dispose();if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);};
    } catch (err) {
      console.error('Dhaka 3D game failed to initialize:', err);
      setNotice('3D graphics could not start in this browser. Try enabling hardware acceleration or lowering graphics quality.');
    }
  }, [quality]);

  useEffect(()=>{
    const canvas=mapCanvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');let timer;
    const draw=()=>{
      const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,scale=0.075;
      ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(5,12,19,.94)';ctx.fillRect(0,0,w,h);
      // Street grid and river, centered on the player so the map stays useful while driving.
      ctx.save();ctx.translate(cx,cy);
      ctx.fillStyle='#205b70';ctx.fillRect((1500-(engine.current?.world.player.x||0))*scale,-h*2,850*scale,h*4);
      ctx.strokeStyle='#4c5963';ctx.lineWidth=2;
      for(let p=-1700;p<=1700;p+=110){const dx=(p-(engine.current?.world.player.x||0))*scale;const dz=(p-(engine.current?.world.player.z||0))*scale;ctx.beginPath();ctx.moveTo(dx,-h*2);ctx.lineTo(dx,h*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-w*2,dz);ctx.lineTo(w*2,dz);ctx.stroke();}
      for(const lm of LANDMARKS){const x=(lm.x-(engine.current?.world.player.x||0))*scale,y=(lm.z-(engine.current?.world.player.z||0))*scale;if(Math.abs(x)<w/2&&Math.abs(y)<h/2){ctx.fillStyle='#f6c453';ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();}}
      const target=engine.current?.world.missionTarget;if(target&&Math.abs((target.x-(engine.current?.world.player.x||0))*scale)<w/2&&Math.abs((target.z-(engine.current?.world.player.z||0))*scale)<h/2){ctx.strokeStyle='#fb7185';ctx.lineWidth=2;ctx.beginPath();ctx.arc((target.x-engine.current.world.player.x)*scale,(target.z-engine.current.world.player.z)*scale,7,0,Math.PI*2);ctx.stroke();}
      ctx.rotate(-(engine.current?.world.player.heading||0));ctx.fillStyle='#34d399';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,h-2);
      timer=requestAnimationFrame(draw);
    };draw();return()=>cancelAnimationFrame(timer);
  },[]);
  useEffect(()=>{if(engine.current)engine.current.world.running=running;},[running]);
  useEffect(()=>{if(!engine.current)return;const w=engine.current.world;w.scene.background.set(nightMode?0x101c35:0x9ab9ca);w.scene.fog.color.set(nightMode?0x101c35:0x9ab9ca);w.sun.intensity=nightMode?0.45:3.1;w.sun.color.set(nightMode?0x9bbcff:0xffe0b1);w.hemi.intensity=nightMode?0.55:2.0;w.hemi.color.set(nightMode?0x526e9c:0xddeeff);w.hemi.groundColor.set(nightMode?0x151b2c:0x697353);},[nightMode]);
  const chooseLandmark=(lm)=>{if(!engine.current)return;engine.current.startMission('explore',Math.max(0,LANDMARKS.findIndex(item=>item.name===lm.name)));};
  const reset=()=>{const p=engine.current?.world.player;if(p){p.x=-520;p.z=-520;p.heading=0;p.speed=0;p.walking=false;setWalkMode(false);setNotice('Back at Gulshan Circle 2.');}};
  return <div className="min-h-screen bg-[#070b10] text-white">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b121b]/95 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-950/50"><CarFront size={24}/></div><div><div className="text-lg font-black tracking-[.13em]">DHAKA <span className="text-red-400">OPEN WORLD</span></div><div className="text-[11px] text-slate-400">VibePulse • 3D city driving experience</div></div></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>setRunning(v=>!v)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500">{running?<Pause size={15} className="mr-1 inline"/>:<Play size={15} className="mr-1 inline"/>}{running?'Pause':'Resume'}</button><button onClick={()=>setMuted(v=>!v)} title="Toggle generated engine/horn sounds" className="rounded-lg border border-white/15 px-3 py-2">{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button onClick={()=>audioRef.current?.horn()} title="Horn (H)" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-bold">HORN</button><button onClick={()=>setNightMode(v=>!v)} title="Toggle day/night" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-bold">{nightMode?'Night':'Day'}</button><button onClick={()=>setAutoDayCycle(v=>!v)} title="Toggle dynamic day-night cycle" className={'rounded-lg border px-3 py-2 text-sm font-bold '+(autoDayCycle?'border-amber-300/60 text-amber-200':'border-white/15')}>{autoDayCycle?'AUTO CYCLE ON':'AUTO CYCLE'}</button><button onClick={()=>{const next=cameraMode==='Chase'?'Close':cameraMode==='Close'?'Cinematic':cameraMode==='Cinematic'?'First Person':'Chase';setCameraMode(next);if(engine.current)engine.current.world.cameraMode=next;}} title="Change camera (V)" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-bold">📷 {cameraMode}</button><button onClick={reset} title="Reset position" className="rounded-lg border border-white/15 px-3 py-2"><RotateCcw size={17}/></button></div>
    </header>
    <main className="mx-auto max-w-[1700px] p-3 md:p-5">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6">{[['SPEED',hud.speed+' km/h'],['CURRENT DISTRICT',hud.area],['WALLET','৳ '+hud.money.toLocaleString()],['TRAVEL DISTANCE',hud.distance+' km'],['WANTED LEVEL','★'.repeat(hud.wantedLevel||0)+(hud.wantedLevel?'':' —')],['MISSION TIMER',hud.missionTime?Math.ceil(hud.missionTime)+' s':'No limit']].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-[#101924] p-3"><div className="text-[10px] font-bold tracking-[.17em] text-slate-500">{a}</div><div className="mt-1 truncate text-base font-bold">{b}</div></div>)}</div>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#1c292d] shadow-2xl shadow-black/50">
        <div ref={mountRef} className="h-[68dvh] min-h-[420px] w-full touch-none sm:min-h-[480px] md:h-[76vh]" />
        <div className="pointer-events-none absolute left-3 top-3 max-w-[68%] rounded-xl border border-white/10 bg-black/65 px-3 py-2 backdrop-blur-md sm:left-4 sm:top-4 sm:px-4 sm:py-3"><div className="text-[10px] font-black tracking-[.15em] text-emerald-300 sm:text-xs">OPEN WORLD • DHAKA</div><div className="mt-1 text-xs font-semibold sm:text-sm">{notice}</div><div className="mt-1 text-[10px] text-slate-300">Objective: {hud.mission}</div></div>
        <div className="absolute left-3 top-[42%] flex flex-col gap-2 sm:hidden select-none">
          <button aria-label="Steer left" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(engine.current)engine.current.world.keys.a=true;}} onPointerUp={()=>{if(engine.current)engine.current.world.keys.a=false;}} onPointerCancel={()=>{if(engine.current)engine.current.world.keys.a=false;}} onLostPointerCapture={()=>{if(engine.current)engine.current.world.keys.a=false;}} className="h-14 w-14 rounded-full border border-white/30 bg-slate-950/75 text-2xl font-black shadow-lg active:bg-emerald-700 touch-none">←</button>
          <button aria-label="Steer right" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(engine.current)engine.current.world.keys.d=true;}} onPointerUp={()=>{if(engine.current)engine.current.world.keys.d=false;}} onPointerCancel={()=>{if(engine.current)engine.current.world.keys.d=false;}} onLostPointerCapture={()=>{if(engine.current)engine.current.world.keys.d=false;}} className="h-14 w-14 rounded-full border border-white/30 bg-slate-950/75 text-2xl font-black shadow-lg active:bg-emerald-700 touch-none">→</button>
        </div>
        <div className="absolute bottom-4 right-3 flex items-end gap-2 sm:hidden select-none">
          <button aria-label="Brake and reverse" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(engine.current){engine.current.world.keys.s=true;engine.current.world.keys[' ']=true;}}} onPointerUp={()=>{if(engine.current){engine.current.world.keys.s=false;engine.current.world.keys[' ']=false;}}} onPointerCancel={()=>{if(engine.current){engine.current.world.keys.s=false;engine.current.world.keys[' ']=false;}}} onLostPointerCapture={()=>{if(engine.current){engine.current.world.keys.s=false;engine.current.world.keys[' ']=false;}}} className="h-14 rounded-full border border-white/30 bg-slate-950/75 px-4 text-xs font-black shadow-lg active:bg-amber-700 touch-none">BRAKE</button>
          <button aria-label="Accelerate" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(engine.current)engine.current.world.keys.w=true;}} onPointerUp={()=>{if(engine.current)engine.current.world.keys.w=false;}} onPointerCancel={()=>{if(engine.current)engine.current.world.keys.w=false;}} onLostPointerCapture={()=>{if(engine.current)engine.current.world.keys.w=false;}} className="h-[76px] w-[76px] rounded-full border-2 border-emerald-300/80 bg-emerald-700/85 text-xs font-black shadow-xl active:bg-emerald-500 touch-none">GAS ▲</button>
        </div>
        <div className="absolute bottom-3 left-[76px] flex gap-2 sm:hidden">
          <button onClick={()=>{if(engine.current){engine.current.world.player.walking=!engine.current.world.player.walking;setWalkMode(engine.current.world.player.walking);engine.current.world.player.speed=0;}}} className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-[10px] font-bold">{walkMode?'GET IN CAR':'WALK'}</button>
          <button onClick={()=>{if(engine.current){const w=engine.current.world;w.cameraMode=w.cameraMode==='Chase'?'Close':w.cameraMode==='Close'?'Cinematic':w.cameraMode==='Cinematic'?'First Person':'Chase';setCameraMode(w.cameraMode);}}} className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-[10px] font-bold">CAM</button>
        </div>
        <div className="absolute bottom-3 left-3 hidden w-[132px] overflow-hidden rounded-xl border border-white/20 bg-black/65 shadow-xl sm:block"><div className="border-b border-white/10 px-2 py-1 text-[9px] font-black tracking-[.18em] text-emerald-300">MINI MAP</div><canvas ref={mapCanvasRef} width="132" height="132" className="block h-[132px] w-[132px]"/></div>
        <div className="absolute bottom-3 right-3 hidden rounded-xl border border-white/15 bg-black/65 p-3 backdrop-blur-md sm:block"><div className="mb-2 flex items-center gap-2 text-xs font-bold"><Gauge size={15} className="text-red-300"/> GRAPHICS</div><select value={quality} onChange={e=>setQuality(e.target.value)} className="rounded-md border border-white/15 bg-slate-900 px-3 py-1.5 text-sm"><option>High</option><option>Medium</option><option>Low</option></select></div>
        {!running&&<div className="absolute inset-0 z-20 grid place-items-center bg-black/55"><div className="rounded-2xl border border-white/15 bg-black/80 px-8 py-6 text-center"><Pause size={34} className="mx-auto mb-2"/><div className="text-2xl font-black">GAME PAUSED</div><button onClick={()=>setRunning(true)} className="mt-4 rounded-lg bg-red-600 px-5 py-2 font-bold">Continue</button></div></div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#101924] p-3"><span className="text-xs font-black tracking-widest text-slate-400">VEHICLE</span><select value={vehicleType} onChange={e=>engine.current?.changeVehicleType(e.target.value)} className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"><option value="car">Private Sedan</option><option value="hatchback">Hatchback</option><option value="suv">SUV</option><option value="luxury">Luxury Car</option><option value="van">Covered Van</option><option value="microbus">Microbus</option><option value="deliveryVan">Delivery Van</option><option value="pickup">Pickup Truck</option><option value="bus">City Bus</option><option value="minibus">Minibus</option><option value="schoolBus">School Bus</option><option value="coach">Intercity Coach</option><option value="truck">Truck</option><option value="firetruck">Fire Truck</option><option value="ambulance">Ambulance</option><option value="police">Police Car</option><option value="cng">CNG Auto-rickshaw</option><option value="rickshaw">Cycle Rickshaw</option><option value="batteryRickshaw">Battery Rickshaw</option><option value="handcart">Handcart</option><option value="motorcycle">Motorcycle</option><option value="scooter">Scooter</option><option value="bicycle">Bicycle</option><option value="boat">Passenger Boat</option><option value="riverLaunch">River Launch</option></select><span className="ml-2 text-xs font-black tracking-widest text-slate-400">VEHICLE PAINT</span>{[{label:"Red",value:"#c72f2f"},{label:"Blue",value:"#2563eb"},{label:"Black",value:"#20252c"},{label:"White",value:"#e5e7eb"},{label:"Yellow",value:"#eab308"},{label:"Green",value:"#15803d"}].map(c=><button key={c.value} title={c.label} aria-label={c.label+" car paint"} onClick={()=>{setCarColor(c.value);const car=engine.current?.world.playerCar;if(car)car.children.forEach(child=>{if(child.material&&child.material.color&&child.geometry?.type==="BoxGeometry"&&child.position.y>0.4&&child.position.y<1.3)child.material.color.set(c.value);});}} className={"h-7 w-7 rounded-full border-2 "+(carColor===c.value?"border-white ring-2 ring-emerald-400":"border-white/20")} style={{backgroundColor:c.value}}/>)} </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-white/10 bg-[#101924] p-4"><h2 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-emerald-300"/> Explore Dhaka districts & landmarks</h2><div className="flex flex-wrap gap-2">{LANDMARKS.map(lm=><button key={lm.name} onClick={()=>chooseLandmark(lm)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-emerald-400 hover:bg-emerald-400/10">{lm.name}</button>)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-widest text-slate-500">Weather</span><select value={weather} onChange={e=>setWeather(e.target.value)} className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"><option value="clear">Clear</option><option value="smog">Dhaka Smog</option><option value="rain">Rain</option><option value="monsoon">Monsoon</option><option value="fog">Morning Fog</option></select><span className="text-xs text-slate-500">Rain and fog affect visibility.</span></div><p className="mt-3 text-xs leading-5 text-slate-500">A procedurally built, original 3D city inspired by Dhaka's dense roads, mixed traffic, street markets, river ghats and landmark architecture. The layout is game-fiction, not a survey-accurate city map.</p></section>
        <aside className="rounded-xl border border-white/10 bg-[#101924] p-4"><h2 className="mb-3 font-bold">Missions & Controls</h2><div className="mb-4 grid grid-cols-2 gap-2">{MissionSystem.Types && Object.values(MissionSystem.Types).filter(m=>m.id!=='explore').map(m=><button key={m.id} onClick={()=>engine.current?.startMission(m.id)} className="rounded-lg border border-cyan-300/15 bg-cyan-300/5 px-2 py-2 text-left text-xs hover:bg-cyan-300/10"><b className="block text-cyan-200">{m.title}</b><span className="mt-1 block text-slate-400">৳{m.reward} reward</span></button>)}</div><div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">VibePulse Online</div>{onlineProfile ? <><div className="mt-2 text-sm font-bold">Verified game score: {Number(onlineProfile.score||0).toLocaleString()}</div><div className="mt-1 text-xs text-slate-400">Missions: {onlineProfile.missions_completed||0} · Play time: {Math.floor((onlineProfile.play_seconds||0)/60)} min</div></> : <div className="mt-2 text-xs text-slate-400">{localStorage.getItem('token')?'Connecting your game profile…':'Sign in to sync scores and appear on the leaderboard.'}</div>}{onlineLeaderboard.length>0&&<div className="mt-3 border-t border-white/10 pt-2"><div className="mb-2 text-xs font-bold text-slate-300">Top Players</div>{onlineLeaderboard.slice(0,5).map((player,index)=><div key={player.id} className="flex items-center justify-between gap-2 py-1 text-xs"><span className="truncate text-slate-300">{index+1}. {player.username}</span><b className="text-amber-200">{Number(player.score||0).toLocaleString()}</b></div>)}</div>}</div><h3 className="mb-2 text-sm font-bold text-slate-300">Controls</h3><div className="space-y-2 text-sm text-slate-300"><p><b className="text-white">W / ↑</b> Accelerate / walk forward</p><p><b className="text-white">S / ↓</b> Reverse / walk backward</p><p><b className="text-white">A / D</b> Steer / turn</p><p><b className="text-white">C</b> Switch car / on foot</p><p><b className="text-white">V</b> Cycle Chase / Close / Cinematic / First Person</p><p><b className="text-white">Space</b> Brake / Jump on foot</p><p><b className="text-white">Shift</b> Sprint on foot</p><p><b className="text-white">H</b> Horn</p><p><b className="text-white">B</b> Rickshaw bell</p><p><b className="text-white">Esc</b> Pause / resume</p><p><b className="text-white">R</b> Reset car position</p></div><div className="mt-4 grid grid-cols-2 gap-2">{LANDMARKS.slice(0,4).map(lm=><button key={lm.name} onClick={()=>{setHud(old=>({...old,mission:'Reach '+lm.name}));chooseLandmark(lm);}} className="rounded-lg bg-emerald-700/80 px-2 py-2 text-xs font-bold hover:bg-emerald-600">Go: {lm.name}</button>)}</div><p className="mt-3 text-xs text-slate-500">3D prototype with a procedural environment, traffic, walk/drive modes and landmark objectives. Continued work can expand missions, interiors, animations and assets.</p></aside>
      </div>
    </main>
  </div>;
}
