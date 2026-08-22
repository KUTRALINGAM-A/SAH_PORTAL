import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { motion } from 'framer-motion';
import {
  abs, add, float, mix, mod, oneMinus, pass, sin,
  smoothstep, uniform, uv, vec3, positionLocal, normalView,
  floor, fract, step, length, vec2
} from 'three/tsl';

extend(THREE);

/* ═══════════════════════════════════════════════════════════════════════
   PostProcessing: bloom + saffron/green full-screen scanning sweep
   ═══════════════════════════════════════════════════════════════════════ */
function PostProcessing() {
  const { gl, scene, camera } = useThree();
  const scanProgress = useRef({ value: 0 });

  const renderer = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode('output');

    const uScanProgress = uniform(0);
    scanProgress.current = uScanProgress;

    const scanPos = float(uScanProgress.value);
    const scanLine = smoothstep(0, 0.05, abs(uv().y.sub(scanPos)));

    // Saffron → green gradient overlay
    const saffron = vec3(1.0, 0.55, 0.1);
    const green = vec3(0.0, 0.75, 0.3);
    const scanColor = mix(saffron, green, uv().x);
    const overlay = scanColor.mul(oneMinus(scanLine)).mul(0.4);

    const withScan = mix(
      color,
      add(color, overlay),
      smoothstep(0.9, 1.0, oneMinus(scanLine))
    );

    postProcessing.outputNode = withScan.add(bloom(color, 1.2, 0.5, 0.8));
    return postProcessing;
  }, [camera, gl, scene]);

  useFrame(({ clock }) => {
    scanProgress.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    renderer.renderAsync();
  }, 1);

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Helper: build a scanning node material using TSL
   Grey base + colored contour lines that sweep layer-by-layer
   ═══════════════════════════════════════════════════════════════════════ */
function buildScanMaterial(baseR, baseG, baseB, accentR, accentG, accentB, opts = {}) {
  const { wireframe = false, transparent = false, opacity = 1.0, side = THREE.FrontSide, patternType } = opts;

  const uProgress = uniform(0);
  const uTime = uniform(0);

  const y = uv().y;

  // ── Main scan contour (single bright line sweeping up/down) ──
  const pulse = sin(float(uTime).mul(2.5)).mul(0.4).add(0.6);
  const mainContour = oneMinus(smoothstep(0, 0.04, abs(y.sub(uProgress)))).mul(pulse);

  // ── Layer lines (thin horizontal contours for "3D scan" look) ──
  const layerPhase = mod(y.mul(18.0).sub(float(uTime).mul(0.35)), 1.0);
  const layerPulse = sin(float(uTime).mul(3.0).add(y.mul(10.0))).mul(0.5).add(0.5);
  const layerLines = oneMinus(smoothstep(0, 0.018, abs(layerPhase.sub(0.5)))).mul(layerPulse);

  // ── Edge glow (Fresnel rim light based on normals) ──
  const edgeDist = oneMinus(abs(normalView.z));
  const edgeGlow = smoothstep(0.3, 1.0, edgeDist);

  // ── Procedural Patterns ──
  let patternIntensity = float(0.0);

  if (patternType === 'binary') {
    const gridUV = uv().mul(vec2(40.0, 32.0));
    const cell = floor(gridUV);
    const localUV = fract(gridUV).sub(0.5);

    const dotVal = cell.x.mul(12.9898).add(cell.y.mul(78.233));
    const rand = fract(sin(dotVal).mul(43758.5453));

    const isOne = step(0.5, rand);
    const drawOne = step(abs(localUV.x), 0.08).mul(step(abs(localUV.y), 0.35));
    
    const boxX = abs(localUV.x);
    const boxY = abs(localUV.y);
    const drawZeroOuter = step(boxX, 0.22).mul(step(boxY, 0.35));
    const drawZeroInner = step(boxX, 0.1).mul(step(boxY, 0.25));
    const drawZero = drawZeroOuter.sub(drawZeroInner);
    
    const rand2 = fract(rand.mul(13.543));
    const isFilled = step(0.3, rand2);

    patternIntensity = mix(drawZero, drawOne, isOne).mul(isFilled);
  } else if (patternType === 'circuit') {
    const gridUV = uv().mul(vec2(20.0, 16.0));
    const cell = floor(gridUV);
    const localUV = fract(gridUV).sub(0.5);

    const dotVal = cell.x.mul(12.9898).add(cell.y.mul(78.233));
    const rand = fract(sin(dotVal).mul(43758.5453));
    const rand2 = fract(rand.mul(13.543));

    const hasH = step(0.3, rand);
    const hasV = step(0.3, rand2);

    const lineH = hasH.mul(step(abs(localUV.y), 0.06));
    const lineV = hasV.mul(step(abs(localUV.x), 0.06));

    const isNode = step(0.7, rand);
    const node = isNode.mul(step(length(localUV), 0.2));
    const nodeHole = isNode.mul(step(length(localUV), 0.1));

    patternIntensity = step(0.5, lineH.add(lineV).add(node).sub(nodeHole));
  }

  // ── Compose: dark base + accent colored scan effects ──
  const base = vec3(baseR, baseG, baseB);
  const accent = vec3(accentR, accentG, accentB);
  
  const baseIntensity = mainContour.mul(0.9).add(layerLines.mul(0.2)).add(edgeGlow.mul(0.08));
  const finalPattern = patternIntensity.mul(0.4).add(patternIntensity.mul(mainContour).mul(1.0));
  const intensity = baseIntensity.add(finalPattern);
  
  const colorNode = mix(base, accent, intensity);

  const mat = new THREE.MeshBasicNodeMaterial({ colorNode, transparent, wireframe, side });
  if (transparent) mat.opacity = opacity;
  mat.depthWrite = !transparent;

  return { material: mat, uniforms: { uProgress, uTime } };
}

