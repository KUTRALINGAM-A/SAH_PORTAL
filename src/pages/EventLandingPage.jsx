import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { abs, add, blendScreen, float, mix, mod, mx_cell_noise_float, oneMinus, pass, smoothstep, texture, uniform, uv, vec2, vec3 } from 'three/tsl';

/* Previous event-selector implementation retained below for easy reference.
const events = [
  {
    title: 'Smart Amrita\nHackathon',
    eyebrow: 'Build • Solve • Impact',
    description: 'Turn bold ideas into solutions for national challenges with your team.',
    path: '/sah',
    cta: 'Enter Hackathon',
    accent: 'orange',
    icon: '✦',
    active: true,
  },
  {
    title: 'April\nFest',
    eyebrow: 'Create • Perform • Celebrate',
    description: 'A vibrant stage for creativity, culture, and the energy of campus.',
    cta: 'Coming Soon',
    accent: 'violet',
    icon: '◌',
  },
  {
    title: 'Project Expo &\nPoster Presentation',
    eyebrow: 'Discover • Present • Inspire',
    description: 'Share research, prototypes, and the work that moves ideas forward.',
    cta: 'Coming Soon',
    accent: 'teal',
    icon: '↗',
  },
];

function Bulb() {
  return (
    <div className="event-bulb" aria-hidden="true">
      <span className="bulb-aura bulb-aura-one" />
      <span className="bulb-aura bulb-aura-two" />
      <div className="bulb-glass">
        <span className="bulb-highlight" />
        <span className="bulb-filament bulb-filament-left" />
        <span className="bulb-filament bulb-filament-right" />
        <span className="bulb-core" />
      </div>
      <div className="bulb-neck" />
      <div className="bulb-base"><i /><i /><i /></div>
    </div>
  );
}

export default function EventLandingPage() {
  return (
    <main className="event-landing">
      <div className="event-grid" aria-hidden="true" />
      <div className="event-orbit event-orbit-one" aria-hidden="true" />
      <div className="event-orbit event-orbit-two" aria-hidden="true" />
      <div className="event-spark event-spark-one" aria-hidden="true">✦</div>
      <div className="event-spark event-spark-two" aria-hidden="true">✦</div>
      <div className="event-spark event-spark-three" aria-hidden="true">·</div>

      <header className="event-landing-header">
        <Link className="event-brand" to="/" aria-label="SAH events home">
          <span className="event-brand-mark">A</span>
          <span>AMRITA <small>EVENTS 2026</small></span>
        </Link>
        <span className="event-status"><i /> CHENNAI CAMPUS</span>
      </header>

      <section className="event-hero">
        <div className="event-hero-copy">
          <p className="event-kicker">ONE CAMPUS. INFINITE POSSIBILITIES.</p>
          <h1>Make your<br /><em>next idea</em> matter.</h1>
          <p className="event-intro">Choose your stage. Build, present, celebrate, and leave your mark at Amrita Chennai.</p>
          <a className="event-scroll-cue" href="#events"><span /> Explore events</a>
        </div>
        <Bulb />
      </section>

      <section className="event-choices" id="events" aria-label="Choose an event">
        <div className="event-section-heading">
          <p>SELECT YOUR EXPERIENCE</p>
          <span>01 — 03</span>
        </div>
        <div className="event-card-grid">
          {events.map((event, index) => {
            const content = <>
              <div className="event-card-top"><span>{String(index + 1).padStart(2, '0')}</span><b>{event.icon}</b></div>
              <div className="event-card-content">
                <p>{event.eyebrow}</p>
                <h2>{event.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
                <div className="event-card-bottom"><span>{event.description}</span><strong>{event.cta} <i>→</i></strong></div>
              </div>
            </>;
            return event.active ? (
              <Link className={`event-card event-card-${event.accent}`} key={event.title} to={event.path}>{content}</Link>
            ) : (
              <article className={`event-card event-card-${event.accent} event-card-disabled`} key={event.title} aria-label={`${event.title.replace('\n', ' ')} — coming soon`}>{content}</article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
*/

const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };
const WIDTH = 300;
const HEIGHT = 300;

