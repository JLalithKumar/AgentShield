import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import AuthSceneFallback from './AuthSceneFallback';

function canCreateWebGLContext() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function buildShieldShape(scale = 1) {
  const s = new THREE.Shape();
  const w = 0.88 * scale;
  const top = 1.12 * scale;
  const shoulder = 0.86 * scale;
  const waist = 0.16 * scale;
  const bottom = -1.16 * scale;

  s.moveTo(0, top);
  s.quadraticCurveTo(w * 0.56, top - 0.05 * scale, w, shoulder);
  s.quadraticCurveTo(w * 1.01, waist + 0.35 * scale, w * 0.94, waist);
  s.bezierCurveTo(w * 0.84, -0.52 * scale, w * 0.42, -0.96 * scale, 0, bottom);
  s.bezierCurveTo(-w * 0.42, -0.96 * scale, -w * 0.84, -0.52 * scale, -w * 0.94, waist);
  s.quadraticCurveTo(-w * 1.01, waist + 0.35 * scale, -w, shoulder);
  s.quadraticCurveTo(-w * 0.56, top - 0.05 * scale, 0, top);
  return s;
}

function buildCheckmarkShape() {
  const c = new THREE.Shape();
  // Clean geometric extruded tick centered inside the core shield plate
  c.moveTo(-0.34, 0.03);
  c.lineTo(-0.24, 0.13);
  c.lineTo(-0.08, -0.05);
  c.lineTo(0.28, 0.33);
  c.lineTo(0.38, 0.23);
  c.lineTo(-0.08, -0.25);
  c.closePath();
  return c;
}

function buildContactShadowTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(67, 56, 202, 0.18)');
  grad.addColorStop(0.55, 'rgba(99, 102, 241, 0.08)');
  grad.addColorStop(1, 'rgba(248, 250, 252, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ShieldCoreAssembly({ pointerRef, isPaused }) {
  const rootRef = useRef(null);
  const shieldGroupRef = useRef(null);
  const ringARef = useRef(null);
  const ringBRef = useRef(null);
  const pulseRefs = useRef([]);
  const nodeMatRefs = useRef([]);
  const shadowRef = useRef(null);

  const resources = useMemo(() => {
    const outerShape = buildShieldShape(1.0);
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: 0.20,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.055,
      bevelSegments: 5,
      curveSegments: 28,
    });
    outerGeo.center();

    const trimShape = buildShieldShape(0.84);
    const trimGeo = new THREE.ExtrudeGeometry(trimShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 24,
    });
    trimGeo.center();

    const coreShape = buildShieldShape(0.76);
    const coreGeo = new THREE.ExtrudeGeometry(coreShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.022,
      bevelSegments: 4,
      curveSegments: 24,
    });
    coreGeo.center();

    const checkShape = buildCheckmarkShape();
    const checkGeo = new THREE.ExtrudeGeometry(checkShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.014,
      bevelSegments: 3,
    });
    checkGeo.center();

    const ringAGeo = new THREE.TorusGeometry(2.05, 0.014, 16, 120);
    const ringBGeo = new THREE.TorusGeometry(2.38, 0.011, 14, 120);
    const ringCGeo = new THREE.TorusGeometry(1.52, 0.009, 12, 96);
    const nodeGeo = new THREE.SphereGeometry(0.068, 18, 18);
    const pulseGeo = new THREE.SphereGeometry(0.044, 14, 14);
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.3);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: '#F1F5F9',
      metalness: 0.24,
      roughness: 0.26,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#6366F1',
      metalness: 0.52,
      roughness: 0.24,
    });
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: '#3730A3',
      metalness: 0.30,
      roughness: 0.28,
      clearcoat: 0.40,
      clearcoatRoughness: 0.25,
    });
    const checkMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      emissive: '#E0E7FF',
      emissiveIntensity: 0.16,
      metalness: 0.15,
      roughness: 0.18,
    });
    const ringAMat = new THREE.MeshStandardMaterial({
      color: '#6366F1',
      transparent: true,
      opacity: 0.42,
      metalness: 0.4,
      roughness: 0.3,
    });
    const ringBMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      transparent: true,
      opacity: 0.45,
      metalness: 0.35,
      roughness: 0.35,
    });
    const ringCMat = new THREE.MeshStandardMaterial({
      color: '#818CF8',
      transparent: true,
      opacity: 0.28,
      metalness: 0.3,
      roughness: 0.4,
    });
    const pulseMat = new THREE.MeshStandardMaterial({
      color: '#4338CA',
      emissive: '#6366F1',
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const nodeMats = [
      new THREE.MeshStandardMaterial({ color: '#4338CA', emissive: '#6366F1', emissiveIntensity: 0.45, metalness: 0.35, roughness: 0.22 }),
      new THREE.MeshStandardMaterial({ color: '#4F46E5', emissive: '#818CF8', emissiveIntensity: 0.40, metalness: 0.35, roughness: 0.22 }),
      new THREE.MeshStandardMaterial({ color: '#6366F1', emissive: '#6366F1', emissiveIntensity: 0.40, metalness: 0.35, roughness: 0.22 }),
      new THREE.MeshStandardMaterial({ color: '#15803D', emissive: '#22C55E', emissiveIntensity: 0.35, metalness: 0.30, roughness: 0.24 }),
    ];

    const shadowTex = buildContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });

    return {
      geometries: [outerGeo, trimGeo, coreGeo, checkGeo, ringAGeo, ringBGeo, ringCGeo, nodeGeo, pulseGeo, shadowGeo],
      materials: [outerMat, trimMat, coreMat, checkMat, ringAMat, ringBMat, ringCMat, pulseMat, shadowMat, ...nodeMats],
      textures: shadowTex ? [shadowTex] : [],
      outerGeo, trimGeo, coreGeo, checkGeo, ringAGeo, ringBGeo, ringCGeo, nodeGeo, pulseGeo, shadowGeo,
      outerMat, trimMat, coreMat, checkMat, ringAMat, ringBMat, ringCMat, pulseMat, shadowMat, nodeMats,
    };
  }, []);

  useEffect(() => {
    nodeMatRefs.current = resources.nodeMats;
    return () => {
      resources.geometries.forEach(g => g.dispose());
      resources.materials.forEach(m => m.dispose());
      resources.textures.forEach(t => t.dispose());
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (isPaused) return;
    const elapsed = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // Subtle pointer-driven damping parallax on desktop without interfering with controls
    if (rootRef.current) {
      const targetRotY = pointerRef.current.active ? pointerRef.current.x * 0.16 : 0;
      const targetRotX = pointerRef.current.active ? -pointerRef.current.y * 0.10 : 0;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, targetRotY, Math.min(1, dt * 4.5));
      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetRotX, Math.min(1, dt * 4.5));
    }

    // Gentle shield float + restrained rotational sway
    if (shieldGroupRef.current) {
      const floatY = Math.sin(elapsed * 1.15) * 0.085;
      shieldGroupRef.current.position.y = floatY;
      shieldGroupRef.current.rotation.y = Math.sin(elapsed * 0.55) * 0.14;
      shieldGroupRef.current.rotation.z = Math.cos(elapsed * 0.45) * 0.025;
      if (shadowRef.current) {
        const s = 1 - floatY * 0.35;
        shadowRef.current.scale.set(s, s, 1);
        resources.shadowMat.opacity = 0.78 - floatY * 0.6;
      }
    }

    // Slow architectural ring rotations
    if (ringARef.current) {
      ringARef.current.rotation.z += dt * 0.14;
    }
    if (ringBRef.current) {
      ringBRef.current.rotation.z -= dt * 0.10;
    }

    // Evidence pulses orbiting along ring A and ring B without allocating objects
    const p0 = pulseRefs.current[0];
    if (p0) {
      const a0 = elapsed * 0.72;
      p0.position.set(Math.cos(a0) * 2.05, Math.sin(a0) * 2.05, 0);
    }
    const p1 = pulseRefs.current[1];
    if (p1) {
      const a1 = -elapsed * 0.54 + Math.PI;
      p1.position.set(Math.cos(a1) * 2.38, Math.sin(a1) * 2.38, 0);
    }

    // Subtle sequential node illumination transition
    for (let i = 0; i < nodeMatRefs.current.length; i += 1) {
      const wave = 0.5 + 0.5 * Math.sin(elapsed * 1.4 - i * 1.55);
      nodeMatRefs.current[i].emissiveIntensity = 0.25 + wave * 0.65;
    }
  });

  return (
    <group ref={rootRef}>
      {/* Background reference calibration ring */}
      <mesh geometry={resources.ringCGeo} material={resources.ringCMat} position={[0, 0, -0.35]} />

      {/* Central Physical Shield Object (stepped Z strata eliminate coplanar Z-fighting) */}
      <group ref={shieldGroupRef}>
        <mesh geometry={resources.outerGeo} material={resources.outerMat} position={[0, 0, 0]} />
        <mesh geometry={resources.trimGeo} material={resources.trimMat} position={[0, 0.01, 0.145]} />
        <mesh geometry={resources.coreGeo} material={resources.coreMat} position={[0, 0.01, 0.185]} />
        <mesh geometry={resources.checkGeo} material={resources.checkMat} position={[0, 0.02, 0.275]} />
      </group>

      {/* Orbital Ring A — Validation & Traceability */}
      <group ref={ringARef} rotation={[1.08, 0.24, 0.2]}>
        <mesh geometry={resources.ringAGeo} material={resources.ringAMat} />
        <mesh geometry={resources.nodeGeo} material={resources.nodeMats[0]} position={[2.05, 0, 0]} />
        <mesh geometry={resources.nodeGeo} material={resources.nodeMats[2]} position={[-2.05, 0, 0]} />
        <mesh
          ref={(el) => { pulseRefs.current[0] = el; }}
          geometry={resources.pulseGeo}
          material={resources.pulseMat}
          position={[2.05, 0, 0]}
        />
      </group>

      {/* Orbital Ring B — Regression & Release Governance */}
      <group ref={ringBRef} rotation={[1.22, -0.32, -0.35]}>
        <mesh geometry={resources.ringBGeo} material={resources.ringBMat} />
        <mesh geometry={resources.nodeGeo} material={resources.nodeMats[1]} position={[0, 2.38, 0]} />
        <mesh geometry={resources.nodeGeo} material={resources.nodeMats[3]} position={[0, -2.38, 0]} />
        <mesh
          ref={(el) => { pulseRefs.current[1] = el; }}
          geometry={resources.pulseGeo}
          material={resources.pulseMat}
          position={[0, 2.38, 0]}
        />
      </group>

      {/* Lightweight Contact Shadow Approximation */}
      <mesh
        ref={shadowRef}
        geometry={resources.shadowGeo}
        material={resources.shadowMat}
        position={[0, -1.85, -0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

/**
 * Lazy-loaded procedural Three.js scene representing AgentShield's
 * "Evidence Validation Core". Falls back cleanly to static SVG when WebGL fails.
 */
export default function AuthSecurityScene({ pointerRef, reducedMotion = false }) {
  const containerRef = useRef(null);
  const [webglSupported] = useState(() => canCreateWebGLContext());
  const [contextLost, setContextLost] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(() => (typeof document !== 'undefined' ? document.hidden : false));
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (reducedMotion || !webglSupported || contextLost) {
    return (
      <AuthSceneFallback
        variant="desktop"
        reason={reducedMotion ? 'reduced-motion' : 'webgl-unavailable'}
      />
    );
  }

  const isPaused = reducedMotion || isTabHidden || !isVisible;

  return (
    <div
      ref={containerRef}
      className="auth-three-canvas-wrap"
      data-testid="auth-three-canvas"
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={isPaused ? 'demand' : 'always'}
        camera={{ position: [0, 0.08, 6.4], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          const dom = gl?.domElement;
          if (!dom) return;
          dom.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setContextLost(true);
          });
        }}
      >
        <ambientLight intensity={1.15} color="#F8FAFC" />
        <hemisphereLight args={['#FFFFFF', '#CBD5E1', 0.85]} />
        <directionalLight position={[4.5, 5.5, 6]} intensity={2.1} color="#FFFFFF" />
        <directionalLight position={[-5, 2.5, -4]} intensity={1.5} color="#6366F1" />
        <pointLight position={[0, -3.5, 4.2]} intensity={0.95} color="#E0E7FF" distance={14} />
        <ShieldCoreAssembly pointerRef={pointerRef} isPaused={isPaused} />
      </Canvas>
    </div>
  );
}
