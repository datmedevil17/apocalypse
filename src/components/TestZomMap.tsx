import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

const STREET = {
    fourWay: "/environement/Street_4Way.gltf",
    straight: "/environement/Street_Straight.gltf",
    crack1: "/environement/Street_Straight_Crack1.gltf",
    crack2: "/environement/Street_Straight_Crack2.gltf",
    turn: "/environement/Street_Turn.gltf",
    tJunction: "/environement/Street_T.gltf",
};

const RoadSegment = ({
    path,
    position,
    rotation = [0, 0, 0],
    grassTexture,
    grassColor,
}: {
    path: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    grassTexture?: THREE.Texture;
    grassColor?: THREE.Color;
}) => {
    const { scene } = useGLTF(path);
    const clone = useMemo(() => scene.clone(), [scene]);
    const lifted: [number, number, number] = [position[0], position[1] + 0.02, position[2]];
    
    // Add embankments for straight street segments (including cracked variants)
    const isStraight = path.includes("Straight");
    
    // Create a local scaled texture for the small embankments
    const localGrassTex = useMemo(() => {
        if (!grassTexture) return undefined;
        const tex = grassTexture.clone();
        tex.repeat.set(1.2, 0.3); // Scale appropriately for an 8 x 2 size box
        tex.needsUpdate = true;
        return tex;
    }, [grassTexture]);

    return (
        <group position={lifted} rotation={rotation}>
            <primitive object={clone} />
            <CuboidCollider args={[4, 0.05, 4]} position={[0, -0.04, 0]} />
            
            {isStraight && (
                <>
                    {/* Left Embankment */}
                    <group position={[-5, 0.05, 0]} rotation={[0, 0, 0.07]}>
                        <mesh receiveShadow>
                            <boxGeometry args={[2.05, 0.1, 8]} />
                            <meshStandardMaterial 
                                map={localGrassTex} 
                                color={grassColor || "#2d6b2d"} 
                                roughness={0.85} 
                                envMapIntensity={0.3} 
                            />
                        </mesh>
                        <CuboidCollider args={[1.025, 0.05, 4]} />
                    </group>
                    
                    {/* Right Embankment */}
                    <group position={[5, 0.05, 0]} rotation={[0, 0, -0.07]}>
                        <mesh receiveShadow>
                            <boxGeometry args={[2.05, 0.1, 8]} />
                             <meshStandardMaterial 
                                map={localGrassTex} 
                                color={grassColor || "#2d6b2d"} 
                                roughness={0.85} 
                                envMapIntensity={0.3} 
                            />
                        </mesh>
                        <CuboidCollider args={[1.025, 0.05, 4]} />
                    </group>
                </>
            )}
        </group>
    );
};

