import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { lookupStadiumProfile, type StadiumProfile } from "@/lib/stadiumProfiles";

/**
 * Modern stylized stadium. Procedural, but the proportions and
 * layering follow real WK 2026 venues (MetLife, AT&T, SoFi, BMO,
 * Azteca, Lumen Field). Structure:
 *   - elongated oval footprint (length ≈ 1.6× width)
 *   - 2 seating tiers with dark suite band in between
 *   - LED ribbon around the lower tier
 *   - vertical louver façade + glass band
 *   - oval roof opening (not a full dome) with integrated lighting
 *   - regulation pitch markings: penalty boxes, arcs, corner arcs
 */

interface StadiumModel3DProps {
  matchId: string;
  venueName?: string | null;
}

const OVAL_X = 1.6;

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

// Two seating tiers separated by a darker suite-level band, like
// most modern NFL / multi-purpose stadiums.
function TieredBowl({
  innerR,
  outerR,
  bottomH,
  midLowH,
  midHighH,
  topH,
  lowerColor,
  upperColor,
  suiteColor,
}: {
  innerR: number;
  outerR: number;
  bottomH: number;
  midLowH: number;
  midHighH: number;
  topH: number;
  lowerColor: string;
  upperColor: string;
  suiteColor: string;
}) {
  const buildRing = (positions: number[], radius: number, height: number) => {
    const segments = 96;
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      positions.push(
        Math.cos(t) * radius * OVAL_X,
        height,
        Math.sin(t) * radius,
      );
    }
    return start;
  };

  const stitch = (indices: number[], s1: number, s2: number) => {
    const segments = 96;
    for (let i = 0; i < segments; i++) {
      const i0 = s1 + i, i1 = s1 + i + 1, i2 = s2 + i + 1, i3 = s2 + i;
      indices.push(i0, i1, i2, i0, i2, i3);
    }
  };

  // Two separate meshes so each tier gets its own colour.
  const lowerGeom = useMemo(() => {
    const pos: number[] = []; const idx: number[] = [];
    const midR = innerR + (outerR - innerR) * 0.45;
    const a = buildRing(pos, innerR, bottomH);
    const b = buildRing(pos, midR, midLowH);
    const c = buildRing(pos, innerR, 0);
    stitch(idx, a, b);
    stitch(idx, c, a);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [innerR, outerR, bottomH, midLowH]);

  const upperGeom = useMemo(() => {
    const pos: number[] = []; const idx: number[] = [];
    const midR = innerR + (outerR - innerR) * 0.45;
    const a = buildRing(pos, midR, midHighH);
    const b = buildRing(pos, outerR, topH);
    const c = buildRing(pos, outerR * 0.99, topH);
    const d = buildRing(pos, outerR, 0);
    stitch(idx, a, b);
    stitch(idx, b, c);
    stitch(idx, c, d);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [innerR, outerR, midHighH, topH]);

  // Suite-level band: dark torus-like ring between the two tiers,
  // representing executive suites / club level windows.
  const suiteGeom = useMemo(() => {
    const pos: number[] = []; const idx: number[] = [];
    const midR = innerR + (outerR - innerR) * 0.45;
    const a = buildRing(pos, midR, midLowH);
    const b = buildRing(pos, midR, midHighH);
    stitch(idx, a, b);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [innerR, outerR, midLowH, midHighH]);

  return (
    <>
      <mesh geometry={lowerGeom} castShadow receiveShadow>
        <meshStandardMaterial color={lowerColor} roughness={0.75} />
      </mesh>
      <mesh geometry={suiteGeom} castShadow>
        <meshStandardMaterial
          color={suiteColor}
          roughness={0.2}
          metalness={0.6}
          envMapIntensity={0.6}
        />
      </mesh>
      <mesh geometry={upperGeom} castShadow receiveShadow>
        <meshStandardMaterial color={upperColor} roughness={0.75} />
      </mesh>
    </>
  );
}

// Discrete seat row strips per tier — gives the textured "bowl"
// effect when viewed from above.
function SeatTiers({
  innerR,
  outerR,
  bottomH,
  midLowH,
  midHighH,
  topH,
}: {
  innerR: number;
  outerR: number;
  bottomH: number;
  midLowH: number;
  midHighH: number;
  topH: number;
}) {
  const meshes: JSX.Element[] = [];
  const midR = innerR + (outerR - innerR) * 0.45;

  // lower tier — 9 rows
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const r = innerR + (midR - innerR) * t;
    const h = bottomH + (midLowH - bottomH) * t;
    const c = i % 2 === 0 ? "#1a2438" : "#243553";
    meshes.push(
      <mesh key={`l${i}`} position={[0, h, 0]} scale={[OVAL_X, 1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.06, r + 0.06, 96]} />
        <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>,
    );
  }
  // upper tier — 12 rows
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const r = midR + (outerR - midR) * t;
    const h = midHighH + (topH - midHighH) * t;
    const c = i % 2 === 0 ? "#283b5a" : "#324a73";
    meshes.push(
      <mesh key={`u${i}`} position={[0, h, 0]} scale={[OVAL_X, 1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.06, r + 0.06, 96]} />
        <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>,
    );
  }
  return <>{meshes}</>;
}

