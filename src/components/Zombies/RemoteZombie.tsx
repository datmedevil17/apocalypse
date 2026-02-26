import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { ZombieConfig, ZOMBIE_TYPES } from "../../config/GameConfig";

export const RemoteZombie = ({ id, data }: { id: string; data: { pos: [number, number, number]; state: string } }) => {
    const group = useRef<THREE.Group>(null);
    
    // We could deterministically pick based on ID to match Host, or just random
    const zombieType = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        return ZOMBIE_TYPES[Math.abs(hash) % ZOMBIE_TYPES.length];
    }, [id]);
    
    const config = ZombieConfig[zombieType];
    const { scene, animations } = useGLTF(config.model);
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    useGraph(clone);

    const { actions } = useAnimations(animations, group);
    
    // Lerp position
    const targetPos = useRef(new THREE.Vector3(...data.pos));
    
    useEffect(() => {
        targetPos.current.set(...data.pos);
    }, [data.pos]);

    useFrame((_, delta) => {
        if (!group.current) return;
        
        // Skip interpolation if dead to prevent sliding
        if (data.state !== 'dead' && data.state !== 'despawn') {
            const dist = group.current.position.distanceTo(targetPos.current);
            if (dist > 5) {
                // Teleport if too far
                group.current.position.copy(targetPos.current);
            } else {
                group.current.position.lerp(targetPos.current, 10 * delta); // Smooth interpolate
            }
            
            // Look towards movement direction
            if (dist > 0.05) {
                const dir = targetPos.current.clone().sub(group.current.position).normalize();
                if (dir.lengthSq() > 0.1) {
                    const targetRotation = Math.atan2(dir.x, dir.z);
                    let diff = targetRotation - group.current.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    group.current.rotation.y += diff * 10 * delta;
                }
            }
        }
    });

    useEffect(() => {
        Object.values(actions).forEach((action) => action?.stop());
        
        let animName = "Idle";
        if (data.state === "idle") animName = config.animations?.idle || "Idle";
        if (data.state === "walk") animName = config.animations?.walk || "Walk";
        if (data.state === "run") animName = config.animations?.run || "Run";
        if (data.state === "attack") animName = config.animations?.attack || "Punch";
        if (data.state === "dead") animName = config.animations?.dead || "Death";

        const action = actions[animName];
        if (action) {
            action.reset().fadeIn(0.2).play();
            if (data.state === "dead") {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            }
        }
    }, [data.state, actions, config]);

    if (data.state === "despawn") return null;

    return (
        <group ref={group} position={data.pos}>
            <primitive object={clone} />
        </group>
    );
};
