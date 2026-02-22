import { Environment, Sky, ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Map } from "./Map";
import { Character } from "./Character";

export const Experience = () => {
    return (
        <>
            <Sky sunPosition={[100, 20, 100]} />
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />

            <Physics interpolate>
                <Map />
                <Character />
            </Physics>

            <ContactShadows
                opacity={0.4}
                scale={10}
                blur={2.4}
                far={10}
                resolution={256}
                color="#000000"
            />
        </>
    );
};