extend(THREE);

function PostProcessing() {
  const { gl, scene, camera } = useThree();
  const scanProgress = useRef({ value: 0 });
  const renderer = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode('output');
    const uScanProgress = uniform(0);
    scanProgress.current = uScanProgress;
    const scanLine = smoothstep(0, 0.05, abs(uv().y.sub(float(uScanProgress.value))));
    const redOverlay = vec3(1, 0, 0).mul(oneMinus(scanLine)).mul(0.4);
    postProcessing.outputNode = mix(color, add(color, redOverlay), smoothstep(0.9, 1, oneMinus(scanLine))).add(bloom(color, 1, 0.5, 1));
    return postProcessing;
  }, [camera, gl, scene]);

  useFrame(({ clock }) => {
    scanProgress.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    renderer.renderAsync();
  }, 1);
  return null;
}

function Scene() {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);
  const meshRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [w, h] = useAspect(WIDTH, HEIGHT);
  useEffect(() => { if (rawMap && depthMap) setVisible(true); }, [rawMap, depthMap]);
  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);
    const depth = texture(depthMap);
    const image = texture(rawMap, uv().add(depth.r.mul(uPointer).mul(0.01)));
    const tUv = vec2(uv().x.mul(float(WIDTH).div(HEIGHT)), uv().y);
    const tiledUv = mod(tUv.mul(vec2(120, 120)), 2).sub(1);
    const brightness = mx_cell_noise_float(tUv.mul(vec2(120, 120)).div(2));
    const dots = smoothstep(0.5, 0.49, tiledUv.length()).mul(brightness);
    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
    return { material: new THREE.MeshBasicNodeMaterial({ colorNode: blendScreen(image, dots.mul(flow).mul(vec3(10, 0, 0))), transparent: true, opacity: 0 }), uniforms: { uPointer, uProgress } };
  }, [rawMap, depthMap]);
  useFrame(({ clock, pointer }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uPointer.value = pointer;
    if (meshRef.current?.material) meshRef.current.material.opacity = THREE.MathUtils.lerp(meshRef.current.material.opacity, visible ? 1 : 0, 0.07);
  });
  return <mesh ref={meshRef} scale={[w * 0.4, h * 0.4, 1]} material={material}><planeGeometry /></mesh>;
}

