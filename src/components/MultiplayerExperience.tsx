import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { Physics } from "@react-three/rapier";
import { ContactShadows } from "@react-three/drei";
import { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import { RemoteZombie } from "./Zombies/RemoteZombie";
import { TestZomMap } from "./TestZomMap";
import { useStore } from "../store";
import { useSocket } from "../hooks/useSocket";

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

export const MultiplayerExperience = () => {
    const { remotePlayers, gamePhase, myId, isHost, battleRoomId, zombies, maxPlayers } = useStore();
    const { joinRoom, broadcast } = useSocket();
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if ((gamePhase === 'playing' || gamePhase === 'lobby') && battleRoomId) {
            // Wait for WebSocket connection to establish before joining
            joinRoom(battleRoomId.toString(), myId, isHost ? { maxPlayers: maxPlayers } : undefined);

            if (gamePhase === 'lobby') {
                // Heartbeat to make sure other players see us in the lobby
                const interval = setInterval(() => {
                    broadcast([1000, 1000, 1000], [0, 0, 0, 1]); // Placed far away so no visual ghosting
                }, 1000);
                return () => clearInterval(interval);
            }
        }
    }, [gamePhase, battleRoomId, myId, isHost, joinRoom, maxPlayers, broadcast]);

    // Render nothing during intro, but render during lobby & playing
    if (gamePhase === "intro") return null;

    return (
        <>
        <TestAtmosphere />
        <Physics gravity={[0, -20, 0]} interpolate>
            <TestZomMap />
            
            <Character groupRef={groupRef as any} />
            
            {/* Render Remote Players */}
            {Object.values(remotePlayers).map((player) => (
                <RemotePlayer key={player.id} state={player} />
            ))}

            {/* Only the Host runs the Zombie Spawner AI, and ONLY during playing phase */}
            {isHost && battleRoomId && gamePhase === 'playing' && (
                <ZombieSpawner playerRef={groupRef as any} maxConcurrent={15} spawnIntervalMs={3000} />
            )}

            {/* Guests render RemoteZombies based on store */}
            {!isHost && Object.entries(zombies).map(([id, zData]) => (
                <RemoteZombie key={id} id={id} data={zData} />
            ))}
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
