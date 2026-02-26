import { ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from 'three';
import { TestZomMap } from "./TestZomMap";
import { Character } from "./Character";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import { useStore, baseCharacters } from "../store";
import { Html } from "@react-three/drei";

const HUMAN_ANIMATIONS = [
    "Idle", "Walk", "Run", "Jump", "Jump_Land", 
    "Punch", "Slash", "Stab", "Wave", "Yes", 
    "No", "Duck", "HitReact", "Death", 
    "Idle_Gun", "Walk_Gun", "Run_Gun"
];

const ANIMAL_ANIMATIONS = [
    "Idle", "Idle_2", "Idle_2_HeadLow", "Walk", "Run", 
    "Attack", "Eating", "Run_Jump", "Death", 
    "HitReact_Left", "HitReact_Right"
];


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
    
    const selectedCharacter = useStore(state => state.selectedCharacter);
    const overridePlayerAnimation = useStore(state => state.overridePlayerAnimation);
    const setOverridePlayerAnimation = useStore(state => state.setOverridePlayerAnimation);

    const isAnimal = !baseCharacters.includes(selectedCharacter);
    const animations = isAnimal ? ANIMAL_ANIMATIONS : HUMAN_ANIMATIONS;

    return (
        <>
            <TestAtmosphere />

            <Physics debug={false} interpolate>
                <TestZomMap />
                <Character groupRef={playerRef} />
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

            <Html position={[-1, 2, 0]} center as="div" style={{ position: 'absolute', top: '-40vh', left: '30vw', width: '300px', pointerEvents: 'auto' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.8)',
                    padding: '15px',
                    borderRadius: '8px',
                    color: 'white',
                    fontFamily: 'monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <h3 style={{ margin: 0, textAlign: 'center', borderBottom: '1px solid #444', paddingBottom: '10px' }}>Character: {selectedCharacter}</h3>
                    
                    <button 
                        style={{
                            padding: '8px',
                            background: overridePlayerAnimation === null ? '#4CAF50' : '#333',
                            color: 'white',
                            border: '1px solid #555',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                        onClick={() => setOverridePlayerAnimation(null)}
                    >
                        [ INPUT ENABLED (Clear Override) ]
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                        {animations.map(anim => (
                            <button
                                key={anim}
                                style={{
                                    padding: '5px',
                                    background: overridePlayerAnimation === anim ? '#2196F3' : '#444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                                onClick={() => setOverridePlayerAnimation(anim)}
                            >
                                {anim}
                            </button>
                        ))}
                    </div>
                </div>
            </Html>
        </>
    );
};
