import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════
   ATMOSPHERE EFFECTS — Night Zombie Arena
   - Flickering fire point-lights (near burned cars / barrels)
   - Rising smoke columns from wrecks
   - Floating dust / ash particles
   - Ember sparkles
   ═══════════════════════════════════════════════════ */

/* ─── Pre-computed random seeds (module-level, avoids render purity issues) ─── */

const FIRE_SEEDS = [271, 842, 153, 694, 537, 321, 765, 198, 456, 623, 887, 112, 549];

interface SmokeParticle {
    offset: [number, number, number];
    speed: number;
    baseScale: number;
    rotSpeed: number;
    key: number;
}

/** Deterministic pseudo-random from seed */
const seeded = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
};

/** Pre-compute smoke particle data for each smoke source */
const SMOKE_PARTICLE_DATA: SmokeParticle[][] = Array.from({ length: 14 }, (_, srcIdx) =>
    Array.from({ length: 6 }, (_, i) => {
        const s = srcIdx * 100 + i;
        return {
            offset: [
                (seeded(s) - 0.5) * 1.5,
                seeded(s + 10) * 3,
                (seeded(s + 20) - 0.5) * 1.5,
            ] as [number, number, number],
            speed: 0.15 + seeded(s + 30) * 0.25,
            baseScale: 0.8 + seeded(s + 40) * 1.2,
            rotSpeed: (seeded(s + 50) - 0.5) * 0.4,
            key: i,
        };
    })
);

/* ─── Flickering Fire Point Light ─── */

const FireLight = ({
    position,
    intensity = 2,
    color = "#ff6600",
    seed = 0,
}: {
    position: [number, number, number];
    intensity?: number;
    color?: string;
    seed?: number;
}) => {
    const ref = useRef<THREE.PointLight>(null!);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.elapsedTime + seed;
        ref.current.intensity =
            intensity +
            Math.sin(t * 8) * 0.4 +
            Math.sin(t * 13) * 0.2 +
            Math.sin(t * 21) * 0.1;
    });

    return (
        <pointLight
            ref={ref}
            position={position}
            color={color}
            intensity={intensity}
            distance={18}
            decay={2}
        />
    );
};

/* ─── Rising Smoke Column ─── */

