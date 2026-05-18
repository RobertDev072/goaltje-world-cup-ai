import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Modern stylized stadium. Procedural — not a fotorealistic replica.
 * Inspired by Mercedes-Benz Stadium, AT&T Stadium, MetLife Stadium:
 *   - oval bowl, vertical louver facade
 *   - thick roof ring (sometimes closed at the top)
 *   - LED scoreboards on short ends
 *   - floodlights only when roof is open
 */

interface StadiumModel3DProps {
  matchId: string;
  venueName?: string | null;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function seededRng(seed: number) {
  let s = Math.floor(seed * 1e9) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ---------- Geometry helpers ---------------------------------- */

// Oval ring tribune (a curved bowl). Built from a lathe/cylinder
// scaled non-uniformly so the footprint is oval.
function OuterBowl({
  innerR,
  outerR,
  bottomH,
  topH,
  color,
}: {
  innerR: number;
  outerR: number;
  bottomH: number;
  topH: number;
  color: string;
}) {
  // Build a bowl: inner profile lower (closer to field), outer higher.
  // We use a custom buffer geometry from two stacked rings.
  const geom = useMemo(() => {
    const segments = 96;
    const positions: number[] = [];
    const indices: number[] = [];

    const ring = (radius: number, height: number) => {
      const start = positions.length / 3;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(t) * radius * 1.45, height, Math.sin(t) * radius);
      }
      return start;
    };

    const a = ring(innerR, bottomH);     // inner low
    const b = ring(outerR, topH);        // outer top
    const c = ring(outerR * 0.99, topH); // outer top (rim)
    const d = ring(outerR * 1.0, 0);     // outer ground
    const e = ring(innerR * 1.0, 0);     // inner ground

    const quad = (s1: number, s2: number) => {
      for (let i = 0; i < segments; i++) {
        const i0 = s1 + i, i1 = s1 + i + 1, i2 = s2 + i + 1, i3 = s2 + i;
        indices.push(i0, i1, i2, i0, i2, i3);
      }
    };
    quad(a, b);   // slope of seating
    quad(b, c);   // top edge
    quad(c, d);   // outer wall
    quad(e, a);   // inner wall (around pitch)

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [innerR, outerR, bottomH, topH]);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

// Vertical metal louvers around the outside (like MetLife's silver fins).
function LouverFacade({
  radius,
  height,
  count,
  color,
}: {
  radius: number;
  height: number;
  count: number;
  color: string;
}) {
  const items = useMemo(() => {
    const arr: Array<{ x: number; z: number; ry: number }> = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      arr.push({
        x: Math.cos(t) * radius * 1.45,
        z: Math.sin(t) * radius,
        ry: -t + Math.PI / 2,
      });
    }
    return arr;
  }, [radius, count]);

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={[it.x, height / 2, it.z]}
          rotation={[0, it.ry, 0]}
          castShadow
        >
          <boxGeometry args={[0.18, height, 0.06]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Bowl of seats (inner slope, alternating row colors).
function SeatTiers({
  innerR,
  outerR,
  bottomH,
  topH,
}: {
  innerR: number;
  outerR: number;
  bottomH: number;
  topH: number;
}) {
  // We approximate the slope by stacking thin annuli.
  const rows = 14;
  const meshes: JSX.Element[] = [];
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const r = innerR + (outerR - innerR) * t;
    const h = bottomH + (topH - bottomH) * t;
    const c = i % 2 === 0 ? "#1d2a44" : "#243756";
    meshes.push(
      <mesh
        key={i}
        position={[0, h, 0]}
        scale={[1.45, 1, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[r - 0.06, r + 0.06, 96]} />
        <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.85} />
      </mesh>,
    );
  }
  return <>{meshes}</>;
}

// Roof ring (always present) — thick torus.
function RoofRing({
  radius,
  thickness,
  color,
}: {
  radius: number;
  thickness: number;
  color: string;
}) {
  const geom = useMemo(() => {
    const g = new THREE.TorusGeometry(radius, thickness, 12, 96);
    g.scale(1.45, 1, 1);
    return g;
  }, [radius, thickness]);

  return (
    <mesh geometry={geom} position={[0, 4.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

// Closed dome roof — petal panels covering the top.
function ClosedDome({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  return (
    <group position={[0, 4.85, 0]} scale={[1.45, 1, 1]}>
      <mesh castShadow>
        <sphereGeometry args={[radius * 0.98, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        <meshStandardMaterial
          color={color}
          metalness={0.5}
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Subtle panel lines */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(t) * radius * 0.7, 0.5, Math.sin(t) * radius * 0.7]}
            rotation={[0, -t, 0]}
          >
            <boxGeometry args={[radius * 1.4, 0.04, 0.04]} />
            <meshStandardMaterial color="#0e1726" />
          </mesh>
        );
      })}
    </group>
  );
}

// LED scoreboards on the short sides.
function Scoreboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.4, 1.2, 0.15]} />
        <meshStandardMaterial
          color="#000"
          emissive="#ff8a00"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

function FloodLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
        <meshStandardMaterial color="#74829c" />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.25]} />
        <meshStandardMaterial color="#ffffff" emissive="#fffbe6" emissiveIntensity={1.0} />
      </mesh>
      <pointLight position={[0, 3.2, 0]} intensity={4} distance={22} color="#fffbe6" />
    </group>
  );
}

