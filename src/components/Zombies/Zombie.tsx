import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useGraph } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { Html } from "@react-three/drei";
import { useStore } from "../../store";
import { ZombieConfig, ZOMBIE_TYPES } from "../../config/GameConfig";
import { useHitEffects } from "../HitEffect";

export const Zombie = ({
    id,
    position,
    playerRef,
    activeZombiesRef,
    onDespawn,
}: {
    id: string;
    position: [number, number, number];
    playerRef: React.RefObject<THREE.Group>;
    activeZombiesRef?: React.MutableRefObject<Record<string, { pos: [number, number, number], state: string }>>;
    onDespawn?: () => void;
}) => {
    const rbRef = useRef<RapierRigidBody>(null);
    const group = useRef<THREE.Group>(null);

    // Randomize zombie type
    const zombieType = useMemo(() => ZOMBIE_TYPES[Math.floor(Math.random() * ZOMBIE_TYPES.length)], []);
    const config = ZombieConfig[zombieType];

    const { scene, animations } = useGLTF(config.model);

    // We need to clone the scene to allow multiple instances of the same model with different animations
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    useGraph(clone);

    const { actions } = useAnimations(animations, group);

    const [state, setState] = useState<"idle" | "walk" | "run" | "attack" | "dead">("idle");
    const [health, setHealth] = useState(config.health);
    const healthRef = useRef(config.health);
    const isDeadRef = useRef(false);

    const lastAttackTime = useRef(0);
    const triggerHitReact = useStore(state => state.triggerHitReact);
    const damagePlayer = useStore(state => (state as any).damagePlayer || (() => { })); // Optional wrapper
    const overrideZombieAnimation = useStore(state => state.overrideZombieAnimation);
    const onZombieKilled = useStore(state => state.onZombieKilled);

    const zombieId = id;

    // Hit flash effect: briefly tint all meshes red
    const hitFlashTimer = useRef(0);
    const { spawnHit, HitEffects } = useHitEffects();
    useFrame((_, delta) => {
        if (hitFlashTimer.current > 0) {
            hitFlashTimer.current -= delta;
            const intensity = Math.max(0, hitFlashTimer.current / 0.15);
            clone.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    child.material.emissive = new THREE.Color(1, 0, 0);
                    child.material.emissiveIntensity = intensity * 2;
                }
            });
        } else {
            clone.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    child.material.emissiveIntensity = 0;
                }
            });
        }
    });

    // Helper to flash + spawn particles at current zombie position
    const triggerHitVisuals = useCallback((death = false) => {
        if (!rbRef.current) return;
        const t = rbRef.current.translation();
        const hitPos = new THREE.Vector3(t.x, t.y + 1, t.z);
        hitFlashTimer.current = 0.15;
        spawnHit(hitPos, death);
    }, [spawnHit]);

    // Hit reaction state
    const [hitTimer, setHitTimer] = useState(0);
    const [despawned, setDespawned] = useState(false);
    
    // Offset for wander logic
    const wanderOffset = useMemo(() => Math.random() * 100, []);

    // Method to receive damage
    const takeDamage = (amount: number, knockbackDir?: THREE.Vector3) => {
        if (isDeadRef.current) return;

        healthRef.current -= amount;
        setHealth(Math.max(0, healthRef.current));

        if (healthRef.current <= 0) {
            isDeadRef.current = true;
            setState("dead");
            triggerHitVisuals(true); // Big death burst
            setTimeout(() => {
                setDespawned(true);
                if (onDespawn) onDespawn();
            }, 3500); // Extra time for death animation to finish

            if (onZombieKilled) {
                onZombieKilled(10); // Reward 10 points
            }
        } else {
            setHitTimer(0.8); // Longer freeze for hit reaction
            triggerHitVisuals(false); // Small hit burst

            // Apply knockback if provided and we have a rigidbody
            if (knockbackDir && rbRef.current) {
                rbRef.current.applyImpulse({
                    x: knockbackDir.x * 5, // 5 is knockback strength
                    y: 2,                  // Slight upward pop
                    z: knockbackDir.z * 5
                }, true);
            }
        }
    };

    useEffect(() => {
        // Stop all current animations
        Object.values(actions).forEach((action) => action?.stop());

        // Play new animation
        let animName = "Idle";
        if (overrideZombieAnimation && actions[overrideZombieAnimation]) {
            animName = overrideZombieAnimation;
        } else if (hitTimer > 0 && actions["HitReact"]) {
            animName = "HitReact";
        } else {
            // Check if config provides a specific animation for this state
            if (state === "idle") animName = config.animations?.idle || "Idle";
            if (state === "walk") animName = config.animations?.walk || "Walk";
            if (state === "run") animName = config.animations?.run || "Run";
            if (state === "attack") animName = config.animations?.attack || "Punch";
            if (state === "dead") animName = config.animations?.dead || "Death";
        }

        const action = actions[animName];
        if (action) {
            // Slow down the hit reaction for dramatic effect
            if (animName === "HitReact") {
                action.setEffectiveTimeScale(0.6);
            } else {
                action.setEffectiveTimeScale(1.0);
            }

            action.reset().fadeIn(0.2).play();
            if (state === "dead" || (overrideZombieAnimation && animName === "Death")) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            } else if (animName === "HitReact") {
                action.setLoop(THREE.LoopOnce, 1);
            }
        }

        return () => {
            action?.fadeOut(0.2);
        };
    }, [state, overrideZombieAnimation, hitTimer, actions]);

    useFrame((stateObj, delta) => {
        if (despawned) return;

        if (hitTimer > 0) {
            setHitTimer(prev => Math.max(0, prev - delta));
        }

        if (!rbRef.current || !group.current || !playerRef.current) return;
        if (state === "dead" || overrideZombieAnimation) {
            // Ensure physics body settles
            rbRef.current.setLinvel({ x: 0, y: rbRef.current.linvel().y, z: 0 }, true);
            return;
        }

        if (hitTimer > 0) {
            // Stop intentional AI movement when hit (but let knockback coast)
            const v = rbRef.current.linvel();
            rbRef.current.setLinvel({ x: v.x * 0.9, y: v.y, z: v.z * 0.9 }, true);
            return;
        }

        const remotePlayers = useStore.getState().remotePlayers;
        const zombiePos = rbRef.current.translation();
        const currentPos = new THREE.Vector3(zombiePos.x, zombiePos.y, zombiePos.z);
        
        // Find closest player among local and remote
        let closestPlayerPos = new THREE.Vector3();
        playerRef.current.getWorldPosition(closestPlayerPos);
        let minDistance = currentPos.distanceTo(closestPlayerPos);

        Object.values(remotePlayers).forEach((rp) => {
            // Only target living players
            if (rp.animation === "Death") return;
            
            const rpPos = new THREE.Vector3(...rp.position);
            const dist = currentPos.distanceTo(rpPos);
            if (dist < minDistance) {
                minDistance = dist;
                closestPlayerPos.copy(rpPos);
            }
        });

        const distance = minDistance;

        // State machine
        if (distance > config.aggroRange * 2) {
            if (state !== "walk") setState("walk"); // Wander when far away
        } else if (distance <= config.attackRange) {
            if (state !== "attack") setState("attack");

            // Deal damage on cooldown
            const now = stateObj.clock.elapsedTime;
            if (now - lastAttackTime.current > config.attackCooldown) {
                lastAttackTime.current = now;
                triggerHitReact();
                
                // Only damage if the closest player IS the local player
                const localPos = new THREE.Vector3();
                playerRef.current.getWorldPosition(localPos);
                if (localPos.distanceTo(currentPos) <= config.attackRange + 0.5) {
                    damagePlayer(config.damage);
                }
            }

        } else if (distance <= config.aggroRange) {
            if (state !== "run") setState("run");
        } else {
            if (state !== "walk") setState("walk");
        }

        // Movement logic
        if (state === "walk" || state === "run") {
            let targetDirection = new THREE.Vector3();
            
            if (distance > config.aggroRange * 2) {
                // Wander slowly in a circle
                const wanderTime = stateObj.clock.elapsedTime * 0.5 + wanderOffset;
                targetDirection.set(Math.sin(wanderTime), 0, Math.cos(wanderTime)).normalize();
            } else {
                // Direction to closest player
                targetDirection.subVectors(closestPlayerPos, currentPos);
                targetDirection.y = 0; // Don't look up/down
                targetDirection.normalize();
            }

            // Rotate towards target
            const targetRotation = Math.atan2(targetDirection.x, targetDirection.z);

            // Smooth rotation
            const currentRotation = group.current.rotation.y;
            // Simple angular lerp
            let diff = targetRotation - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            group.current.rotation.y += diff * 10 * delta;

            // Apply velocity
            // Slower speed for wandering
            const isWandering = distance > config.aggroRange * 2;
            const currentSpeed = isWandering ? config.speed * 0.4 : (state === "run" ? config.runSpeed : config.speed);
            const velocity = rbRef.current.linvel();

            rbRef.current.setLinvel({
                x: targetDirection.x * currentSpeed,
                y: velocity.y, // Maintain gravity
                z: targetDirection.z * currentSpeed,
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

        if (activeZombiesRef && activeZombiesRef.current) {
            const pos = rbRef.current.translation();
            activeZombiesRef.current[zombieId] = {
                pos: [pos.x, pos.y, pos.z],
                state: hitTimer > 0 ? "HitReact" : state
            };
        }
    });

    if (despawned) return null;

    return (
        <>
            <RigidBody
                ref={rbRef}
                position={position}
                colliders={false}
                enabledRotations={[false, false, false]} // Don't tip over
                mass={1}
                lockRotations
                friction={0}
                restitution={0}
                name="zombie"
                userData={{ type: 'zombie', id: zombieId, takeDamage }}
            >
                <CapsuleCollider args={[0.6, 0.5]} position={[0, 1.1, 0]} />
                <group ref={group}>
                    <primitive object={clone} />
                </group>
            </RigidBody>

            {/* Particle hit effects */}
            <HitEffects />

            {/* Health Bar UI - rendered above the zombie but outside RigidBody to stay stable */}
            {health > 0 && health < config.health && (
                <Html position={[position[0], position[1] + 2.4, position[2]]} center>
                    <div style={{
                        width: '50px',
                        height: '6px',
                        background: '#333',
                        border: '1px solid black',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${(health / config.health) * 100}%`,
                            height: '100%',
                            background: health > config.health * 0.5 ? '#4CAF50' : '#f44336',
                            transition: 'width 0.2s ease-out, background 0.2s'
                        }} />
                    </div>
                </Html>
            )}
        </>
    );
};
