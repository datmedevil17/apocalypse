import { useEffect, useState } from "react";
import { Zombie } from "./Zombie";
import * as THREE from "three";
import { useStore } from "../../store";

export const ZombieSpawner = ({
    playerRef,
    maxConcurrent = 50,
}: {
    playerRef: React.RefObject<THREE.Group>;
    maxConcurrent?: number;
}) => {
    const gamePhase = useStore(state => state.gamePhase);
    const [zombies, setZombies] = useState<{ id: string, pos: [number, number, number] }[]>([]);

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
        }, 1500); // 1.5 seconds

        return () => clearInterval(interval);
    }, [gamePhase, maxConcurrent]);

    const handleDespawn = (id: string) => {
        setZombies(current => current.filter(z => z.id !== id));
    };

    return (
        <group>
            {zombies.map((z) => (
                <Zombie 
                    key={z.id} 
                    position={z.pos} 
                    playerRef={playerRef} 
                    onDespawn={() => handleDespawn(z.id)}
                />
            ))}
        </group>
    );
};
