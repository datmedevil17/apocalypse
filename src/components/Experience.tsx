import { Environment, Sky, ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import { Map } from "./Map";
import { Character } from "./Character";
import { Pet } from "./Pet";
import { Multiplayer } from "./Multiplayer";
import * as THREE from 'three';

export const Experience = ({ level = 3 }: { level?: number }) => {
    const playerRef = useRef<THREE.Group>(null!);

    // Stylized Apocalypse Lighting: Soft Dark Orange / Sunset shimmer
    const sunPosition: [number, number, number] = [100, 20, 100];
    const lightIntensity = 1.8;
    const ambientIntensity = 0.5;
    const fogColor = new THREE.Color("#4a2c10"); // Deep orange/brown dust

    return (
        <>
            <Sky
                sunPosition={sunPosition}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
                rayleigh={3}
                turbidity={10}
            />
            <fog attach="fog" args={[fogColor as any, 5, 45]} />
            <Environment preset="sunset" environmentIntensity={0.8} />

            <ambientLight intensity={ambientIntensity} color="#ffd8b1" />
            <directionalLight
                position={sunPosition}
                intensity={lightIntensity}
                color="#ff9d5c"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />

            <Physics debug={false} interpolate>
                <Map level={level} />
                <Character groupRef={playerRef} />
                <Pet playerRef={playerRef} />
                <Multiplayer />
            </Physics>

            <ContactShadows
                opacity={0.6}
                scale={10}
                blur={2.4}
                far={10}
                resolution={256}
                color="#2a1a00"
            />
        </>
    );
};