// Vertical metal louvers around the outside (like MetLife's fins).
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
        x: Math.cos(t) * radius * OVAL_X,
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
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// LED ribbon board around the front of the suite-level.
function LEDRibbon({
  radius,
  y,
  color,
}: {
  radius: number;
  y: number;
  color: string;
}) {
  const geom = useMemo(() => {
    const segments = 96;
    const pos: number[] = []; const idx: number[] = [];
    const h = 0.32;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pos.push(Math.cos(t) * radius * OVAL_X, y, Math.sin(t) * radius);
      pos.push(Math.cos(t) * radius * OVAL_X, y + h, Math.sin(t) * radius);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 3, d = i * 2 + 2;
      idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [radius, y]);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial
        color="#000"
        emissive={color}
        emissiveIntensity={1.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Roof ring — outer truss + inner oval opening with integrated lighting.
function StadiumRoof({
  radius,
  color,
  variant,
}: {
  radius: number;
  color: string;
  variant: "open" | "closed" | "dome-cable";
}) {
  const closed = variant !== "open";
  // Outer truss ring (thick torus, scaled oval)
  const trussGeom = useMemo(() => {
    const g = new THREE.TorusGeometry(radius, 0.45, 14, 96);
    g.scale(OVAL_X, 1, 1);
    return g;
  }, [radius]);

  // Roof "membrane" — annulus filling the gap to the oval opening.
  const membraneGeom = useMemo(() => {
    const segments = 96;
    const innerScale = variant === "dome-cable" ? 0.0
      : variant === "closed" ? 0.22
      : 0.55;
    const pos: number[] = []; const idx: number[] = [];
    const inner = radius * innerScale;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pos.push(Math.cos(t) * inner * OVAL_X, 0, Math.sin(t) * inner);
      pos.push(Math.cos(t) * radius * OVAL_X, 0, Math.sin(t) * radius);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 3, d = i * 2 + 2;
      idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [radius, variant]);

  // Lighting strip running along the inner edge of the membrane (integrated lights).
  const lightStrip = useMemo(() => {
    const segments = 60;
    const inner = radius * (
      variant === "dome-cable" ? 0.01
      : variant === "closed" ? 0.22
      : 0.55
    );
    const positions: Array<[number, number, number]> = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      positions.push([Math.cos(t) * inner * OVAL_X, 0, Math.sin(t) * inner]);
    }
    return positions;
  }, [radius, variant]);

  // BC Place style: tensile cable-suspended white sail rising from the truss.
  const sailGeom = useMemo(() => {
    if (variant !== "dome-cable") return null;
    const g = new THREE.SphereGeometry(radius * 0.95, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2.6);
    g.scale(OVAL_X, 0.55, 1);
    return g;
  }, [radius, variant]);

  return (
    <group position={[0, 5.0, 0]}>
      <mesh geometry={trussGeom} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh geometry={membraneGeom} castShadow>
        <meshStandardMaterial
          color={variant === "dome-cable" ? "#ffffff" : closed ? "#e6e9ef" : "#bfc6d1"}
          metalness={0.4}
          roughness={0.4}
          side={THREE.DoubleSide}
          transparent
          opacity={variant === "open" ? 0.85 : 1}
        />
      </mesh>
      {sailGeom && (
        <mesh geometry={sailGeom} castShadow>
          <meshStandardMaterial
            color="#fafbfd"
            roughness={0.55}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {lightStrip.map((p, i) => (
        <mesh key={i} position={[p[0], -0.05, p[2]]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#fff4cc"
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
      <pointLight position={[0, -0.4, 0]} intensity={1.4} distance={26} color="#fff8e0" />
    </group>
  );
}

// LED scoreboards on the short sides — tall, with bezel.
function Scoreboard({
  position, color,
}: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.8, 1.4, 0.18]} />
        <meshStandardMaterial color="#0b0d12" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[2.55, 1.2]} />
        <meshStandardMaterial color="#000" emissive={color} emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function Pitch() {
  // FIFA pitch lines: outline, halfway, centre circle + spot, penalty
  // boxes (16.5m), goal boxes (5.5m), penalty arcs, corner arcs.
  const W = 12, H = 8;
  const PEN_W = 4.0, PEN_H = 2.3;        // penalty area
  const GOAL_W = 1.6, GOAL_H = 1.05;     // goal box
  const PEN_SPOT_X = W / 2 - 2.4;

  const lineMat = <meshBasicMaterial color="#ffffff" />;
  const rectOutline = (
    cx: number, cy: number, w: number, h: number, t = 0.04,
  ): JSX.Element[] => ([
    <mesh key={`${cx},${cy},t`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.018, cy + h / 2]}>
      <planeGeometry args={[w, t]} />{lineMat}
    </mesh>,
    <mesh key={`${cx},${cy},b`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.018, cy - h / 2]}>
      <planeGeometry args={[w, t]} />{lineMat}
    </mesh>,
    <mesh key={`${cx},${cy},l`} rotation={[-Math.PI / 2, 0, 0]} position={[cx - w / 2, 0.018, cy]}>
      <planeGeometry args={[t, h]} />{lineMat}
    </mesh>,
    <mesh key={`${cx},${cy},r`} rotation={[-Math.PI / 2, 0, 0]} position={[cx + w / 2, 0.018, cy]}>
      <planeGeometry args={[t, h]} />{lineMat}
    </mesh>,
  ]);

  return (
    <group position={[0, 0.02, 0]}>
      {/* grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#2e7f37" roughness={0.92} />
      </mesh>
      {/* mowed stripes */}
      {[-3, -1, 1, 3].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0]}>
          <planeGeometry args={[1, H]} />
          <meshStandardMaterial color="#2a7232" roughness={0.95} transparent opacity={0.45} />
        </mesh>
      ))}

      {/* pitch outline */}
      {rectOutline(0, 0, W, H)}

      {/* halfway line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[0.05, H]} />{lineMat}
      </mesh>

      {/* centre circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.92, 0.97, 64]} />{lineMat}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.06, 16]} />{lineMat}
      </mesh>

      {/* penalty areas */}
      {rectOutline(W / 2 - PEN_W / 2, 0, PEN_W, PEN_H)}
      {rectOutline(-(W / 2 - PEN_W / 2), 0, PEN_W, PEN_H)}

      {/* goal areas */}
      {rectOutline(W / 2 - GOAL_W / 2, 0, GOAL_W, GOAL_H)}
      {rectOutline(-(W / 2 - GOAL_W / 2), 0, GOAL_W, GOAL_H)}

      {/* penalty spots */}
      {[PEN_SPOT_X, -PEN_SPOT_X].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, 0]}>
          <circleGeometry args={[0.05, 12]} />{lineMat}
        </mesh>
      ))}

      {/* corner arcs */}
      {[
        [W / 2, H / 2, Math.PI],
        [-W / 2, H / 2, -Math.PI / 2],
        [W / 2, -H / 2, Math.PI / 2],
        [-W / 2, -H / 2, 0],
      ].map(([x, z, rot], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, rot as number]} position={[x as number, 0.022, z as number]}>
          <ringGeometry args={[0.18, 0.22, 16, 1, 0, Math.PI / 2]} />{lineMat}
        </mesh>
      ))}

      {/* goals */}
      {[W / 2 + 0.18, -(W / 2 + 0.18)].map((x, i) => (
        <group key={i} position={[x, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.8, 1.6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.04, 0.04, 1.6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[40, 64]} />
      <meshStandardMaterial color="#161b2b" roughness={1} />
    </mesh>
  );
}

/* ---------- Scene ---------------------------------------------- */

function Scene({ profile }: { profile: StadiumProfile }) {
  const roofVariant: "open" | "closed" | "dome-cable" =
    profile.roof === "open" ? "open"
    : profile.roof === "dome-cable" ? "dome-cable"
    : "closed";

  const innerR = 6.5;
  const outerR = 9.8;
  const louverCount = 64;

  // Tier heights — discrete, with the suite band acting as the
  // dark glass strip between lower and upper tier.
  const bottomH  = 0.4;
  const midLowH  = 1.9;
  const midHighH = 2.5;
  const topH     = 4.1;

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      <Ground />
      <Pitch />
      <SeatTiers
        innerR={innerR}
        outerR={outerR - 0.1}
        bottomH={bottomH}
        midLowH={midLowH}
        midHighH={midHighH}
        topH={topH}
      />
      <TieredBowl
        innerR={innerR}
        outerR={outerR}
        bottomH={bottomH - 0.1}
        midLowH={midLowH}
        midHighH={midHighH}
        topH={topH}
        lowerColor={profile.exteriorColor}
        upperColor={profile.accentColor}
        suiteColor={profile.suiteColor}
      />
      <LEDRibbon
        radius={innerR + (outerR - innerR) * 0.45 - 0.01}
        y={midLowH}
        color={profile.ribbonColor}
      />
      <LouverFacade
        radius={outerR + 0.15}
        height={topH - 0.1}
        count={louverCount}
        color={profile.louverColor}
      />
      <StadiumRoof
        radius={outerR + 0.4}
        color={profile.roofColor}
        variant={roofVariant}
      />
      <Scoreboard
        position={[outerR * OVAL_X + 0.3, 2.6, 0]}
        color={profile.scoreboardColor}
      />
      <Scoreboard
        position={[-(outerR * OVAL_X + 0.3), 2.6, 0]}
        color={profile.scoreboardColor}
      />
    </group>
  );
}

export default function StadiumModel3D({ matchId, venueName }: StadiumModel3DProps) {
  const profile = useMemo(() => lookupStadiumProfile(venueName), [venueName]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      <Canvas
        camera={{ position: [26, 14, 24], fov: 34 }}
        shadows
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#9bb2d4", "#1a1d2a", 0.55]} />
          <directionalLight
            position={[22, 26, 14]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
          <fog attach="fog" args={["#1b2236", 40, 85]} />
          <Scene profile={profile} key={`${profile.key}-${matchId}`} />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={20}
            maxDistance={48}
            minPolarAngle={Math.PI / 7}
            maxPolarAngle={Math.PI / 2.3}
          />
        </Suspense>
      </Canvas>
      <div className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-md bg-black/55 text-white backdrop-blur-sm font-medium">
        📍 {venueName || profile.name}
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-white/70 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
        Sleep om te draaien · scroll om te zoomen
      </div>
    </div>
  );
}
