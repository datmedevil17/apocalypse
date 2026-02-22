import { RigidBody, CuboidCollider } from "@react-three/rapier";

export const Map = () => {
    return (
        <RigidBody type="fixed" name="ground" restitution={0} friction={1}>
            <mesh receiveShadow position={[0, -0.5, 0]}>
                <boxGeometry args={[100, 1, 100]} />
                <meshStandardMaterial color="#2e7d32" />
            </mesh>
            <CuboidCollider args={[50, 0.5, 50]} position={[0, -0.5, 0]} />
        </RigidBody>
    );
};
