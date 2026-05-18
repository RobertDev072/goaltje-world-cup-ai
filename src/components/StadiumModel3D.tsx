import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

/**
 * Stylized procedural stadium. Not a fotorealistic replica of any specific
 * venue — the geometry is generated from a seed (the match id) so each
 * match gets a slightly different look (capacity, dome color, roof span).
 */

interface StadiumModel3DProps {
  matchId: string;
  venueName?: string | null;
}

// Cheap deterministic seeded RNG so each match gets a stable look.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function Pitch() {
  return (
    <group position={[0, 0.01, 0]}>
      {/* grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#2f8a3d" roughness={0.95} metalness={0} />
      </mesh>
      {/* center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.06, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.85, 0.92, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* center spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* outer field outline */}
      {[
        [0, 0, 4, 12, 0.06],   // top
        [0, 0, -4, 12, 0.06],  // bottom
        [6, 0, 0, 0.06, 8],    // right
        [-6, 0, 0, 0.06, 8],   // left
      ].map(([x, , z, w, h], i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x as number, 0.01, z as number]}
        >
          <planeGeometry args={[w as number, h as number]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* penalty areas */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * 5.1, 0.015, 0]}
        >
          <ringGeometry args={[0, 0.001, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

interface TribuneProps {
  rotation: number;
  width: number;
  segments: number;
  color: string;
}

function Tribune({ rotation, width, segments, color }: TribuneProps) {
  const group = useRef<THREE.Group>(null);

  // Build a sloped stand: stack of boxes
  const tiers = useMemo(() => {
    const arr: Array<{ y: number; z: number; w: number; h: number; d: number }> = [];
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      arr.push({
        y: 0.4 + i * 0.35,
        z: 5.4 + i * 0.45,
        w: width,
        h: 0.32,
        d: 0.55,
      });
    }
    return arr;
  }, [width]);

  return (
    <group ref={group} rotation={[0, rotation, 0]}>
      {tiers.map((t, i) => (
        <mesh key={i} position={[0, t.y, t.z]} castShadow receiveShadow>
          <boxGeometry args={[t.w, t.h, t.d]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      {/* segment "seats" — small bumps along the top */}
      {Array.from({ length: segments }).map((_, i) => {
        const x = -width / 2 + (i + 0.5) * (width / segments);
        return (
          <mesh key={i} position={[x, 2.45, 7.6]} castShadow>
            <boxGeometry args={[width / segments - 0.05, 0.12, 0.3]} />
            <meshStandardMaterial color="#1b2742" roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function RoofRing({ color }: { color: string }) {
  return (
    <mesh position={[0, 4.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[8.4, 0.18, 8, 64]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
    </mesh>
  );
}

function FloodLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 5, 8]} />
        <meshStandardMaterial color="#9aa6bf" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[0.7, 0.35, 0.2]} />
        <meshStandardMaterial color="#ffffff" emissive="#fffbe6" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0, 2.6, 0]} intensity={6} distance={18} color="#fffbe6" />
    </group>
  );
}

function Scene({ matchId }: { matchId: string }) {
  const seed = hashSeed(matchId);
  const segments = 14 + Math.floor(seed * 10);
  const tribuneColor = seed > 0.66 ? "#243450" : seed > 0.33 ? "#3a2a55" : "#1f3a5c";
  const roofColor = seed > 0.5 ? "#cbd5e1" : "#94a3b8";

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      <Pitch />
      <Tribune rotation={0}             width={14} segments={segments} color={tribuneColor} />
      <Tribune rotation={Math.PI}       width={14} segments={segments} color={tribuneColor} />
      <Tribune rotation={Math.PI / 2}   width={10} segments={Math.round(segments * 0.7)} color={tribuneColor} />
      <Tribune rotation={-Math.PI / 2}  width={10} segments={Math.round(segments * 0.7)} color={tribuneColor} />
      <RoofRing color={roofColor} />
      <FloodLight position={[8, 0, 8]} />
      <FloodLight position={[-8, 0, 8]} />
      <FloodLight position={[8, 0, -8]} />
      <FloodLight position={[-8, 0, -8]} />
    </group>
  );
}

export default function StadiumModel3D({ matchId, venueName }: StadiumModel3DProps) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-sky-200 to-sky-50 dark:from-slate-900 dark:to-slate-800">
      <Canvas
        camera={{ position: [14, 8, 14], fov: 38 }}
        shadows
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <Environment preset="city" />
          <Scene matchId={matchId} />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={12}
            maxDistance={28}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>
      {venueName && (
        <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-md bg-black/40 text-white backdrop-blur-sm">
          📍 {venueName}
        </div>
      )}
      <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/80 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm">
        Sleep om te draaien · scroll om te zoomen
      </div>
    </div>
  );
}
