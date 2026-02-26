import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface BulletProps {
    id: string;
    startPosition: THREE.Vector3;
    direction: THREE.Vector3;
    damage: number;
    speed?: number;
    onHit: (id: string) => void;
}

export const Bullet = ({
    id,
    startPosition,
    direction,
    damage,
    speed = 50,
    onHit
}: BulletProps) => {
    const rb = useRef<RapierRigidBody>(null);
    const lifeTime = useRef(0);

    // Initial velocity
    useEffect(() => {
        if (rb.current) {
            rb.current.setLinvel({
                x: direction.x * speed,
                y: direction.y * speed,
                z: direction.z * speed
            }, true);
        }
    }, [direction, speed]);

    // Bullet timeout (destroy after a few seconds if it hits nothing)
    useFrame((_, delta) => {
        lifeTime.current += delta;
        if (lifeTime.current > 2) { // 2 seconds max lifetime
            onHit(id);
        }
    });

    return (
        <RigidBody
            ref={rb}
            position={[startPosition.x, startPosition.y, startPosition.z]}
            colliders="ball"
            mass={0.1}
            gravityScale={0} // Bullets shoot straight
            onIntersectionEnter={({ other }) => {
                const otherName = other.rigidBodyObject?.name;
                
                // Ignore the player completely
                if (otherName === 'player' || otherName === 'bullet') return;

                // If it intersects with a zombie, damage it and destroy bullet
                if (otherName === 'zombie') {
                    const zombieData = other.rigidBodyObject?.userData;
                    if (zombieData && zombieData.takeDamage) {
                        zombieData.takeDamage(damage, direction);
                    }
                    onHit(id);
                } else {
                    // Hit a wall or ground
                    onHit(id);
                }
            }}
            sensor // We use sensor because we don't want bullets physically pushing the player or bouncing realistically off walls
            ccd={true} // Continuous Collision Detection prevents bullets going through walls
            name="bullet"
        >
            <mesh>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
            </mesh>
        </RigidBody>
    );
};
