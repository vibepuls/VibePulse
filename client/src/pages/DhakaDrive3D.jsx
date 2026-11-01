import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CarFront, MapPin, Pause, Play, RotateCcw, Volume2, VolumeX, Gauge, Footprints } from 'lucide-react';

const AREAS = [
  { name: 'Gulshan', x: -500, z: -500 }, { name: 'Banani', x: 500, z: -700 },
  { name: 'Farmgate', x: -500, z: 500 }, { name: 'Shahbagh', x: 500, z: 400 },
  { name: 'Old Dhaka', x: -850, z: 1050 }, { name: 'Sadarghat', x: 150, z: 1350 },
  { name: 'Motijheel', x: 1000, z: 700 }, { name: 'Mirpur', x: 1050, z: -900 },
  { name: 'Airport Road', x: 1500, z: -100 }
];
const LANDMARKS = [
  { name: 'Lalbagh Fort', x: -880, z: 1030, color: 0xb96d45, type: 'fort' },
  { name: 'Ahsan Manzil', x: 180, z: 1300, color: 0xe9b7a0, type: 'palace' },
  { name: 'Sadarghat Terminal', x: 400, z: 1450, color: 0x4a9ca6, type: 'terminal' },
  { name: 'National Parliament', x: -350, z: -100, color: 0xaaa99e, type: 'parliament' },
  { name: 'Gulshan Circle 2', x: -520, z: -520, color: 0x79a9b6, type: 'tower' },
  { name: 'Shaheed Minar', x: 550, z: 320, color: 0xf0eee3, type: 'monument' },
  { name: 'Mirpur Stadium', x: 1200, z: -930, color: 0x638f72, type: 'stadium' }
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeVehicle(THREE, color, type = 'car', player = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202833, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8cb7c8, metalness: 0.2, roughness: 0.18 });
  const bodyLength = type === 'bus' ? 7.5 : type === 'rickshaw' ? 2.5 : 4.4;
  const bodyWidth = type === 'bus' ? 2.3 : type === 'rickshaw' ? 1.65 : 1.9;
  const bodyHeight = type === 'bus' ? 2.7 : type === 'rickshaw' ? 1.5 : 1.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
  body.position.y = type === 'rickshaw' ? 0.85 : type === 'bus' ? 1.75 : 0.9;
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  if (type !== 'rickshaw') {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.83, type === 'bus' ? 1.05 : 0.78, bodyLength * 0.48), glass);
    cabin.position.set(0, type === 'bus' ? 2.55 : 1.62, -0.15); cabin.castShadow = true; group.add(cabin);
  } else {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.13, 1.65), new THREE.MeshStandardMaterial({ color: 0xe4bd44, roughness: 0.8 }));
    canopy.position.set(0, 1.72, -0.15); group.add(canopy);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 0.75), dark); seat.position.set(0, 1.0, 0.25); group.add(seat);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), bodyMat); front.position.set(0, 0.8, -0.85); group.add(front);
  }
  const wheelGeo = new THREE.CylinderGeometry(type === 'rickshaw' ? 0.28 : 0.38, type === 'rickshaw' ? 0.28 : 0.38, 0.22, 12);
  for (const x of [-bodyWidth / 2 - 0.04, bodyWidth / 2 + 0.04]) for (const z of [-bodyLength * 0.31, bodyLength * 0.31]) {
    const wheel = new THREE.Mesh(wheelGeo, dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, type === 'rickshaw' ? 0.32 : 0.42, z); wheel.castShadow = true; group.add(wheel);
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
  for (const x of [-0.11, 0.11]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.15), legsMat); leg.position.set(x, 0.45, 0); group.add(leg); }
  return group;
}