// WebGL version of the reference effect: the scan is selected by the depth map,
// not by screen position, so it moves through the object's actual body layers.
function DepthScanScene() {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);
  const meshRef = useRef(null);
  const [w, h] = useAspect(WIDTH, HEIGHT);
  const uniforms = useMemo(() => ({
    uMap: { value: rawMap },
    uDepthMap: { value: depthMap },
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
  }), [rawMap, depthMap]);

  useFrame(({ clock, pointer }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uPointer.value.lerp(pointer, 0.06);
  });

  return <mesh ref={meshRef} scale={[w * 0.4, h * 0.4, 1]}>
    <planeGeometry args={[1, 1, 1, 1]} />
    <shaderMaterial
      transparent
      uniforms={uniforms}
      vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
      fragmentShader={`
        uniform sampler2D uMap; uniform sampler2D uDepthMap; uniform float uProgress; uniform float uTime; uniform vec2 uPointer; varying vec2 vUv;
        void main() {
          float depth = texture2D(uDepthMap, vUv).r;
          vec2 displacedUv = vUv + (depth - 0.5) * uPointer * 0.025;
          vec4 base = texture2D(uMap, displacedUv);

          // --- Surface normals from depth map ---
          vec2 texel = vec2(1.0 / 300.0);
          float dR = texture2D(uDepthMap, vUv + vec2(texel.x, 0.0)).r;
          float dL = texture2D(uDepthMap, vUv - vec2(texel.x, 0.0)).r;
          float dU = texture2D(uDepthMap, vUv + vec2(0.0, texel.y)).r;
          float dD = texture2D(uDepthMap, vUv - vec2(0.0, texel.y)).r;
          vec3 normal = normalize(vec3((dL - dR) * 8.0, (dD - dU) * 8.0, 0.35));

          // --- Primary orbiting light (wide dramatic arc) ---
          float lt = uTime * 0.6;
          vec3 lightDir1 = normalize(vec3(sin(lt) * 1.4, cos(lt * 0.73) * 1.1, 0.7));
          vec3 halfDir1 = normalize(lightDir1 + vec3(0.0, 0.0, 1.0));
          float diff1 = pow(max(dot(normal, lightDir1), 0.0), 1.5);
          float spec1 = pow(max(dot(normal, halfDir1), 0.0), 32.0);

          // --- Secondary counter-rotating light ---
          float lt2 = uTime * 0.45 + 2.1;
          vec3 lightDir2 = normalize(vec3(cos(lt2) * 1.0, sin(lt2 * 0.9) * 0.9, 0.8));
          vec3 halfDir2 = normalize(lightDir2 + vec3(0.0, 0.0, 1.0));
          float diff2 = pow(max(dot(normal, lightDir2), 0.0), 1.5);
          float spec2 = pow(max(dot(normal, halfDir2), 0.0), 28.0);

          // --- Sweep beam: bright line that travels across the surface ---
          vec2 center = vUv - 0.5;
          float sweepAngle = uTime * 0.52;
          vec2 sweepDir = vec2(cos(sweepAngle), sin(sweepAngle));
          float sweepPos = dot(center, sweepDir);
          float sweepWave = sin(uTime * 0.38) * 0.35;
          float sweepLine = smoothstep(0.06, 0.0, abs(sweepPos - sweepWave));
          float sweepBroad = smoothstep(0.18, 0.0, abs(sweepPos - sweepWave)) * 0.35;
          float sweepOnSurface = sweepLine * depth + sweepBroad;

          // --- Rim / edge lighting that rotates ---
          float rimAngle = uTime * 0.35;
          vec2 rimDir = vec2(sin(rimAngle), cos(rimAngle));
          float rim = 1.0 - abs(dot(normal.xy, rimDir));
          rim = pow(max(rim, 0.0), 3.0) * depth;

          // --- Compose light contributions ---
          vec3 warmLight = vec3(1.0, 0.22, 0.08);
          vec3 hotWhite = vec3(1.0, 0.85, 0.75);
          vec3 coolAccent = vec3(1.0, 0.45, 0.25);

          vec3 lightGlow = warmLight * (diff1 * 0.45 + diff2 * 0.25)
            + hotWhite * (spec1 * 1.6 + spec2 * 0.8)
            + warmLight * sweepOnSurface * 0.65
            + coolAccent * rim * 0.55;

          // --- Depth contour scan waves ---
          float contourWave = 0.5 + 0.5 * sin(depth * 34.0 - uTime * 4.6);
          float layer = smoothstep(0.83, 0.98, contourWave);
          float halo = smoothstep(0.58, 0.96, contourWave) * 0.42;
          vec3 redCore = vec3(1.0, 0.0, 0.0);
          vec3 glow = redCore * layer * 1.9 + vec3(1.0, 0.07, 0.02) * halo * 0.75;

          // --- Final composite ---
          vec3 color = mix(base.rgb, redCore, layer * 0.95) + glow + lightGlow;
          gl_FragColor = vec4(color, base.a);
        }
      `}
    />
  </mesh>;
}

export default function EventLandingPage() {
  const navigate = useNavigate();
  const words = ['SMART', 'AMRITA', 'HACKATHON'];
  return <main className="futuristic-hero">
    <div className="futuristic-copy">
      <h1>{words.map((word, index) => <span className="futuristic-word is-visible" style={{ animationDelay: `${index * 0.6}s` }} key={word}>{word}</span>)}</h1>
      <p className="futuristic-subtitle is-visible">INNOVATE. BUILD. INSPIRE.</p>
    </div>
    <button className="futuristic-explore" type="button" onClick={() => navigate('/sah')}>Enter SAH 2026 <span className="futuristic-arrow">↓</span></button>
    <div className="futuristic-visual" aria-hidden="true">
      <Canvas
        flat
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(props);
          await renderer.init();
          return renderer;
        }}
      >
        <PostProcessing fullScreenEffect />
        <Scene />
      </Canvas>
    </div>
  </main>;
}
