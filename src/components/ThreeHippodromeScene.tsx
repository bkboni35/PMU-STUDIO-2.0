import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { 
  Play, Pause, RotateCcw, Video, Eye, Sun, Moon, CloudRain, 
  ChevronDown, ChevronUp, Maximize2, Minimize2, X, Trophy, 
  Sparkles, Compass, ShieldCheck, Flag
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';

interface ThreeHippodromeSceneProps {
  course: CourseHippique | null;
  onClose?: () => void;
  isModal?: boolean;
}

// Scratch math helpers pre-allocated at module scope (Zero GC in 60fps loop)
const _scratchVec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _horsePos = new THREE.Vector3();
const _horseTangent = new THREE.Vector3();
const _matrix4 = new THREE.Matrix4();
const _colorHelper = new THREE.Color();

// Procedural texture generators (Zero external 404 images)
function createProceduralTrackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Sand/clay base gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#c29b68');
  grad.addColorStop(0.5, '#b08855');
  grad.addColorStop(1, '#9e7542');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Sand grain noise & harrow raking grooves
  ctx.fillStyle = 'rgba(70, 48, 25, 0.12)';
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 512, 1.5);
  }

  // Random turf/cinder specks
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = Math.random() * 1.8;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(50, 30, 10, 0.25)' : 'rgba(235, 205, 160, 0.35)';
    ctx.fillRect(x, y, s, s);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHorseNumberTexture(numero: number, bgHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 128, 128);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 120);

  // Number text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFinishLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Checkerboard finish line
  const size = 32;
  for (let x = 0; x < 128; x += size) {
    for (let y = 0; y < 128; y += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#ffffff' : '#e11d48';
      ctx.fillRect(x, y, size, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const radGrad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Procedural Horse Colors based on numero
const SADDLE_COLORS = [
  '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', 
  '#0d9488', '#ea580c', '#e11d48', '#0284c7', '#4f46e5',
  '#059669', '#d97706', '#7c3aed', '#db2777', '#65a30d',
  '#0891b2', '#475569', '#b91c1c'
];

interface HorseActor {
  id: string;
  numero: number;
  nom: string;
  driver?: string;
  cote: number;
  speedMultiplier: number;
  group: THREE.Group;
  contactShadow: THREE.Mesh;
  legs: THREE.Group[];
  wheels: THREE.Mesh[];
  progress: number; // 0 to 1 along race track
  laneOffset: number; // lateral offset across track width
  rank: number;
}

export const ThreeHippodromeScene: React.FC<ThreeHippodromeSceneProps> = ({
  course,
  onClose,
  isModal = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [cameraMode, setCameraMode] = useState<'finish' | 'chase' | 'drone' | 'pack'>('chase');
  const [weatherPreset, setWeatherPreset] = useState<'day' | 'night' | 'overcast'>('day');
  const [focusedHorseIndex, setFocusedHorseIndex] = useState<number>(0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [raceElapsedSec, setRaceElapsedSec] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<Array<{ numero: number; nom: string; progress: number; rank: number }>>([]);

  // Internal mutable refs for animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const horsesRef = useRef<HorseActor[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const lightsRef = useRef<{
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    floodLights: THREE.PointLight[];
  } | null>(null);

  // Extract partants list (or mock high-fidelity 14-partants field if empty)
  const partantsList = useMemo(() => {
    if (course?.partants && course.partants.length > 0) {
      return course.partants.filter(p => !p.estNonPartant);
    }
    return Array.from({ length: 14 }, (_, i) => ({
      numero: i + 1,
      nom: `Cheval N°${i + 1}`,
      driver: `Driver ${i + 1}`,
      coteProbable: Math.round((3 + i * 2.5) * 10) / 10,
    })) as Partant[];
  }, [course]);

  // Main Three.js Scene Setup (Mount once)
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    // Dimensions
    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric Fog
    scene.fog = new THREE.FogExp2(0xa0c8f0, 0.005);
    scene.background = new THREE.Color(0xa0c8f0);

    // Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 600);
    camera.position.set(0, 18, 38);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underground
    controls.minDistance = 5;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // Balanced 3-Point Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x4a3b22, 0.85);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(45, 65, 35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 180;
    keyLight.shadow.camera.left = -60;
    keyLight.shadow.camera.right = 60;
    keyLight.shadow.camera.top = 60;
    keyLight.shadow.camera.bottom = -60;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Stadium Floodlights for night preset
    const flood1 = new THREE.PointLight(0xffffff, 0, 80);
    flood1.position.set(-30, 22, -15);
    const flood2 = new THREE.PointLight(0xffffff, 0, 80);
    flood2.position.set(30, 22, 15);
    scene.add(flood1);
    scene.add(flood2);

    lightsRef.current = {
      keyLight,
      hemiLight,
      floodLights: [flood1, flood2],
    };

    // --- PROCEDURAL HIPPODROME ARCHITECTURE ---

    // 1. Terrain Ground
    const terrainGeo = new THREE.PlaneGeometry(350, 250, 16, 16);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x2e5c2a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 2. Race Oval Track
    const trackRadiusX = 52;
    const trackRadiusZ = 28;
    const trackWidth = 10;

    // Track path curve (Oval)
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    const straightLen = 35;
    // Straight 1 (Bottom finish stretch)
    curvePath.add(new THREE.LineCurve3(new THREE.Vector3(-straightLen, 0.02, trackRadiusZ), new THREE.Vector3(straightLen, 0.02, trackRadiusZ)));
    // Turn 1 (Right curve)
    curvePath.add(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(straightLen, 0.02, trackRadiusZ),
      new THREE.Vector3(straightLen + 22, 0.02, 0),
      new THREE.Vector3(straightLen, 0.02, -trackRadiusZ)
    ));
    // Straight 2 (Top backstretch)
    curvePath.add(new THREE.LineCurve3(new THREE.Vector3(straightLen, 0.02, -trackRadiusZ), new THREE.Vector3(-straightLen, 0.02, -trackRadiusZ)));
    // Turn 2 (Left curve)
    curvePath.add(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-straightLen, 0.02, -trackRadiusZ),
      new THREE.Vector3(-straightLen - 22, 0.02, 0),
      new THREE.Vector3(-straightLen, 0.02, trackRadiusZ)
    ));

    // Track Ribbon Mesh
    const trackPts = curvePath.getSpacedPoints(180);
    const trackShape = new THREE.BufferGeometry();
    const trackVerts: number[] = [];
    const trackUvs: number[] = [];
    const trackNormals: number[] = [];

    const halfW = trackWidth / 2;
    for (let i = 0; i < trackPts.length; i++) {
      const p = trackPts[i];
      const nextP = trackPts[(i + 1) % trackPts.length];
      const tangent = _scratchVec3.subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const inner = p.clone().addScaledVector(normal, -halfW);
      const outer = p.clone().addScaledVector(normal, halfW);

      trackVerts.push(inner.x, 0.04, inner.z);
      trackVerts.push(outer.x, 0.04, outer.z);

      const u = i / trackPts.length;
      trackUvs.push(u, 0);
      trackUvs.push(u, 1);

      trackNormals.push(0, 1, 0);
      trackNormals.push(0, 1, 0);
    }

    const trackIndices: number[] = [];
    for (let i = 0; i < trackPts.length - 1; i++) {
      const idx = i * 2;
      trackIndices.push(idx, idx + 1, idx + 2);
      trackIndices.push(idx + 1, idx + 3, idx + 2);
    }
    trackShape.setAttribute('position', new THREE.Float32BufferAttribute(trackVerts, 3));
    trackShape.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
    trackShape.setAttribute('normal', new THREE.Float32BufferAttribute(trackNormals, 3));
    trackShape.setIndex(trackIndices);

    const trackMat = new THREE.MeshStandardMaterial({
      map: createProceduralTrackTexture(),
      roughness: 0.85,
      metalness: 0.05,
    });
    const trackMesh = new THREE.Mesh(trackShape, trackMat);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // 3. Inner & Outer Safety Railings (Lices en bois blanc)
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });

    // Place railing posts around track
    for (let i = 0; i < trackPts.length; i += 3) {
      const p = trackPts[i];
      const nextP = trackPts[(i + 1) % trackPts.length];
      const tangent = _scratchVec3.subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Inner post
      const innerPost = new THREE.Mesh(postGeo, postMat);
      innerPost.position.copy(p).addScaledVector(normal, -halfW);
      innerPost.position.y = 0.55;
      innerPost.castShadow = true;
      scene.add(innerPost);

      // Outer post
      const outerPost = new THREE.Mesh(postGeo, postMat);
      outerPost.position.copy(p).addScaledVector(normal, halfW);
      outerPost.position.y = 0.55;
      outerPost.castShadow = true;
      scene.add(outerPost);
    }

    // 4. Finish Line Structure (Poteau d'arrivée officiel)
    const finishGroup = new THREE.Group();
    finishGroup.position.set(0, 0, trackRadiusZ);

    // Checkered ground line
    const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 1.8);
    const finishLineMat = new THREE.MeshStandardMaterial({
      map: createFinishLineTexture(),
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const finishLineStrip = new THREE.Mesh(finishLineGeo, finishLineMat);
    finishLineStrip.rotation.x = -Math.PI / 2;
    finishLineStrip.position.y = 0.06;
    finishGroup.add(finishLineStrip);

    // Official Photo-Finish Mirror Post
    const towerPillarGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
    const towerPillarMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.4 });
    const postLeft = new THREE.Mesh(towerPillarGeo, towerPillarMat);
    postLeft.position.set(-halfW - 0.4, 3, 0);
    postLeft.castShadow = true;
    finishGroup.add(postLeft);

    const postRight = new THREE.Mesh(towerPillarGeo, towerPillarMat);
    postRight.position.set(halfW + 0.4, 3, 0);
    postRight.castShadow = true;
    finishGroup.add(postRight);

    // Crossbar with Photo-Finish Mirror & Race Clock
    const crossbarGeo = new THREE.BoxGeometry(trackWidth + 1.6, 0.8, 0.6);
    const crossbarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.2 });
    const crossbar = new THREE.Mesh(crossbarGeo, crossbarMat);
    crossbar.position.set(0, 5.8, 0);
    crossbar.castShadow = true;
    finishGroup.add(crossbar);

    // Mirror lens / camera
    const lensGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.9,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 5.2, 0);
    finishGroup.add(lens);

    scene.add(finishGroup);

    // 5. Grandstand Tribune (Tribune des Officiels)
    const grandstand = new THREE.Group();
    grandstand.position.set(0, 0, trackRadiusZ + 14);

    // Tiered base
    for (let t = 0; t < 5; t++) {
      const tierGeo = new THREE.BoxGeometry(40, 1.2, 2.5);
      const tierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const tier = new THREE.Mesh(tierGeo, tierMat);
      tier.position.set(0, t * 1.0 + 0.6, t * 2.2);
      tier.castShadow = true;
      tier.receiveShadow = true;
      grandstand.add(tier);
    }

    // Canopy Roof
    const roofGeo = new THREE.BoxGeometry(44, 0.5, 14);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.5, 4.5);
    roof.rotation.x = 0.08;
    roof.castShadow = true;
    grandstand.add(roof);

    // Roof Support Pillars
    const roofPostGeo = new THREE.CylinderGeometry(0.2, 0.2, 8.5, 8);
    const roofPostMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    for (const rx of [-18, -6, 6, 18]) {
      const rPost = new THREE.Mesh(roofPostGeo, roofPostMat);
      rPost.position.set(rx, 4.25, -1);
      rPost.castShadow = true;
      grandstand.add(rPost);
    }
    scene.add(grandstand);

    // 6. Infield Landscape: Instanced Low-Poly Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6);
    const treeFoliageGeo = new THREE.ConeGeometry(1.8, 3.8, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x1e6f3d, roughness: 0.8 });

    const treeCount = 45;
    const trunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
    const foliageInstanced = new THREE.InstancedMesh(treeFoliageGeo, treeFoliageMat, treeCount);
    trunkInstanced.castShadow = true;
    foliageInstanced.castShadow = true;

    let treeIdx = 0;
    for (let i = 0; i < treeCount; i++) {
      // Scatter trees in infield or behind grandstand
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 20;
      const tx = Math.cos(angle) * (straightLen * 0.7);
      const tz = Math.sin(angle) * (trackRadiusZ * 0.55);

      const scale = 0.8 + Math.random() * 0.4;
      _matrix4.makeScale(scale, scale, scale);
      _matrix4.setPosition(tx, 1.25 * scale, tz);
      trunkInstanced.setMatrixAt(treeIdx, _matrix4);

      _matrix4.makeScale(scale, scale, scale);
      _matrix4.setPosition(tx, (2.5 + 1.9) * scale, tz);
      foliageInstanced.setMatrixAt(treeIdx, _matrix4);

      _colorHelper.setHSL(0.33 + (Math.random() - 0.5) * 0.05, 0.7, 0.35 + Math.random() * 0.15);
      foliageInstanced.setColorAt(treeIdx, _colorHelper);
      treeIdx++;
    }
    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;
    if (foliageInstanced.instanceColor) foliageInstanced.instanceColor.needsUpdate = true;
    scene.add(trunkInstanced);
    scene.add(foliageInstanced);

    // --- PROCEDURAL COMPOSITE RUNNERS (3–12 Parts THREE.Group) ---
    const contactShadowGeo = new THREE.PlaneGeometry(2.4, 3.6);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: createRadialContactShadowTexture(),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    const actors: HorseActor[] = [];
    const horsesToCreate = partantsList.slice(0, 16);

    horsesToCreate.forEach((partant, idx) => {
      const horseGroup = new THREE.Group();
      const horseNumber = partant.numero || idx + 1;
      const numColorHex = SADDLE_COLORS[(horseNumber - 1) % SADDLE_COLORS.length];

      // 1. Torso/Body (organic muscular contours)
      const bodyGeo = new THREE.CapsuleGeometry(0.55, 1.4, 8, 12);
      const coatMat = new THREE.MeshStandardMaterial({
        color: idx % 3 === 0 ? 0x4a2a18 : idx % 3 === 1 ? 0x221813 : 0x734828,
        roughness: 0.65,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, coatMat);
      body.rotation.x = Math.PI / 2;
      body.position.set(0, 1.5, 0);
      body.castShadow = true;
      horseGroup.add(body);

      // 2. Neck & Head
      const neckGeo = new THREE.CylinderGeometry(0.28, 0.42, 1.1, 8);
      const neck = new THREE.Mesh(neckGeo, coatMat);
      neck.position.set(0, 2.1, 0.7);
      neck.rotation.x = -Math.PI / 4;
      neck.castShadow = true;
      horseGroup.add(neck);

      const headGeo = new THREE.ConeGeometry(0.28, 0.75, 8);
      const head = new THREE.Mesh(headGeo, coatMat);
      head.position.set(0, 2.45, 1.15);
      head.rotation.x = Math.PI / 3;
      head.castShadow = true;
      horseGroup.add(head);

      // 3. Saddle Cloth with Procedural PMU Number
      const saddleMat = new THREE.MeshStandardMaterial({
        map: createHorseNumberTexture(horseNumber, numColorHex),
        roughness: 0.5,
      });
      const saddleGeo = new THREE.BoxGeometry(1.15, 0.7, 0.95);
      const saddle = new THREE.Mesh(saddleGeo, saddleMat);
      saddle.position.set(0, 1.6, 0.05);
      saddle.castShadow = true;
      horseGroup.add(saddle);

      // 4. Legs (4 articulated groups for trotting oscillation)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1f1610, roughness: 0.7 });
      const hoofMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 1.1, 6);
      const hoofGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.2, 6);

      const legGroups: THREE.Group[] = [];
      const legPositions = [
        [-0.35, 0.7, 0.65],   // Front Left
        [0.35, 0.7, 0.65],    // Front Right
        [-0.35, 0.7, -0.65],  // Hind Left
        [0.35, 0.7, -0.65],   // Hind Right
      ];

      legPositions.forEach(([lx, ly, lz]) => {
        const lGroup = new THREE.Group();
        lGroup.position.set(lx, ly, lz);

        const legUpper = new THREE.Mesh(legGeo, legMat);
        legUpper.position.y = -0.3;
        legUpper.castShadow = true;
        lGroup.add(legUpper);

        const hoof = new THREE.Mesh(hoofGeo, hoofMat);
        hoof.position.y = -0.85;
        hoof.castShadow = true;
        lGroup.add(hoof);

        horseGroup.add(lGroup);
        legGroups.push(lGroup);
      });

      // 5. Mane & Tail
      const tailGeo = new THREE.CylinderGeometry(0.05, 0.16, 1.1, 6);
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x0f0b08, roughness: 0.9 });
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.position.set(0, 1.45, -0.85);
      tail.rotation.x = -Math.PI / 5;
      horseGroup.add(tail);

      // 6. Sulky / Trot Cart
      const sulkyFrameMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
      const sulkyShaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
      const shaftL = new THREE.Mesh(sulkyShaftGeo, sulkyFrameMat);
      shaftL.rotation.x = Math.PI / 2;
      shaftL.position.set(-0.55, 1.1, -0.9);
      horseGroup.add(shaftL);

      const shaftR = new THREE.Mesh(sulkyShaftGeo, sulkyFrameMat);
      shaftR.rotation.x = Math.PI / 2;
      shaftR.position.set(0.55, 1.1, -0.9);
      horseGroup.add(shaftR);

      // Sulky Wheels (Chrome Spokes + Rubber)
      const wheelRimGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 20);
      const wheelRubberMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      const wheelSpokeGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.1, 4);
      const spokeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });

      const wheelMeshes: THREE.Mesh[] = [];
      [-0.85, 0.85].forEach((wx) => {
        const wheel = new THREE.Mesh(wheelRimGeo, wheelRubberMat);
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(wx, 0.6, -1.9);
        wheel.castShadow = true;

        const spoke = new THREE.Mesh(wheelSpokeGeo, spokeMat);
        wheel.add(spoke);
        const spoke2 = new THREE.Mesh(wheelSpokeGeo, spokeMat);
        spoke2.rotation.z = Math.PI / 2;
        wheel.add(spoke2);

        horseGroup.add(wheel);
        wheelMeshes.push(wheel);
      });

      // 7. Jockey Figure (Torso + Helmet + Silks)
      const jockeySilkMat = new THREE.MeshStandardMaterial({
        color: numColorHex,
        roughness: 0.4,
      });
      const jockeyTorsoGeo = new THREE.CapsuleGeometry(0.24, 0.5, 6, 8);
      const jockeyTorso = new THREE.Mesh(jockeyTorsoGeo, jockeySilkMat);
      jockeyTorso.position.set(0, 1.45, -1.8);
      jockeyTorso.rotation.x = -Math.PI / 8;
      jockeyTorso.castShadow = true;
      horseGroup.add(jockeyTorso);

      const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.2 });
      const helmetGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 1.95, -1.65);
      helmet.castShadow = true;
      horseGroup.add(helmet);

      // 8. Contact Shadow Plane beneath subject
      const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.05;
      scene.add(contactShadow);

      scene.add(horseGroup);

      // Initial track lane position
      const laneSpread = ((idx % 4) - 1.5) * 2.2;
      // Stagger initial progress
      const initialProgress = (0.78 + (idx * 0.012)) % 1;
      const cote = Number(partant.coteProbable || (4 + idx * 2));
      const speedMultiplier = 1.0 + (1 / Math.max(2, cote)) * 0.15;

      actors.push({
        id: `horse-${horseNumber}`,
        numero: horseNumber,
        nom: partant.nom || `N°${horseNumber}`,
        driver: partant.driver,
        cote,
        speedMultiplier,
        group: horseGroup,
        contactShadow,
        legs: legGroups,
        wheels: wheelMeshes,
        progress: initialProgress,
        laneOffset: laneSpread,
        rank: idx + 1,
      });
    });

    horsesRef.current = actors;

    // --- ANIMATION & RENDER LOOP (Lossless 60fps) ---
    let lastTime = performance.now();
    let elapsedSimSeconds = 0;

    const animate = (currentTime: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;
      const dt = Math.min(deltaMs / 1000, 0.1);

      if (isPlaying) {
        elapsedSimSeconds += dt * speedMultiplier;
        setRaceElapsedSec(Math.round(elapsedSimSeconds * 10) / 10);

        // Update each horse progress and kinematics
        actors.forEach((actor, i) => {
          // Dynamic progression based on base speed + subtle pacing oscillation
          const speedFactor = 0.028 * actor.speedMultiplier * speedMultiplier;
          actor.progress = (actor.progress + speedFactor * dt) % 1;

          // Get track point and normal
          const u = actor.progress;
          const curvePt = curvePath.getPointAt(u, _horsePos);
          const tangent = curvePath.getTangentAt(u, _horseTangent);
          const normal = _scratchVec3.set(-tangent.z, 0, tangent.x).normalize();

          // Apply lane lateral offset
          _horsePos.addScaledVector(normal, actor.laneOffset);
          actor.group.position.copy(_horsePos);

          // Align horse rotation with track tangent
          const angle = Math.atan2(tangent.x, tangent.z);
          actor.group.rotation.y = angle;

          // Vertical trotting / galloping oscillation
          const trotPhase = currentTime * 0.018 * speedMultiplier + i;
          actor.group.position.y = Math.sin(trotPhase * 2) * 0.08;

          // Leg swing
          actor.legs.forEach((leg, lIdx) => {
            const phaseShift = lIdx % 2 === 0 ? 0 : Math.PI;
            leg.rotation.x = Math.sin(trotPhase + phaseShift) * 0.45;
          });

          // Wheel rotation
          actor.wheels.forEach((wheel) => {
            wheel.rotation.z -= 0.12 * speedMultiplier;
          });

          // Contact shadow follows horse grounded on track
          actor.contactShadow.position.set(_horsePos.x, 0.05, _horsePos.z);
          actor.contactShadow.rotation.z = -angle;
        });

        // Compute rankings
        const sorted = [...actors].sort((a, b) => b.progress - a.progress);
        sorted.forEach((a, r) => { a.rank = r + 1; });
        setLeaderboard(sorted.map(s => ({ numero: s.numero, nom: s.nom, progress: s.progress, rank: s.rank })));
      }

      // --- DAMPED CAMERA CINEMATICS ---
      const activeHorse = actors[Math.min(focusedHorseIndex, actors.length - 1)] || actors[0];
      const targetActor = activeHorse ? activeHorse.group : null;

      if (targetActor) {
        if (cameraMode === 'finish') {
          // Fixed photo-finish cam peering right down the wire
          _targetCamPos.set(-halfW - 3, 2.5, trackRadiusZ);
          _targetLookAt.set(0, 1.6, trackRadiusZ);
        } else if (cameraMode === 'chase') {
          // Dynamic chase cam trailing smoothly behind the active horse
          const tangent = curvePath.getTangentAt(activeHorse.progress, _horseTangent);
          _targetCamPos.copy(targetActor.position)
            .addScaledVector(tangent, -8.5)
            .add(new THREE.Vector3(0, 3.8, 0));
          _targetLookAt.copy(targetActor.position).add(new THREE.Vector3(0, 1.6, 0));
        } else if (cameraMode === 'drone') {
          // High aerial tactical drone view
          _targetCamPos.set(0, 68, 8);
          _targetLookAt.set(0, 0, 0);
        } else if (cameraMode === 'pack') {
          // Lateral stretch tracking shot
          _targetCamPos.set(targetActor.position.x + 9, 3.2, targetActor.position.z + 12);
          _targetLookAt.copy(targetActor.position).add(new THREE.Vector3(0, 1.4, 0));
        }

        // Exponential Damping (1 - exp(-k * dt))
        const k = 4.5;
        const dampFactor = 1 - Math.exp(-k * dt);
        camera.position.lerp(_targetCamPos, dampFactor);
        controls.target.lerp(_targetLookAt, dampFactor);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!mountEl || !renderer || !camera) return;
      const newW = mountEl.clientWidth;
      const newH = mountEl.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, [partantsList]);

  // Update Weather / Lighting presets at runtime
  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!scene || !lights) return;

    if (weatherPreset === 'day') {
      scene.background = new THREE.Color(0xa0c8f0);
      if (scene.fog) scene.fog.color.set(0xa0c8f0);
      lights.keyLight.intensity = 2.2;
      lights.keyLight.color.set(0xfffaed);
      lights.hemiLight.intensity = 0.85;
      lights.floodLights.forEach(f => { f.intensity = 0; });
    } else if (weatherPreset === 'night') {
      scene.background = new THREE.Color(0x0a101d);
      if (scene.fog) scene.fog.color.set(0x0a101d);
      lights.keyLight.intensity = 0.4;
      lights.keyLight.color.set(0x94a3b8);
      lights.hemiLight.intensity = 0.25;
      lights.floodLights.forEach(f => { f.intensity = 180; });
    } else if (weatherPreset === 'overcast') {
      scene.background = new THREE.Color(0x475569);
      if (scene.fog) scene.fog.color.set(0x475569);
      lights.keyLight.intensity = 1.1;
      lights.keyLight.color.set(0xdbeafe);
      lights.hemiLight.intensity = 0.6;
      lights.floodLights.forEach(f => { f.intensity = 0; });
    }
  }, [weatherPreset]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${isModal ? 'h-[92vh] max-h-[920px] rounded-2xl' : 'h-screen'} bg-slate-950 overflow-hidden select-none`}
    >
      {/* 3D WebGL Canvas isolated container */}
      <div 
        ref={canvasMountRef} 
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* TOP HEADER OVERLAY (HUD) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3 pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/85 px-3 py-2 rounded-xl border border-slate-800 text-white shadow-xl">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide">
                {course?.prixNom || 'Simulation 3D Hippodrome'}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                60 FPS PBR
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {course?.hippodrome || 'Paris-Vincennes'} · {course?.reunion || 'R1'}{course?.courseNumero || 'C1'} · {partantsList.length} Partants
            </p>
          </div>
        </div>

        {/* Live Race Timer & Close Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs font-black text-amber-300 shadow-xl flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px] font-sans font-bold">Chrono:</span>
            <span>{raceElapsedSec.toFixed(1)}s</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-xl cursor-pointer"
              title="Quitter la vue 3D"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MINI LIVE PODIUM TAPE (Top-Right under header) */}
      <div className="absolute top-16 right-3 pointer-events-none z-10 hidden sm:flex flex-col gap-1 max-w-[210px]">
        <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 shadow-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
            <span>En tête en direct</span>
            <span className="text-amber-400 font-mono">Live</span>
          </div>
          {leaderboard.slice(0, 4).map((item, idx) => (
            <div 
              key={item.numero} 
              className="flex items-center justify-between text-xs font-mono py-0.5"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-4 h-4 rounded flex items-center justify-center font-black text-[10px] ${
                  idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-400 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-bold text-white text-[11px] truncate">N°{item.numero}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans truncate max-w-[90px]">{item.nom}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COLLAPSIBLE SLEEK BOTTOM CONTROL DOCK (Solid/rgba surfaces, <= 15% footprint) */}
      <div 
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-20 transition-all duration-300 ease-out ${
          isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Dock Collapse Toggle Button */}
        <div className="flex justify-center -mb-px">
          <button
            type="button"
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="px-4 py-1 rounded-t-xl bg-slate-950 border-t border-x border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 shadow-md cursor-pointer transition-colors"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Afficher les Contrôles 3D</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Mode Cinéma Plein Écran</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Body */}
        <div className="bg-slate-950 p-3 sm:p-3.5 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-2.5">
          {/* Ligne 1 : Caméras & Météo */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Camera presets */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline mr-1">Caméra:</span>
              <button
                type="button"
                onClick={() => setCameraMode('chase')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'chase' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Poursuite</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('finish')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'finish' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3 h-3" />
                <span>Arrivée (Photo)</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('drone')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'drone' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Drone Aérien</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('pack')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'pack' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Peloton</span>
              </button>
            </div>

            {/* Weather / Atmosphere presets */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline mr-1">Éclairage:</span>
              <button
                type="button"
                onClick={() => setWeatherPreset('day')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  weatherPreset === 'day' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title="Jour Ensoleillé"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWeatherPreset('night')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  weatherPreset === 'night' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title="Nocturne Vincennes avec Projecteurs"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWeatherPreset('overcast')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  weatherPreset === 'overcast' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title="Piste Lourde / Ciel Couvert"
              >
                <CloudRain className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Ligne 2 : Playback & Focus Cheval */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800/80">
            {/* Play/Pause & Speed */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-slate-950" /> : <Play className="w-3 h-3 fill-slate-950" />}
                <span>{isPlaying ? 'Pause' : 'Course'}</span>
              </button>

              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                {[0.25, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeedMultiplier(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      speedMultiplier === spd ? 'bg-slate-800 text-amber-300 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd === 0.25 ? '0.25x (Ralenti)' : `${spd}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cheval Focus */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Suivre N°:</span>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {partantsList.slice(0, 10).map((p, idx) => (
                  <button
                    key={p.numero}
                    type="button"
                    onClick={() => setFocusedHorseIndex(idx)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
                      focusedHorseIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={p.nom}
                  >
                    {p.numero}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