const SmokeColumn = ({
    position,
    particles,
}: {
    position: [number, number, number];
    particles: SmokeParticle[];
}) => {
    const groupRef = useRef<THREE.Group>(null!);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const meshes = groupRef.current.children as THREE.Mesh[];
        meshes.forEach((mesh, i) => {
            const p = particles[i];
            if (!p || !mesh.isMesh) return;

            mesh.position.y += p.speed * delta;
            mesh.rotation.z += p.rotSpeed * delta;

            const mat = mesh.material as THREE.MeshBasicMaterial;
            const height = mesh.position.y - p.offset[1];
            if (height > 5) {
                mesh.position.y = p.offset[1];
                mat.opacity = 0.1;
            } else {
                mat.opacity = Math.max(0, 0.1 - height * 0.018);
            }
        });
    });

    return (
        <group ref={groupRef} position={position}>
            {particles.map((p) => (
                <mesh key={p.key} position={p.offset}>
                    <planeGeometry args={[p.baseScale, p.baseScale]} />
                    <meshBasicMaterial
                        color="#444"
                        transparent
                        opacity={0.1}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

/* ─── Fire & Smoke source positions (match Map.tsx warzone layout) ─── */

const G = 40; // grid spacing — must match Map.tsx

const FIRE_SOURCES: {
    pos: [number, number, number];
    intensity: number;
    color: string;
}[] = [
    // Center killzone — crashed vehicles
    { pos: [5, 1.5, -3], intensity: 2.5, color: "#ff5500" },
    { pos: [-6, 1.5, 5], intensity: 2.0, color: "#ff6600" },
    // Center barrel cluster
    { pos: [3.3, 1, 7.5], intensity: 1.4, color: "#ff7700" },
    // North checkpoint — wrecked pickup
    { pos: [-8, 1.5, -G - 5], intensity: 1.8, color: "#ff4400" },
    // East gauntlet — truck ablaze
    { pos: [G - 12, 1.5, 2], intensity: 2.2, color: "#ff5500" },
    // South horde breach — barrel fire
    { pos: [-5.5, 1, G + 1.5], intensity: 1.5, color: "#ff7700" },
    // SE corner "The Furnace" — barrel cluster inferno
    { pos: [G + 8.5, 1.5, G - 2.5], intensity: 3.0, color: "#ff4400" },
    // SE vehicle fires
    { pos: [G + 4, 1.5, G + 2], intensity: 2.0, color: "#ff5500" },
    { pos: [G - 6, 1.5, G + 6], intensity: 1.6, color: "#ff6600" },
    // SW — crashed vehicles
    { pos: [-G - 3, 1.5, G + 4], intensity: 1.5, color: "#ff5500" },
    // West supply depot — barrel row
    { pos: [-G + 8.5, 1, 5.5], intensity: 1.2, color: "#ff7700" },
    // NW — abandoned camp barrel
    { pos: [-G - 5, 1, -G - 2], intensity: 1.0, color: "#ff6600" },
    // NE — distant glow
    { pos: [G + 3, 1, -G - 3], intensity: 1.0, color: "#ff4400" },
];

const SMOKE_SOURCES: [number, number, number][] = [
    // Wrecked vehicles — heavy smoke
    [5, 0.5, -3],          // center truck
    [-6, 0.5, 5],          // center sports car
    [G - 12, 0.5, 2],     // east gauntlet truck
    [G + 4, 0.5, G + 2],  // SE furnace truck
    [-G - 3, 0.5, G + 4], // SW crash
    [-8, 0.5, -G - 5],    // north checkpoint pickup
    [G - 6, 0.5, G + 6],  // SE pickup
    // Corner smoke — haze drifting at grid corners
    [-G - 5, 0.3, -G - 2],  // NW corner — abandoned camp barrel
    [G + 3, 0.3, -G - 3],   // NE corner — container stack
    [-G + 5, 0.3, G - 4],   // SW corner — crashed pickup
    [G + 8, 0.3, G - 3],    // SE corner — barrel cluster
    // Intersection haze — low ground fog at key crossroads
    [0, 0.2, -G],            // north intersection
    [0, 0.2, G],             // south intersection
    [3, 0.2, 7.5],           // center barrel cluster
];

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */

export const AtmosphereEffects = () => {
    return (
        <>
            {/* ── Floating ash / dust — thicker, more oppressive ── */}
            <Sparkles
                count={250}
                scale={[120, 15, 120]}
                size={1.2}
                speed={0.12}
                color="#886655"
                opacity={0.25}
            />

            {/* ── Blood-red embers drifting upward — center ── */}
            <Sparkles
                count={50}
                scale={[35, 10, 35]}
                size={0.7}
                speed={0.5}
                color="#cc2200"
                opacity={0.4}
                position={[0, 2, 0]}
            />

            {/* ── Embers — SE furnace zone (intense) ── */}
            <Sparkles
                count={45}
                scale={[24, 8, 24]}
                size={0.9}
                speed={0.7}
                color="#ff3311"
                opacity={0.5}
                position={[G, 3, G]}
            />

            {/* ── Embers — scattered across grid ── */}
            <Sparkles
                count={30}
                scale={[90, 8, 90]}
                size={0.5}
                speed={0.3}
                color="#ff6622"
                opacity={0.3}
                position={[0, 4, 0]}
            />

            {/* ── Sickly green spore particles — NW abandoned camp ── */}
            <Sparkles
                count={20}
                scale={[14, 5, 14]}
                size={0.5}
                speed={0.15}
                color="#33aa44"
                opacity={0.2}
                position={[-G, 2, -G]}
            />

            {/* ── Corner smoke haze — NW (greenish tint) ── */}
            <Sparkles
                count={35}
                scale={[20, 5, 20]}
                size={2.2}
                speed={0.06}
                color="#3a4a3a"
                opacity={0.15}
                position={[-G, 1.5, -G]}
            />

            {/* ── Corner smoke haze — NE (cold, blue-gray) ── */}
            <Sparkles
                count={35}
                scale={[20, 5, 20]}
                size={2.2}
                speed={0.06}
                color="#3a3a4a"
                opacity={0.15}
                position={[G, 1.5, -G]}
            />

            {/* ── Corner smoke haze — SW (dark, heavy) ── */}
            <Sparkles
                count={30}
                scale={[18, 5, 18]}
                size={2}
                speed={0.08}
                color="#4a3a3a"
                opacity={0.14}
                position={[-G, 1.5, G]}
            />

            {/* ── Corner smoke haze — SE "The Furnace" (thick red-brown) ── */}
            <Sparkles
                count={55}
                scale={[26, 7, 26]}
                size={2.8}
                speed={0.1}
                color="#553322"
                opacity={0.22}
                position={[G, 2, G]}
            />

            {/* ── Mid-road ground fog — N/S corridor ── */}
            <Sparkles
                count={40}
                scale={[12, 2, 90]}
                size={2.5}
                speed={0.04}
                color="#333333"
                opacity={0.1}
                position={[0, 0.4, 0]}
            />

            {/* ── Mid-road ground fog — E/W corridor ── */}
            <Sparkles
                count={40}
                scale={[90, 2, 12]}
                size={2.5}
                speed={0.04}
                color="#333333"
                opacity={0.1}
                position={[0, 0.4, 0]}
            />

            {/* ── Low crawling fog across entire arena ── */}
            <Sparkles
                count={80}
                scale={[110, 1.5, 110]}
                size={3}
                speed={0.03}
                color="#1a1a1a"
                opacity={0.08}
                position={[0, 0.2, 0]}
            />

            {/* ── Fire lights (flicker) ── */}
            {FIRE_SOURCES.map((f, i) => (
                <FireLight
                    key={`fire-${i}`}
                    position={f.pos}
                    intensity={f.intensity}
                    color={f.color}
                    seed={FIRE_SEEDS[i]}
                />
            ))}

            {/* ── Smoke columns rising from wrecked vehicles ── */}
            {SMOKE_SOURCES.map((pos, i) => (
                <SmokeColumn key={`smoke-${i}`} position={pos} particles={SMOKE_PARTICLE_DATA[i]} />
            ))}
        </>
    );
};