/* ═══════════════════════════════════════════════════════════════════════
   Helper: Bulb Brain Geometry Generator (Left or Right Half)
   ═══════════════════════════════════════════════════════════════════════ */
function useBulbBrainGeometry(isLeft) {
  return useMemo(() => {
    const curve = new THREE.SplineCurve([
      new THREE.Vector2(0.27, -0.59),
      new THREE.Vector2(0.29, -0.44),
      new THREE.Vector2(0.44, -0.14),
      new THREE.Vector2(0.57, 0.16),
      new THREE.Vector2(0.61, 0.36),
      new THREE.Vector2(0.59, 0.56),
      new THREE.Vector2(0.51, 0.73),
      new THREE.Vector2(0.37, 0.86),
      new THREE.Vector2(0.19, 0.94),
      new THREE.Vector2(0.00, 0.97),
    ]);
    const pts = curve.getPoints(128);
    // Left half (X < 0): PI to 2*PI. Right half (X > 0): 0 to PI.
    const phiStart = isLeft ? Math.PI : 0;
    const geo = new THREE.LatheGeometry(pts, 64, phiStart, Math.PI);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let bump = 0;
      if (y > -0.2) {
        const factor = Math.min(1, (y + 0.2) * 1.5);
        if (isLeft) {
          bump = (Math.sin(y * 22) * 0.045 * Math.cos(x * 18) + Math.sin(x * 20 + z * 15) * 0.035) * factor;
        } else {
          bump = (Math.sin(y * 18 + 2) * 0.04 * Math.sin(x * 15) + Math.cos(x * 18 + z * 12) * 0.04) * factor;
        }
      }
      pos.setX(i, x * (1 + bump));
      pos.setZ(i, z * (1 + bump));
    }
    geo.computeVertexNormals();
    return geo;
  }, [isLeft]);
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Components: Bulb Brain Solid (Left & Right)
   ═══════════════════════════════════════════════════════════════════════ */
function BulbBrainSolidLeft() {
  const meshRef = useRef();
  const geometry = useBulbBrainGeometry(true);
  const { material, uniforms } = useMemo(() => buildScanMaterial(0.9, 0.45, 0.05, 1.0, 0.8, 0.2, { patternType: 'circuit' }), []);
  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.6} position={[-0.012, 0.35, 0]} />;
}

function BulbBrainSolidRight() {
  const meshRef = useRef();
  const geometry = useBulbBrainGeometry(false);
  const { material, uniforms } = useMemo(() => buildScanMaterial(0.05, 0.6, 0.2, 0.2, 1.0, 0.4, { patternType: 'binary' }), []);
  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.6} position={[0.012, 0.35, 0]} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Components: Bulb Brain Wireframe Overlay (Left & Right)
   ═══════════════════════════════════════════════════════════════════════ */
