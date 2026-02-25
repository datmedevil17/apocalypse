import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useGraph } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

const ZOMBIE_MODELS = [
    "/models/Zombie_Basic.gltf",
    "/models/Zombie_Chubby.gltf",
    "/models/Zombie_Arm.gltf",
    "/models/Zombie_Ribcage.gltf",
];

const SPEED = 2.5; // Walk speed
const RUN_SPEED = 5.5; // Chase speed
const AGGRO_RANGE = 20; // Distance to start running
const ATTACK_RANGE = 1.5; // Distance to attack

export const Zombie = ({
    position,
    playerRef,
}: {
    position: [number, number, number];
    playerRef: React.RefObject<THREE.Group>;
}) => {
    const rbRef = useRef<RapierRigidBody>(null);
    const group = useRef<THREE.Group>(null);
    
    // Randomize zombie model
    const modelPath = useMemo(() => ZOMBIE_MODELS[Math.floor(Math.random() * ZOMBIE_MODELS.length)], []);
    const { scene, animations } = useGLTF(modelPath);
    
    // We need to clone the scene to allow multiple instances of the same model with different animations
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    useGraph(clone);

    const { actions } = useAnimations(animations, group);

    const [state, setState] = useState<"idle" | "walk" | "run" | "attack">("idle");
    // Unused until combat system is implemented
    // const [health, setHealth] = useState(100);

    useEffect(() => {
        // Stop all current animations
        Object.values(actions).forEach((action) => action?.stop());

        // Play new animation
        let animName = "Idle";
        if (state === "walk") animName = "Walk";
        if (state === "run") animName = "Run";
        if (state === "attack") animName = "Punch";

        const action = actions[animName];
        if (action) {
            action.reset().fadeIn(0.2).play();
        }

        return () => {
            action?.fadeOut(0.2);
        };
    }, [state, actions]);

    useFrame((_, delta) => {
        if (!rbRef.current || !group.current || !playerRef.current) return;

        const zombiePos = rbRef.current.translation();
        const playerPos = new THREE.Vector3();
        playerRef.current.getWorldPosition(playerPos);

        const currentPos = new THREE.Vector3(zombiePos.x, zombiePos.y, zombiePos.z);
        const distance = currentPos.distanceTo(playerPos);

        // State machine
        if (distance > AGGRO_RANGE * 2) {
            if (state !== "idle") setState("idle");
        } else if (distance <= ATTACK_RANGE) {
            if (state !== "attack") setState("attack");
        } else if (distance <= AGGRO_RANGE) {
            if (state !== "run") setState("run");
        } else {
            if (state !== "walk") setState("walk");
        }

        // Movement logic
        if (state === "walk" || state === "run") {
            // Direction to player
            const direction = new THREE.Vector3().subVectors(playerPos, currentPos);
            direction.y = 0; // Don't look up/down
            direction.normalize();

            // Rotate towards player
            const targetRotation = Math.atan2(direction.x, direction.z);
            
            // Smooth rotation
            const currentRotation = group.current.rotation.y;
            // Simple angular lerp
            let diff = targetRotation - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            group.current.rotation.y += diff * 10 * delta;

            // Apply velocity
            const currentSpeed = state === "run" ? RUN_SPEED : SPEED;
            const velocity = rbRef.current.linvel();
            
            rbRef.current.setLinvel({
                x: direction.x * currentSpeed,
                y: velocity.y, // Maintain gravity
                z: direction.z * currentSpeed,
            }, true);
        } else {
            // Stop moving if idle or attacking
             const velocity = rbRef.current.linvel();
             // Slow down horizontally
             rbRef.current.setLinvel({
                x: velocity.x * 0.9,
                y: velocity.y,
                z: velocity.z * 0.9,
            }, true);
        }
    });

    return (
        <RigidBody
            ref={rbRef}
            position={position}
            colliders={false}
            enabledRotations={[false, false, false]} // Don't tip over
            mass={1}
            lockRotations
            friction={0}
            restitution={0}
        >
            <CapsuleCollider args={[0.55, 0.3]} position={[0, 0.85, 0]} />
            <group ref={group}>
                <primitive object={clone} />
            </group>
        </RigidBody>
    );
};
