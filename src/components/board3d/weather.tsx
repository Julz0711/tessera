'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { reducedMotion } from '@/client/fx';
import { usePrefs } from '@/client/prefs';
import type { BoardThemeId } from '@/client/themes';

/**
 * Weather over the 3D board, one kind per theme: clouds, rain, petals, snow, fireflies, dust and so on.
 * Purely for looks (it never catches clicks) and drawn as a single instanced mesh, so a few hundred
 * particles cost one draw call. Players can switch it off in Settings; it also stays off while
 * animations are reduced.
 */
interface Preset {
  /** `fall`: drops from the top of the band and starts again at the top; `float`: drifts and bobs inside it. */
  motion: 'fall' | 'float';
  count: number;
  geometry: () => THREE.BufferGeometry;
  colors: string[];
  opacity: number;
  /** Additive blending, for things that shine (fireflies, neon, stars). */
  glow?: boolean;
  /** Fall speed (fall) or wander speed (float), units per second. */
  speed: [number, number];
  /** Steady drift along x and z, units per second. */
  wind: [number, number];
  /** Side-to-side flutter, units per second. */
  sway: number;
  /** Tumbling, radians per second (0: keep upright). */
  spin: number;
  /** Heights the particles live between (kept low: the camera sits about 11 up, so higher ones loom). */
  band: [number, number];
  size: [number, number];
  /** Streaks lean into the wind (rain). */
  streak?: boolean;
  /** Pulses in size (fireflies, stars). */
  twinkle?: boolean;
  /** A texture for the particle (clouds). */
  map?: () => THREE.Texture;
}

const petal = () => new THREE.CircleGeometry(0.045, 6).scale(1.5, 1, 1);
const dot = (r: number) => () => new THREE.IcosahedronGeometry(r, 0);
const streak = (len: number) => () => new THREE.BoxGeometry(0.007, len, 0.007);
/** A flat sheet lying over the island; the cloud itself is in its texture. */
const cloud = () => new THREE.PlaneGeometry(1.8, 1).rotateX(-Math.PI / 2);

let cloudTexture: THREE.CanvasTexture | null = null;

