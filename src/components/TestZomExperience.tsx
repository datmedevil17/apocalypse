import { ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from 'three';
import { TestZomMap } from "./TestZomMap";
import { Character } from "./Character";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import { Pet } from "./Pet";

// Basic sunlight for the test area
const TestAtmosphere = () => {
    return (
        <>
            <color attach="background" args={["#87CEEB"]} />
            <ambientLight intensity={0.8} color="#ffffff" />
            <directionalLight
                position={[-50, 80, -30]}
                intensity={1.5}
                color="#ffffff"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
                shadow-bias={-0.0005} 
            />
        </>
    );
};

export const TestZomExperience = () => {
    const playerRef = useRef<THREE.Group>(null!);
    
    return (
        <>
            <TestAtmosphere />

            <Physics debug={false} interpolate>
                <TestZomMap />
                <Character groupRef={playerRef} />
                <Pet playerRef={playerRef} />
                <ZombieSpawner playerRef={playerRef} />
            </Physics>

            <ContactShadows
                opacity={0.8}
                scale={60}
                blur={2.5}
                far={18}
                resolution={512}
                color="#000000"
            />

        </>
    );
};