function Pitch() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#2e7f37" roughness={0.92} />
      </mesh>
      {/* mowed stripes */}
      {[-3, -1, 1, 3].map((x) => (
        <mesh
          key={x}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.005, 0]}
        >
          <planeGeometry args={[1, 8]} />
          <meshStandardMaterial color="#2a7232" roughness={0.95} transparent opacity={0.45} />
        </mesh>
      ))}
      {/* outline */}
      {[
        [0, 4, 12, 0.05],
        [0, -4, 12, 0.05],
        [6, 0, 0.05, 8],
        [-6, 0, 0.05, 8],
      ].map(([x, z, w, h], i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x as number, 0.015, z as number]}
        >
          <planeGeometry args={[w as number, h as number]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.78, 0.84, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* halfway line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[0.05, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[34, 64]} />
      <meshStandardMaterial color="#161b2b" roughness={1} />
    </mesh>
  );
}

/* ---------- Scene ---------------------------------------------- */

function Scene({ matchId }: { matchId: string }) {
  const seed = hashSeed(matchId);
  const rng = useMemo(() => seededRng(seed), [seed]);

  const closed = seed > 0.55;
  const louverColor = rng() > 0.5 ? "#c7d0dc" : "#9aa6bf";
  const bowlColor = rng() > 0.5 ? "#39434d" : "#2c3540";
  const ringColor = closed ? "#e6e8eb" : "#d4d7dc";
  const domeColor = "#dfe3eb";

  const innerR = 6.5;
  const outerR = 9.8;
  const louverCount = 56;

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.07;
  });

  return (
    <group ref={groupRef}>
      <Ground />
      <Pitch />
      <SeatTiers innerR={innerR} outerR={outerR - 0.1} bottomH={0.4} topH={3.3} />
      <OuterBowl
        innerR={innerR}
        outerR={outerR}
        bottomH={0.3}
        topH={3.8}
        color={bowlColor}
      />
      <LouverFacade radius={outerR + 0.15} height={3.7} count={louverCount} color={louverColor} />
      <RoofRing radius={outerR + 0.4} thickness={0.45} color={ringColor} />
      {closed && <ClosedDome radius={outerR + 0.3} color={domeColor} />}
      <Scoreboard position={[outerR * 1.4 + 0.3, 2.4, 0]} />
      <Scoreboard position={[-(outerR * 1.4 + 0.3), 2.4, 0]} />
      {!closed && (
        <>
          <FloodLight position={[outerR * 1.45, 0, outerR + 0.2]} />
          <FloodLight position={[-outerR * 1.45, 0, outerR + 0.2]} />
          <FloodLight position={[outerR * 1.45, 0, -outerR - 0.2]} />
          <FloodLight position={[-outerR * 1.45, 0, -outerR - 0.2]} />
        </>
      )}
    </group>
  );
}

export default function StadiumModel3D({ matchId, venueName }: StadiumModel3DProps) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      <Canvas
        camera={{ position: [22, 12, 22], fov: 36 }}
        shadows
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#9bb2d4", "#1a1d2a", 0.55]} />
          <directionalLight
            position={[18, 22, 12]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <fog attach="fog" args={["#1b2236", 35, 75]} />
          <Scene matchId={matchId} />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={18}
            maxDistance={40}
            minPolarAngle={Math.PI / 7}
            maxPolarAngle={Math.PI / 2.3}
          />
        </Suspense>
      </Canvas>
      {venueName && (
        <div className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-md bg-black/55 text-white backdrop-blur-sm font-medium">
          📍 {venueName}
        </div>
      )}
      <div className="absolute bottom-3 right-3 text-[10px] text-white/70 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
        Sleep om te draaien · scroll om te zoomen
      </div>
    </div>
  );
}