/** A soft, puffy cloud: a few overlapping blurred discs, fading out at the edges. */
function cloudMap(): THREE.CanvasTexture {
  if (cloudTexture) return cloudTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const puffs: [number, number, number][] = [[70, 72, 44], [118, 58, 54], [170, 70, 46], [140, 84, 40], [96, 86, 36], [196, 82, 30]];
  for (const [x, y, r] of puffs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  cloudTexture = new THREE.CanvasTexture(c);
  return cloudTexture;
}

const PRESETS: Record<BoardThemeId, Preset> = {
  // Classic: no weather as such, just a few soft clouds drifting high over the island.
  classic: {
    motion: 'float', count: 8, geometry: cloud, map: cloudMap, colors: ['#ffffff'], opacity: 0.5,
    speed: [0.01, 0.03], wind: [0.15, 0.03], sway: 0, spin: 0, band: [2.6, 3.4], size: [0.9, 1.5],
  },
  night: {
    motion: 'float', count: 60, geometry: dot(0.028), colors: ['#ffe27a', '#fff3b0'], opacity: 0.95, glow: true,
    speed: [0.15, 0.35], wind: [0, 0], sway: 0.15, spin: 0, band: [0.25, 1.6], size: [0.7, 1.3], twinkle: true,
  },
  sakura: {
    motion: 'fall', count: 140, geometry: petal, colors: ['#f7b3cc', '#f28db2', '#ffd1e3'], opacity: 0.95,
    speed: [0.35, 0.7], wind: [0.35, 0.1], sway: 0.35, spin: 2.2, band: [0, 4], size: [0.8, 1.3],
  },
  nordic: {
    motion: 'fall', count: 260, geometry: dot(0.022), colors: ['#ffffff'], opacity: 0.9,
    speed: [0.4, 0.8], wind: [0.15, 0.05], sway: 0.2, spin: 0, band: [0, 4], size: [0.6, 1.4],
  },
  frontier: {
    motion: 'float', count: 120, geometry: dot(0.014), colors: ['#e3c79a', '#cfa870'], opacity: 0.6,
    speed: [0.05, 0.15], wind: [0.9, 0.15], sway: 0.1, spin: 0, band: [0.1, 2.5], size: [0.6, 1.4],
  },
  nile: {
    motion: 'float', count: 100, geometry: dot(0.014), colors: ['#f3dca0', '#e8c679'], opacity: 0.55,
    speed: [0.05, 0.15], wind: [0.35, -0.1], sway: 0.15, spin: 0, band: [0.1, 2], size: [0.6, 1.4],
  },
  skyport: {
    motion: 'float', count: 14, geometry: cloud, map: cloudMap, colors: ['#ffffff'], opacity: 0.7,
    speed: [0.02, 0.05], wind: [0.25, 0], sway: 0, spin: 0, band: [1.8, 3.2], size: [0.8, 1.4],
  },
  cyberpunk: {
    // Rain on the megacity: mostly plain streaks, every few catching the neon.
    motion: 'fall', count: 220, geometry: streak(0.28), colors: ['#c9d8ea', '#c9d8ea', '#c9d8ea', '#2de2e6', '#c9d8ea', '#ff3ea5'], opacity: 0.45, glow: true,
    speed: [7, 9], wind: [-0.8, 0.3], sway: 0, spin: 0, band: [0, 4], size: [0.8, 1.2], streak: true,
  },
  orbital: {
    motion: 'float', count: 90, geometry: () => new THREE.OctahedronGeometry(0.022), colors: ['#ffffff', '#9fe8ff', '#c9b8ff'], opacity: 0.9, glow: true,
    speed: [0.02, 0.08], wind: [0.05, 0], sway: 0, spin: 1, band: [0.3, 3], size: [0.6, 1.4], twinkle: true,
  },
  origami: {
    motion: 'fall', count: 110, geometry: () => new THREE.PlaneGeometry(0.06, 0.04), colors: ['#f28b82', '#fbbc04', '#81c995', '#8ab4f8', '#c58af9'], opacity: 1,
    speed: [0.3, 0.55], wind: [0.2, 0.05], sway: 0.3, spin: 3, band: [0, 4], size: [0.8, 1.2],
  },
};

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

/** Particles over a square of half-width `radius` around the board's centre. */
export function Weather({ theme, radius, quality }: { theme: BoardThemeId; radius: number; quality: 'high' | 'low' }) {
  // Re-render when the animation setting changes; `reducedMotion` reads it (and the system setting).
  usePrefs((p) => p.motion);
  const still = reducedMotion();
  const preset = PRESETS[theme];
  const count = Math.round(preset.count * (quality === 'low' ? 0.5 : 1));
  const mesh = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => preset.geometry(), [preset]);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: preset.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: preset.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
        map: preset.map?.() ?? null,
      }),
    [preset],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Per particle: position, base height (float), speed, size and two phases.
  const state = useMemo(() => {
    const p = { x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), base: new Float32Array(count), v: new Float32Array(count), s: new Float32Array(count), a: new Float32Array(count), b: new Float32Array(count) };
    for (let i = 0; i < count; i++) {
      p.x[i] = (Math.random() * 2 - 1) * radius;
      p.z[i] = (Math.random() * 2 - 1) * radius;
      p.y[i] = p.base[i] = between(preset.band);
      p.v[i] = between(preset.speed);
      p.s[i] = between(preset.size);
      p.a[i] = Math.random() * Math.PI * 2;
      p.b[i] = Math.random() * Math.PI * 2;
    }
    return p;
  }, [count, radius, preset]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, c.set(preset.colors[i % preset.colors.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count, preset, still]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((frame, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const t = frame.clock.elapsedTime;
    const { x, y, z, base, v, s, a, b } = state;
    const [wx, wz] = preset.wind;
    const span = radius * 2;
    for (let i = 0; i < count; i++) {
      x[i] += (wx + preset.sway * Math.sin(t * 1.3 + a[i])) * dt;
      z[i] += (wz + preset.sway * Math.cos(t * 1.1 + b[i])) * dt;
      if (preset.motion === 'fall') {
        y[i] -= v[i] * dt;
        if (y[i] < 0) {
          y[i] = preset.band[1];
          x[i] = (Math.random() * 2 - 1) * radius;
          z[i] = (Math.random() * 2 - 1) * radius;
        }
      } else {
        // Wander along a slowly turning heading, bobbing around the particle's own height.
        x[i] += Math.cos(a[i] + t * 0.2) * v[i] * dt;
        z[i] += Math.sin(b[i] + t * 0.2) * v[i] * dt;
        y[i] = base[i] + Math.sin(t * 0.8 + a[i]) * 0.12;
      }
      if (x[i] > radius) x[i] -= span;
      else if (x[i] < -radius) x[i] += span;
      if (z[i] > radius) z[i] -= span;
      else if (z[i] < -radius) z[i] += span;

      dummy.position.set(x[i], y[i], z[i]);
      if (preset.streak) dummy.rotation.set(wz / v[i], 0, -wx / v[i]);
      else if (preset.spin) dummy.rotation.set(t * preset.spin + a[i], t * preset.spin * 0.7 + b[i], a[i]);
      else dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(s[i] * (preset.twinkle ? 0.55 + 0.45 * Math.sin(t * 3 + a[i]) : 1));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (still || count === 0) return null;
  return <instancedMesh key={`${theme}-${count}`} ref={mesh} args={[geometry, material, count]} frustumCulled={false} raycast={() => null} />;
}
