import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useStore } from "../store";
import * as THREE from "three";

export const Map = () => {
    const timeOfDay = useStore((state) => state.timeOfDay);

    // Interpolate ground color based on timeOfDay
    // 0.25 is Noon (Brightest), 0.75 is Midnight (Darkest)
    const angle = (timeOfDay - 0.25) * Math.PI * 2;
    const brightness = Math.max(0.2, (Math.sin(angle + Math.PI / 2) + 1) / 2);

    // Base green color #2e7d32
    const groundColor = new THREE.Color("#2e7d32").multiplyScalar(brightness);

    return (
        <RigidBody type="fixed" name="ground" restitution={0} friction={1}>
            <mesh receiveShadow position={[0, -0.5, 0]}>
                <boxGeometry args={[100, 1, 100]} />
                <meshStandardMaterial color={groundColor} />
            </mesh>
            <CuboidCollider args={[50, 0.5, 50]} position={[0, -0.5, 0]} />
        </RigidBody>
    );
};
