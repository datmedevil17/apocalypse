import { useMemo } from "react";
import { Zombie } from "./Zombie";
import * as THREE from "three";

export const ZombieSpawner = ({
    playerRef,
    count = 10,
}: {
    playerRef: React.RefObject<THREE.Group>;
    count?: number;
}) => {
    // Generate random spawn positions around the map
    const spawnPoints = useMemo(() => {
        const points: [number, number, number][] = [];
        const mapSize = 100; // Roughly the bounds of our road grid
        
        for (let i = 0; i < count; i++) {
            // Don't spawn perfectly at 0,0 (where player spawns)
            let x, z;
            do {
                x = (Math.random() - 0.5) * mapSize;
                z = (Math.random() - 0.5) * mapSize;
            } while (Math.abs(x) < 15 && Math.abs(z) < 15); // Safe zone radius

            points.push([x, 5, z]); // Drop them from slightly above ground (y=5) to ensure they hit the road
        }
        return points;
    }, [count]);

    return (
        <group>
            {spawnPoints.map((pos, index) => (
                <Zombie key={`zombie-${index}`} position={pos} playerRef={playerRef} />
            ))}
        </group>
    );
};
