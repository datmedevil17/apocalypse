import { Environment, Sky, ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import { Map } from "./Map";
import { Character } from "./Character";
import { Pet } from "./Pet";
import { Multiplayer } from "./Multiplayer";
import { useStore } from "../store";
import * as THREE from 'three';

export const Experience = () => {
    const timeOfDay = useStore((state) => state.timeOfDay);
    const playerRef = useRef<THREE.Group>(null!);

    // 0.0: Dawn, 0.25: Noon, 0.5: Dusk, 0.75: Midnight
    const angle = (timeOfDay - 0.25) * Math.PI * 2;
    const sunPosition: [number, number, number] = [
        Math.cos(angle) * 100,
        Math.sin(angle) * 100,
        100
    ];

    // Smooth intensity curves
    const intensityFactor = (Math.sin(angle + Math.PI / 2) + 1) / 2;
    const lightIntensity = intensityFactor * 1.5;
    const ambientIntensity = intensityFactor * 0.4 + 0.1;

    // Dynamic Fog Color
    const morningColor = new THREE.Color("#ffb347"); // Golden dawn
    const noonColor = new THREE.Color("#ffffff");    // Bright day
    const nightColor = new THREE.Color("#050510");   // Deep night

    let fogColor = new THREE.Color();
    if (timeOfDay < 0.25) {
        fogColor.lerpColors(morningColor, noonColor, timeOfDay / 0.25);
    } else if (timeOfDay < 0.5) {
        fogColor.lerpColors(noonColor, morningColor, (timeOfDay - 0.25) / 0.25);
    } else {
        fogColor.lerpColors(morningColor, nightColor, (timeOfDay - 0.5) / 0.5);
    }

    return (
        <>
            <Sky sunPosition={sunPosition} />
            <fog attach="fog" args={[fogColor as any, 10, 50]} />
            <Environment preset="city" environmentIntensity={intensityFactor} />

            <ambientLight intensity={ambientIntensity} />
            <directionalLight
                position={sunPosition}
                intensity={lightIntensity}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />

            <Physics debug={false} interpolate>
                <Map />
                <Character groupRef={playerRef} />
                <Pet playerRef={playerRef} />
                <Multiplayer />
            </Physics>

            <ContactShadows
                opacity={0.4 * intensityFactor + 0.1}
                scale={10}
                blur={2.4}
                far={10}
                resolution={256}
                color="#000000"
            />
        </>
    );
};
