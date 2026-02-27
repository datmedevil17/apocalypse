import { ContactShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from 'three';
import { Map } from "./Map";
import { Character } from "./Character";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import { Pet } from "./Pet";
import { AtmosphereSystem, DreadPulse, AccentLights } from "./Experience";
import { AtmosphereEffects } from "./AtmosphereEffects";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

export const TestZomExperience = () => {
    const playerRef = useRef<THREE.Group>(null!);
    
    return (
        <>
            <AtmosphereSystem />
            <DreadPulse />
            <AccentLights />

            {/* ── Atmosphere (fire lights, smoke, dust, embers) ── */}
            <AtmosphereEffects />

            <Physics debug={false} interpolate>
                <Map level={3} />
                <Character groupRef={playerRef} />
                <Pet playerRef={playerRef} />
                <ZombieSpawner playerRef={playerRef} />
            </Physics>

            <ContactShadows
                opacity={0.95}
                scale={60}
                blur={2.5}
                far={18}
                resolution={512}
                color="#000008"
            />

            {/* ── Post-processing: horror grading ── */}
            <EffectComposer>
                {/* Bloom makes fire glow bleed outward — eerie halos */}
                <Bloom
                    intensity={0.6}
                    luminanceThreshold={0.3}
                    luminanceSmoothing={0.9}
                    mipmapBlur
                />
                {/* Gentle vignette — subtle edge darkening */}
                <Vignette
                    offset={0.4}
                    darkness={0.5}
                    blendFunction={BlendFunction.NORMAL}
                />
                {/* Subtle chromatic aberration — disorienting, sickly */}
                <ChromaticAberration
                    offset={new THREE.Vector2(0.0008, 0.0008)}
                    radialModulation={true}
                    modulationOffset={0.4}
                    blendFunction={BlendFunction.NORMAL}
                />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
        </>
    );
};
