import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useStore } from "../store";
import { Characters_Lis } from "./Characters/Characters_Lis";
import { Characters_GermanShepherd } from "./Characters/Characters_GermanShepherd";
import { Characters_Matt } from "./Characters/Characters_Matt";
import { Characters_Pug } from "./Characters/Characters_Pug";
import { Characters_Sam } from "./Characters/Characters_Sam";
import { Characters_Shaun } from "./Characters/Characters_Shaun";
import { useEffect, useRef } from "react";
import * as THREE from 'three';

const Models: Record<string, any> = {
    Lis: Characters_Lis,
    Matt: Characters_Matt,
    Sam: Characters_Sam,
    Shaun: Characters_Shaun,
    Pug: Characters_Pug,
    GermanShepherd: Characters_GermanShepherd,
};

export const InventoryExperience = () => {
    const selectedCharacter = useStore(state => state.selectedCharacter);
    const Model = Models[selectedCharacter] || Models.Lis;
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useEffect(() => {
        // Position camera for a good portrait view
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.position.set(0, 1.5, 4);
            camera.lookAt(0, 1, 0);
        }
    }, [camera]);

    useFrame((state) => {
        if (groupRef.current) {
            // Slowly rotate the character for a dynamic showcase
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
        }
    });

    return (
        <>
            <color attach="background" args={["#050510"]} />
            <fog attach="fog" args={["#050510", 5, 15]} />
            <Environment preset="city" />
            
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
            <spotLight position={[-5, 5, 5]} intensity={1} color="#ff4500" />
            
            <group ref={groupRef} position={[0, -1, 0]}>
                <Model animation="Idle" weaponSlot="Unarmed" onAnimationFinished={() => {}} />
            </group>

            {/* A subtle pedestal */}
            <mesh position={[0, -1.05, 0]} receiveShadow>
                <cylinderGeometry args={[1.5, 1.8, 0.1, 32]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -1.1, 0]} receiveShadow>
                <cylinderGeometry args={[2, 2.2, 0.1, 32]} />
                <meshStandardMaterial color="#ff4500" emissive="#ff4500" emissiveIntensity={0.2} />
            </mesh>

            <OrbitControls 
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2 + 0.1}
            />
        </>
    );
};
