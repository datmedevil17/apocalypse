import { useEffect, useState, useRef } from "react";
import { Zombie } from "./Zombie";
import * as THREE from "three";
import { useStore } from "../../store";

import { useSocket } from "../../hooks/useSocket";

export const ZombieSpawner = ({
    playerRef,
    maxConcurrent = 50,
    spawnIntervalMs = 1500,
}: {
    playerRef: React.RefObject<THREE.Group>;
    maxConcurrent?: number;
    spawnIntervalMs?: number;
}) => {
    const gamePhase = useStore(state => state.gamePhase);
    const [zombies, setZombies] = useState<{ id: string, pos: [number, number, number] }[]>([]);
    const { broadcastZombies } = useSocket();
    const activeZombiesRef = useRef<Record<string, {pos: [number,number,number], state: string}>>({});

    useEffect(() => {
        // Initial spawn of 20 zombies to populate the map quickly
        const initialZombies = Array.from({ length: 20 }).map(() => {
            const mapSize = 100;
            let x, z;
            do {
                x = (Math.random() - 0.5) * mapSize;
                z = (Math.random() - 0.5) * mapSize;
            } while (Math.abs(x) < 20 && Math.abs(z) < 20); // Safe zone radius
            return {
                id: Math.random().toString(36).substring(7),
                pos: [x, 5, z] as [number, number, number]
            };
        });
        setZombies(initialZombies);
    }, []);

    // Spawn a new zombie every 2 seconds if under cap and playing
    useEffect(() => {
        if (gamePhase !== 'playing') return;
        
        const interval = setInterval(() => {
            setZombies(current => {
                if (current.length >= maxConcurrent) return current;
                
                const mapSize = 100;
                let x, z;
                // Don't spawn perfectly at 0,0
                do {
                    x = (Math.random() - 0.5) * mapSize;
                    z = (Math.random() - 0.5) * mapSize;
                } while (Math.abs(x) < 22 && Math.abs(z) < 22);
                
                const newZombie = {
                    id: Math.random().toString(36).substring(7),
                    pos: [x, 5, z] as [number, number, number]
                };
                return [...current, newZombie];
            });
        }, spawnIntervalMs);

        return () => clearInterval(interval);
    }, [gamePhase, maxConcurrent, spawnIntervalMs]);

    // Fast sync interval for positions
    useEffect(() => {
        const interval = setInterval(() => {
            const updates = Object.entries(activeZombiesRef.current).map(([id, data]) => ({
                id, pos: data.pos, state: data.state
            }));
            if (updates.length > 0) {
                broadcastZombies('zombie_update', { updates });
            }
        }, 150); // 150ms sync
        return () => clearInterval(interval);
    }, [broadcastZombies]);

    // Full sync interval (catch up late joiners)
    useEffect(() => {
        const interval = setInterval(() => {
            broadcastZombies('zombie_sync', { zombies: activeZombiesRef.current });
        }, 3000);
        return () => clearInterval(interval);
    }, [broadcastZombies]);

    const handleDespawn = (id: string) => {
        setZombies(current => current.filter(z => z.id !== id));
        delete activeZombiesRef.current[id];
        broadcastZombies('zombie_status', { id, status: 'despawn' });
    };

    return (
        <group>
            {zombies.map((z) => (
                <Zombie 
                    key={z.id} 
                    id={z.id}
                    position={z.pos} 
                    playerRef={playerRef} 
                    activeZombiesRef={activeZombiesRef}
                    onDespawn={() => handleDespawn(z.id)}
                />
            ))}
        </group>
    );
};