export const TestZomMap = () => {
    const R90: [number, number, number] = [0, Math.PI / 2, 0];

    const grassTexture = useTexture("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg");
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(30, 30);

    const grassColor = new THREE.Color("#2d6b2d");

    const roads = useMemo(() => {
        const s: React.JSX.Element[] = [];
        const S = STREET;
        const G = 40; // grid spacing
        const G2 = 80; // far-east column

        // ── 9 INTERSECTIONS ──
        s.push(<RoadSegment key="CC" path={S.fourWay} position={[0, 0, 0]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="NC" path={S.fourWay} position={[0, 0, -G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="SC" path={S.fourWay} position={[0, 0, G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="CE" path={S.fourWay} position={[G, 0, 0]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="CW" path={S.fourWay} position={[-G, 0, 0]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="NE" path={S.fourWay} position={[G, 0, -G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="NW" path={S.fourWay} position={[-G, 0, -G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="SE" path={S.fourWay} position={[G, 0, G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="SW" path={S.fourWay} position={[-G, 0, G]} grassTexture={grassTexture} grassColor={grassColor} />);

        // Helper: fill straight road segments between two points
        const fillRoad = (
            prefix: string,
            x1: number, z1: number,
            x2: number, z2: number,
        ) => {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const horiz = Math.abs(dx) > Math.abs(dz);
            const dist = horiz ? Math.abs(dx) : Math.abs(dz);
            const steps = Math.round(dist / 8) - 1;
            const sx = horiz ? Math.sign(dx) : 0;
            const sz = horiz ? 0 : Math.sign(dz);

            for (let i = 1; i <= steps; i++) {
                const px = x1 + sx * i * 8;
                const pz = z1 + sz * i * 8;
                const variant = i % 5 === 0 ? S.crack1 : i % 7 === 0 ? S.crack2 : S.straight;
                s.push(
                    <RoadSegment
                        key={`${prefix}-${i}`}
                        path={variant}
                        position={[px, 0, pz]}
                        rotation={horiz ? R90 : [0, 0, 0]}
                        grassTexture={grassTexture} 
                        grassColor={grassColor}
                    />
                );
            }
        };

        fillRoad("h-nw-nc", -G, -G, 0, -G);
        fillRoad("h-nc-ne", 0, -G, G, -G);
        fillRoad("h-cw-cc", -G, 0, 0, 0);
        fillRoad("h-cc-ce", 0, 0, G, 0);
        fillRoad("h-sw-sc", -G, G, 0, G);
        fillRoad("h-sc-se", 0, G, G, G);

        fillRoad("v-nw-cw", -G, -G, -G, 0);
        fillRoad("v-cw-sw", -G, 0, -G, G);
        fillRoad("v-nc-cc", 0, -G, 0, 0);
        fillRoad("v-cc-sc", 0, 0, 0, G);
        fillRoad("v-ne-ce", G, -G, G, 0);
        fillRoad("v-ce-se", G, 0, G, G);

        for (let i = 1; i <= 4; i++) {
            const v = i % 3 === 0 ? S.crack1 : S.straight;
            s.push(<RoadSegment key={`arm-n-${i}`} path={v} position={[0, 0, -G - i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 4; i++) {
            const v = i % 4 === 0 ? S.crack2 : S.straight;
            s.push(<RoadSegment key={`arm-s-${i}`} path={v} position={[0, 0, G + i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 2; i++) {
            const v = i % 2 === 0 ? S.crack1 : S.straight;
            s.push(<RoadSegment key={`arm-e-${i}`} path={v} position={[G2 + i * 8, 0, 0]} rotation={R90} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 4; i++) {
            const v = i % 4 === 0 ? S.crack2 : S.straight;
            s.push(<RoadSegment key={`arm-w-${i}`} path={v} position={[-G - i * 8, 0, 0]} rotation={R90} grassTexture={grassTexture} grassColor={grassColor} />);
        }

        s.push(<RoadSegment key="FNE" path={S.fourWay} position={[G2, 0, -G]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="FE" path={S.fourWay} position={[G2, 0, 0]} grassTexture={grassTexture} grassColor={grassColor} />);
        s.push(<RoadSegment key="FSE" path={S.fourWay} position={[G2, 0, G]} grassTexture={grassTexture} grassColor={grassColor} />);

        fillRoad("h-ne-fne", G, -G, G2, -G);
        fillRoad("h-ce-fe", G, 0, G2, 0);
        fillRoad("h-se-fse", G, G, G2, G);

        fillRoad("v-fne-fe", G2, -G, G2, 0);
        fillRoad("v-fe-fse", G2, 0, G2, G);

        for (let i = 1; i <= 3; i++) {
            const v = i % 2 === 0 ? S.crack2 : S.straight;
            s.push(<RoadSegment key={`fne-n-${i}`} path={v} position={[G2, 0, -G - i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 3; i++) {
            const v = i % 3 === 0 ? S.crack1 : S.straight;
            s.push(<RoadSegment key={`fse-s-${i}`} path={v} position={[G2, 0, G + i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }

        for (let i = 1; i <= 2; i++) {
            s.push(<RoadSegment key={`fne-e-${i}`} path={S.crack2} position={[G2 + i * 8, 0, -G]} rotation={R90} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 2; i++) {
            s.push(<RoadSegment key={`fse-e-${i}`} path={S.crack1} position={[G2 + i * 8, 0, G]} rotation={R90} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 2; i++) {
            s.push(<RoadSegment key={`sw-s-${i}`} path={S.crack1} position={[-G, 0, G + i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 2; i++) {
            s.push(<RoadSegment key={`nw-w-${i}`} path={S.straight} position={[-G - i * 8, 0, -G]} rotation={R90} grassTexture={grassTexture} grassColor={grassColor} />);
        }
        for (let i = 1; i <= 2; i++) {
            s.push(<RoadSegment key={`se-s-${i}`} path={S.straight} position={[G, 0, G + i * 8]} grassTexture={grassTexture} grassColor={grassColor} />);
        }

        return s;
    }, [grassTexture, grassColor]);

    return (
        <>
            {/* Ground */}
            <RigidBody type="fixed" name="ground" friction={1}>
                {/* Dark dirt/mud plane underlying everything */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
                    <planeGeometry args={[300, 300]} />
                    <meshStandardMaterial color="#1a1c15" roughness={1} />
                </mesh>
                
                {/* Grass plane slightly elevated */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                    <planeGeometry args={[300, 300]} />
                    <meshStandardMaterial
                        map={grassTexture}
                        color={grassColor}
                        roughness={0.9}
                        envMapIntensity={0.2}
                    />
                </mesh>
            </RigidBody>

            {/* Roads */}
            <RigidBody type="fixed" name="roads" friction={0.5}>
                {roads}
            </RigidBody>
            
            {/* Invisible boundaries to keep things in the map */}
            <RigidBody type="fixed" name="boundary">
                <CuboidCollider args={[150, 10, 1]} position={[0, 5, -150]} />
                <CuboidCollider args={[150, 10, 1]} position={[0, 5, 150]} />
                <CuboidCollider args={[1, 10, 150]} position={[-150, 5, 0]} />
                <CuboidCollider args={[1, 10, 150]} position={[150, 5, 0]} />
            </RigidBody>
        </>
    );
};
