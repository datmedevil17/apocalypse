import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { Physics } from "@react-three/rapier";
import { ContactShadows } from "@react-three/drei";
import { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import { RemoteZombie } from "./Zombies/RemoteZombie";
import { Map } from "./Map";
import { useStore } from "../store";
import { useSocket } from "../hooks/useSocket";
import { AtmosphereSystem, DreadPulse, AccentLights } from "./Experience";
import { AtmosphereEffects } from "./AtmosphereEffects";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

export const MultiplayerExperience = () => {
    const { remotePlayers, gamePhase, myId, isHost, battleRoomId, zombies, maxPlayers } = useStore();
    const { joinRoom, broadcast } = useSocket();
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if ((gamePhase === 'playing' || gamePhase === 'lobby') && battleRoomId) {
            // Wait for WebSocket connection to establish before joining
            joinRoom(battleRoomId.toString(), myId, isHost ? { maxPlayers: maxPlayers } : undefined);

            // Heartbeat to make sure other players see us
            // In 'lobby' phase, we send dummy positions
            // In 'playing' phase, the Character component handles broadcasting actual positions
            const interval = setInterval(() => {
                if (gamePhase === 'lobby') {
                    broadcast([1000, 1000, 1000], [0, 0, 0, 1]); 
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gamePhase, battleRoomId, myId, isHost, joinRoom, maxPlayers, broadcast]);

    // Render nothing during intro, but render during lobby & playing
    if (gamePhase === "intro") return null;

    return (
        <>
        <AtmosphereSystem />
        <DreadPulse />
        <AccentLights />

        {/* ── Atmosphere (fire lights, smoke, dust, embers) ── */}
        <AtmosphereEffects />

        <Physics gravity={[0, -20, 0]} interpolate>
            <Map level={3} />
            
            <Character groupRef={groupRef as any} />
            
            {/* Render Remote Players */}
            {Object.values(remotePlayers).map((player, idx) => (
                <RemotePlayer key={player.id || idx} state={player} />
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
            opacity={0.95}
            scale={60}
            blur={2.5}
            far={18}
            resolution={512}
            color="#000008"
        />

        {/* ── Post-processing: horror grading ── */}
        <EffectComposer>
            {/* Bloom makes fire glow bleed outward — eerie halos */}
            <Bloom
                intensity={0.6}
                luminanceThreshold={0.3}
                luminanceSmoothing={0.9}
                mipmapBlur
            />
            {/* Gentle vignette — subtle edge darkening */}
            <Vignette
                offset={0.4}
                darkness={0.5}
                blendFunction={BlendFunction.NORMAL}
            />
            {/* Subtle chromatic aberration — disorienting, sickly */}
            <ChromaticAberration
                offset={new THREE.Vector2(0.0008, 0.0008)}
                radialModulation={true}
                modulationOffset={0.4}
                blendFunction={BlendFunction.NORMAL}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
        </>
    );
};