export default function DhakaDrive() {
  const mountRef = useRef(null);
  const engine = useRef(null);
  const mapCanvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [walkMode, setWalkMode] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hud, setHud] = useState({ speed: 0, area: 'Gulshan', money: 12500, mission: 'Explore Dhaka', distance: 0 });
  const [notice, setNotice] = useState('Welcome to Dhaka. Drive safely and explore the city.');
  const [quality, setQuality] = useState('High');
  const [nightMode, setNightMode] = useState(false);
  const [cameraMode, setCameraMode] = useState('Chase');
  const [carColor, setCarColor] = useState('#c72f2f');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer, scene, camera, animationId, resizeObserver;
    let disposed = false;
    const keys = {};
    const world = {
      player: { x: -520, z: -520, heading: 0, speed: 0, walking: false, distance: 0 },
      cars: [], peds: [], trees: [], colliders: [], labels: [], lastHud: 0, frame: 0,
      missionTarget: LANDMARKS[0], running: true, keys, cameraMode: 'Chase'
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
      const sun = new THREE.DirectionalLight(0xffe0b1, 3.1); sun.position.set(-180, 260, -80); sun.castShadow = quality !== 'Low'; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -180; sun.shadow.camera.right = 180; sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180; scene.add(sun);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x738b6c, roughness: 1 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.receiveShadow = true; scene.add(ground);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x353b42, roughness: 0.96 });
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
      river.rotation.x = -Math.PI / 2; river.position.set(1760, -0.03, 0); scene.add(river);
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
      const trafficColors=[0xf0c53e,0xe9e6df,0xc84a3b,0x286e9d,0x242b33,0x23825b,0xc4c9c9];
      for(let i=0;i<58;i++){
        const horizontal=Math.random()<.5, lane=(Math.random()<.5?-1:1)*4.7, road= Math.round((Math.random()*28-14))*block;
        const type=i%13===0?'bus':i%4===0?'rickshaw':'car';
        const v=makeVehicle(THREE,pick(trafficColors),type);
        v.position.set(horizontal?(Math.random()*3000-1500):road,0,horizontal?road:(Math.random()*3000-1500));
        v.rotation.y=horizontal?(Math.random()<.5?0:Math.PI):(Math.random()<.5?Math.PI/2:-Math.PI/2);
        scene.add(v);world.cars.push({mesh:v,horizontal,road,lane,speed:3+Math.random()*9,dir:Math.random()<.5?-1:1});
      }
      for(let i=0;i<90;i++){
        const p=makePedestrian(THREE);p.position.set((Math.random()*3000-1500),0,(Math.random()*3000-1500));scene.add(p);
        world.peds.push({mesh:p,phase:Math.random()*6.28,originX:p.position.x,originZ:p.position.z,angle:Math.random()*6.28,speed:.5+Math.random()*1.3});
      }
      const playerCar=makeVehicle(THREE,new THREE.Color(carColor).getHex(),'car',true);playerCar.position.set(world.player.x,0,world.player.z);scene.add(playerCar);
      const playerPed=makePedestrian(THREE);playerPed.position.set(world.player.x,0,world.player.z);playerPed.visible=false;scene.add(playerPed);
      world.playerCar=playerCar;world.playerPed=playerPed;world.sun=sun;world.hemi=hemi;world.scene=scene;
      const destinationMarker=new THREE.Group();
      const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.4,8,32),new THREE.MeshStandardMaterial({color:0x55f3b2,emissive:0x0d5a3b}));ring.rotation.x=Math.PI/2;ring.position.y=.3;destinationMarker.add(ring);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.2,.7,20,10,1,true),new THREE.MeshBasicMaterial({color:0x55f3b2,transparent:true,opacity:.35,side:THREE.DoubleSide}));beam.position.y=10;destinationMarker.add(beam);scene.add(destinationMarker);world.destinationMarker=destinationMarker;
      const setTarget = (lm) => { world.missionTarget=lm;destinationMarker.position.set(lm.x,0,lm.z);setHud(old=>({...old,mission:'Reach '+lm.name}));setNotice('New objective: reach '+lm.name+'.'); };
      setTarget(LANDMARKS[0]);
      const onKeyDown=(e)=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;if(k==='c'){world.player.walking=!world.player.walking;setWalkMode(world.player.walking);world.player.speed=0;setNotice(world.player.walking?'On foot — explore the streets.':'You are back in the car.');}if(k==='v'){world.cameraMode=world.cameraMode==='Chase'?'Close':world.cameraMode==='Close'?'Cinematic':'Chase';setCameraMode(world.cameraMode);}if(k==='escape')setRunning(v=>!v);if(k==='r'){world.player.x=-520;world.player.z=-520;world.player.heading=0;world.player.speed=0;}};
      const onKeyUp=(e)=>{keys[e.key.toLowerCase()]=false;};
      window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
      const onResize=()=>{if(!mount||disposed)return;camera.aspect=mount.clientWidth/Math.max(1,mount.clientHeight);camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);};
      resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(mount);
      const clock=new THREE.Clock();
      const tempTarget=new THREE.Vector3();
      const animate=()=>{
        if(disposed)return;animationId=requestAnimationFrame(animate);
        const dt=Math.min(clock.getDelta(),.04);world.frame++;
        const p=world.player;
        if(world.running){
          if(!p.walking){
            if(keys.w||keys.arrowup)p.speed=Math.min(42,p.speed+22*dt);else if(keys.s||keys.arrowdown)p.speed=Math.max(-13,p.speed-28*dt);else p.speed*=Math.pow(.965,dt*60);
            if(keys[' '])p.speed*=Math.pow(.72,dt*60);
            const steer=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0);
            p.heading+=steer*dt*(0.65+Math.min(Math.abs(p.speed)/17,1.5))*(p.speed<0?-1:1);
          }else{
            p.speed=0;const move=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),turn=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0);
            p.heading+=turn*dt*2.2;p.x+=Math.sin(p.heading)*move*9*dt;p.z+=Math.cos(p.heading)*move*9*dt;
          }
          if(!p.walking){const nx=p.x+Math.sin(p.heading)*p.speed*dt,nz=p.z+Math.cos(p.heading)*p.speed*dt;
            const buildingHit=world.colliders.some(b=>Math.abs(nx-b.x)<b.w/2+1.5&&Math.abs(nz-b.z)<b.d/2+2.4);
            const trafficHit=world.cars.some(v=>Math.abs(nx-v.mesh.position.x)<(v.mesh.userData.length||4.4)*0.48+1.8&&Math.abs(nz-v.mesh.position.z)<3.0);
            const hit=buildingHit||trafficHit;
            if(hit){p.speed*=-.18;if(world.frame%30===0)setNotice(trafficHit?'Traffic collision! Slow down and steer carefully.':'Building collision! Steer back onto the road.');}else{p.x=nx;p.z=nz;p.distance+=Math.abs(p.speed*dt)/1000;}
          }
          p.x=clamp(p.x,-1650,1650);p.z=clamp(p.z,-1650,1650);
          for(const v of world.cars){const m=v.mesh;if(v.horizontal){m.position.x+=v.dir*v.speed*dt;if(m.position.x>1700)m.position.x=-1700;if(m.position.x< -1700)m.position.x=1700;}else{m.position.z+=v.dir*v.speed*dt;if(m.position.z>1700)m.position.z=-1700;if(m.position.z< -1700)m.position.z=1700;}}
          for(const ped of world.peds){ped.phase+=dt*ped.speed;ped.mesh.position.x=ped.originX+Math.sin(ped.phase)*2.5;ped.mesh.position.z=ped.originZ+Math.cos(ped.phase*.7)*2.5;ped.mesh.rotation.y=ped.angle+Math.sin(ped.phase)*.35;}
        }
        const active= p.walking?world.playerPed:world.playerCar;active.visible=true; (p.walking?world.playerCar:world.playerPed).visible=false;
        active.position.set(p.x,0,p.z);active.rotation.y=p.heading;
        if(p.walking){active.position.y=Math.abs(Math.sin(world.frame*.18))*.05;}
        const behind=world.cameraMode==='Close'?(p.walking?3.4:5.4):world.cameraMode==='Cinematic'?(p.walking?16:25):(p.walking?10:17);
        const height=world.cameraMode==='Close'?(p.walking?2.8:3.5):world.cameraMode==='Cinematic'?(p.walking?10:13):(p.walking?6:8);
        const desired=new THREE.Vector3(p.x-Math.sin(p.heading)*behind,height,p.z-Math.cos(p.heading)*behind);
        camera.position.lerp(desired,1-Math.pow(.001,dt));tempTarget.set(p.x,world.cameraMode==='Close'?(p.walking?1.6:1.0):(p.walking?1.25:1.4),p.z);camera.lookAt(tempTarget);
        world.destinationMarker.rotation.y+=dt*.5;
        if(world.frame-world.lastHud>12){
          world.lastHud=world.frame;
          const area=AREAS.reduce((best,a)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-best.x,p.z-best.z)?a:best,AREAS[0]).name;
          setHud(old=>({...old,speed:Math.round(Math.abs(p.speed)*3.6),area,distance:p.distance.toFixed(1)}));
          if(Math.hypot(p.x-world.missionTarget.x,p.z-world.missionTarget.z)<35){setHud(old=>({...old,money:old.money+500,mission:'Mission complete!'}));setNotice('Mission complete! ৳500 earned. Choose another landmark.');world.missionTarget={...world.missionTarget,x:99999,z:99999};}
        }
        renderer.render(scene,camera);
      };
      engine.current={setTarget,world,renderer,scene,camera};
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
      ctx.fillStyle='#205b70';ctx.fillRect((1760-(engine.current?.world.player.x||0))*scale,-h*2,850*scale,h*4);
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
  const chooseLandmark=(lm)=>{if(!engine.current)return;engine.current.setTarget(lm);};
  const reset=()=>{const p=engine.current?.world.player;if(p){p.x=-520;p.z=-520;p.heading=0;p.speed=0;p.walking=false;setWalkMode(false);setNotice('Back at Gulshan Circle 2.');}};
  return <div className="min-h-screen bg-[#070b10] text-white">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b121b]/95 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-950/50"><CarFront size={24}/></div><div><div className="text-lg font-black tracking-[.13em]">DHAKA <span className="text-red-400">OPEN WORLD</span></div><div className="text-[11px] text-slate-400">VibePulse • 3D city driving experience</div></div></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>setRunning(v=>!v)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500">{running?<Pause size={15} className="mr-1 inline"/>:<Play size={15} className="mr-1 inline"/>}{running?'Pause':'Resume'}</button><button onClick={()=>setMuted(v=>!v)} title="Audio settings" className="rounded-lg border border-white/15 px-3 py-2">{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button onClick={()=>setNightMode(v=>!v)} title="Toggle day/night" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-bold">{nightMode?'Night':'Day'}</button><button onClick={()=>{const next=cameraMode==='Chase'?'Close':cameraMode==='Close'?'Cinematic':'Chase';setCameraMode(next);if(engine.current)engine.current.world.cameraMode=next;}} title="Change camera (V)" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-bold">📷 {cameraMode}</button><button onClick={reset} title="Reset position" className="rounded-lg border border-white/15 px-3 py-2"><RotateCcw size={17}/></button></div>
    </header>
    <main className="mx-auto max-w-[1700px] p-3 md:p-5">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">{[['SPEED',hud.speed+' km/h'],['CURRENT DISTRICT',hud.area],['WALLET','৳ '+hud.money.toLocaleString()],['TRAVEL DISTANCE',hud.distance+' km']].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-[#101924] p-3"><div className="text-[10px] font-bold tracking-[.17em] text-slate-500">{a}</div><div className="mt-1 truncate text-base font-bold">{b}</div></div>)}</div>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#1c292d] shadow-2xl shadow-black/50">
        <div ref={mountRef} className="h-[58vh] min-h-[420px] w-full md:h-[70vh]" />
        <div className="pointer-events-none absolute left-4 top-4 max-w-[75%] rounded-xl border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md"><div className="text-xs font-black tracking-[.2em] text-emerald-300">OPEN WORLD • DHAKA, BANGLADESH</div><div className="mt-1 text-sm font-semibold">{notice}</div><div className="mt-1 text-[11px] text-slate-300">Objective: {hud.mission}</div></div>
        <div className="absolute left-4 bottom-4 w-[132px] overflow-hidden rounded-xl border border-white/20 bg-black/60 shadow-xl"><div className="border-b border-white/10 px-2 py-1 text-[9px] font-black tracking-[.18em] text-emerald-300">MINI MAP</div><canvas ref={mapCanvasRef} width="132" height="132" className="block h-[132px] w-[132px]"/></div>
        <div className="absolute bottom-4 right-4 rounded-xl border border-white/15 bg-black/60 p-3 backdrop-blur-md"><div className="mb-2 flex items-center gap-2 text-xs font-bold"><Gauge size={15} className="text-red-300"/> GRAPHICS</div><select value={quality} onChange={e=>setQuality(e.target.value)} className="rounded-md border border-white/15 bg-slate-900 px-3 py-1.5 text-sm"><option>High</option><option>Medium</option><option>Low</option></select></div>
        {!running&&<div className="absolute inset-0 grid place-items-center bg-black/45"><div className="rounded-2xl border border-white/15 bg-black/70 px-8 py-6 text-center"><Pause size={34} className="mx-auto mb-2"/><div className="text-2xl font-black">GAME PAUSED</div><button onClick={()=>setRunning(true)} className="mt-4 rounded-lg bg-red-600 px-5 py-2 font-bold">Continue</button></div></div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#101924] p-3"><span className="text-xs font-black tracking-widest text-slate-400">VEHICLE PAINT</span>{[{label:"Red",value:"#c72f2f"},{label:"Blue",value:"#2563eb"},{label:"Black",value:"#20252c"},{label:"White",value:"#e5e7eb"},{label:"Yellow",value:"#eab308"},{label:"Green",value:"#15803d"}].map(c=><button key={c.value} title={c.label} aria-label={c.label+" car paint"} onClick={()=>{setCarColor(c.value);const car=engine.current?.world.playerCar;if(car)car.children.forEach(child=>{if(child.material&&child.material.color&&child.geometry?.type==="BoxGeometry"&&child.position.y>0.4&&child.position.y<1.3)child.material.color.set(c.value);});}} className={"h-7 w-7 rounded-full border-2 "+(carColor===c.value?"border-white ring-2 ring-emerald-400":"border-white/20")} style={{backgroundColor:c.value}}/></div>
      <div className="mt-3 grid grid-cols-4 gap-2 md:hidden">
        {[
          ['◀','a'],['▲','w'],['▼','s'],['▶','d']
        ].map(([label,key])=><button key={key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);if(engine.current)engine.current.world.keys[key]=true;}} onPointerUp={()=>{if(engine.current)engine.current.world.keys[key]=false;}} onPointerCancel={()=>{if(engine.current)engine.current.world.keys[key]=false;}} onPointerLeave={()=>{if(engine.current)engine.current.world.keys[key]=false;}} className="rounded-xl border border-white/15 bg-[#172332] py-4 text-xl font-black active:bg-red-600">{label}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 md:hidden">
        <button onClick={()=>{if(engine.current){engine.current.world.player.walking=!engine.current.world.player.walking;setWalkMode(engine.current.world.player.walking);engine.current.world.player.speed=0;}}} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#172332] px-3 py-3 text-sm font-bold"><Footprints size={16}/>{walkMode?'Enter car':'Walk mode'}</button>
        <button onPointerDown={()=>{if(engine.current)engine.current.world.keys[' ']=true;}} onPointerUp={()=>{if(engine.current)engine.current.world.keys[' ']=false;}} className="flex-1 rounded-lg border border-white/15 bg-[#172332] px-3 py-3 text-sm font-bold">Brake</button>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-white/10 bg-[#101924] p-4"><h2 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-emerald-300"/> Explore Dhaka districts & landmarks</h2><div className="flex flex-wrap gap-2">{LANDMARKS.map(lm=><button key={lm.name} onClick={()=>chooseLandmark(lm)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-emerald-400 hover:bg-emerald-400/10">{lm.name}</button>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">A procedurally built, original 3D city inspired by Dhaka's dense roads, mixed traffic, street markets, river ghats and landmark architecture. The layout is game-fiction, not a survey-accurate city map.</p></section>
        <aside className="rounded-xl border border-white/10 bg-[#101924] p-4"><h2 className="mb-3 font-bold">Controls</h2><div className="space-y-2 text-sm text-slate-300"><p><b className="text-white">W / ↑</b> Accelerate / walk forward</p><p><b className="text-white">S / ↓</b> Reverse / walk backward</p><p><b className="text-white">A / D</b> Steer / turn</p><p><b className="text-white">C</b> Switch car / on foot</p><p><b className="text-white">V</b> Change camera view</p><p><b className="text-white">Space</b> Brake</p><p><b className="text-white">Esc</b> Pause / resume</p><p><b className="text-white">R</b> Reset car position</p></div><div className="mt-4 grid grid-cols-2 gap-2">{LANDMARKS.slice(0,4).map(lm=><button key={lm.name} onClick={()=>{setHud(old=>({...old,mission:'Reach '+lm.name}));chooseLandmark(lm);}} className="rounded-lg bg-emerald-700/80 px-2 py-2 text-xs font-bold hover:bg-emerald-600">Go: {lm.name}</button>)}</div><p className="mt-3 text-xs text-slate-500">3D prototype with a procedural environment, traffic, walk/drive modes and landmark objectives. Continued work can expand missions, interiors, animations and assets.</p></aside>
      </div>
    </main>
  </div>;
}