function BulbBrainWireframeLeft() {
  const meshRef = useRef();
  const geometry = useBulbBrainGeometry(true);
  const { material, uniforms } = useMemo(() => buildScanMaterial(0.9, 0.45, 0.05, 1.0, 0.9, 0.3, { wireframe: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.62} position={[-0.012, 0.35, 0]} />;
}

function BulbBrainWireframeRight() {
  const meshRef = useRef();
  const geometry = useBulbBrainGeometry(false);
  const { material, uniforms } = useMemo(() => buildScanMaterial(0.05, 0.6, 0.2, 0.4, 1.0, 0.6, { wireframe: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.62} position={[0.012, 0.35, 0]} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Component: Bulb Screw Base
   ═══════════════════════════════════════════════════════════════════════ */
function BulbBase() {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.00, -1.10),
      new THREE.Vector2(0.18, -1.10),
      new THREE.Vector2(0.22, -1.05),
      new THREE.Vector2(0.20, -1.00),
      new THREE.Vector2(0.24, -0.95),
      new THREE.Vector2(0.22, -0.90),
      new THREE.Vector2(0.25, -0.85),
      new THREE.Vector2(0.23, -0.80),
      new THREE.Vector2(0.27, -0.75),
      new THREE.Vector2(0.28, -0.60),
    ];
    return new THREE.LatheGeometry(pts, 32);
  }, []);

  // Metallic slate grey (matches logo)
  const { material, uniforms } = useMemo(
    () => buildScanMaterial(0.12, 0.18, 0.22, 0.4, 0.5, 0.6),
    []
  );

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.6} position={[0, 0.3, 0]} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Component: Spike Rays (radiating lines around the bulb)
   ═══════════════════════════════════════════════════════════════════════ */
function SpikeRays() {
  const spikes = useMemo(() => {
    const items = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      if (angle > Math.PI * 1.25 && angle < Math.PI * 1.75) continue;
      items.push({
        angle,
        len: 0.25 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.15,
        isSaffron: i % 2 === 0,
      });
    }
    return items;
  }, []);

  const matRay = useMemo(() => {
    // Slate grey rays matching the logo
    const { material } = buildScanMaterial(0.12, 0.18, 0.22, 0.4, 0.5, 0.6, { transparent: true, opacity: 0.9 });
    return material;
  }, []);

  return <group position={[0, 0.5, 0]}>
    {spikes.map((s, i) => {
      const x = Math.cos(s.angle) * 0.88;
      const y = Math.sin(s.angle) * 0.88;
      return (
        <mesh
          key={i}
          position={[x * 1.6, (y * 1.6) + 0.3, 0]}
          rotation={[0, 0, s.angle - Math.PI / 2]}
          material={matRay}
        >
          <cylinderGeometry args={[0.018, 0.006, s.len, 6]} />
        </mesh>
      );
    })}
  </group>;
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Component: Bulb Glow Halo (background aura)
   ═══════════════════════════════════════════════════════════════════════ */
function BulbGlowHalo() {
  const { material, uniforms } = useMemo(() => {
    const u = uv();
    const uTime = uniform(0);

    const centerDist = length(u.sub(vec2(0.5, 0.5))).mul(2.0);
    const radial = smoothstep(1.0, 0.1, centerDist);
    
    // Mask out the bottom so it doesn't bleed over the grey bulb base
    const bottomMask = smoothstep(0.25, 0.45, u.y);
    
    // Alternate left/right pulses
    const leftPulse = sin(float(uTime).mul(2.5)).mul(0.5).add(0.5);
    const rightPulse = sin(float(uTime).mul(2.5).add(3.14159)).mul(0.5).add(0.5);
    
    const isRight = step(0.5, u.x);
    const sidePulse = mix(leftPulse, rightPulse, isRight);

    // Vertical sweep effect
    const wave = sin(u.y.mul(6.0).sub(float(uTime).mul(3.0))).mul(0.5).add(0.5);

    const pulseIntensity = sidePulse.mul(wave).mul(0.35).add(0.02);
    const alpha = radial.mul(bottomMask).mul(pulseIntensity);
    
    const color = mix(vec3(0.9, 0.45, 0.05), vec3(0.05, 0.6, 0.2), isRight);
    
    const matNode = new THREE.MeshBasicNodeMaterial({
      colorNode: color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    matNode.opacityNode = alpha;
    
    return { material: matNode, uniforms: { uTime } };
  }, []);

  const meshRef = useRef();
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={meshRef} material={material} scale={[4.5, 4.5, 1]} position={[0, 0.35, -0.2]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scene Container: groups everything + mouse follow + rotation
   ═══════════════════════════════════════════════════════════════════════ */
function SIHBulbScene() {
  const groupRef = useRef();

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    // Mouse follow only (no continuous rotation)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.x * 0.35,
      0.04
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * -0.12,
      0.04
    );
  });

  return <>
    <PostProcessing />
    <group ref={groupRef} scale={0.66} position={[0, -0.1, 0]}>
      <BulbGlowHalo />
      <BulbBrainSolidLeft />
      <BulbBrainSolidRight />
      <BulbBrainWireframeLeft />
      <BulbBrainWireframeRight />
      <BulbBase />
      <SpikeRays />
    </group>
  </>;
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════ */
export default function EventLandingPage() {
  const navigate = useNavigate();
  const words = ['SMART', 'AMRITA', 'HACKATHON'];

  return (
    <main className="futuristic-hero">
      <div className="futuristic-copy">
        <h1>
          {words.map((word, index) => (
            <span
              className="futuristic-word is-visible"
              style={{ animationDelay: `${index * 0.6}s` }}
              key={word}
            >
              {word}
            </span>
          ))}
        </h1>
        <p className="futuristic-subtitle is-visible">INNOVATE. BUILD. INSPIRE.</p>
      </div>

      <button
        className="futuristic-explore"
        type="button"
        onClick={() => navigate('/sah')}
      >
        Enter SAH 2026 <span className="futuristic-arrow">↓</span>
      </button>

      <motion.div 
        className="futuristic-visual" 
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          duration: 1.8, 
          delay: 2.0, 
          ease: [0.16, 1, 0.3, 1]
        }}
      >
        <Canvas
          flat
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={async (props) => {
            const renderer = new THREE.WebGPURenderer(props);
            await renderer.init();
            return renderer;
          }}
        >
          <SIHBulbScene />
        </Canvas>
      </motion.div>
    </main>
  );
}
