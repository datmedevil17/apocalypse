import { ContactShadows, Stars } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Map } from "./Map";
import { Character } from "./Character";
import { Pet } from "./Pet";
import { Multiplayer } from "./Multiplayer";
import { AtmosphereEffects } from "./AtmosphereEffects";
import * as THREE from 'three';

/* ── Pulsing red ambient for dread ── */
const DreadPulse = () => {
    const ref = useRef<THREE.PointLight>(null!);
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.elapsedTime;
        // Slow, deep pulse — like a heartbeat
        const beat = Math.pow(Math.sin(t * 0.8) * 0.5 + 0.5, 3);
        ref.current.intensity = 0.15 + beat * 0.35;
    });
    return (
        <pointLight
            ref={ref}
            position={[0, 25, 0]}
            color="#880000"
            intensity={0.2}
            distance={120}
            decay={1.5}
        />
    );
};

export const Experience = ({ level = 3 }: { level?: number }) => {
    const playerRef = useRef<THREE.Group>(null!);

    return (
        <>
            {/* ── Night sky — dark greenish to blend with fog ── */}
            <color attach="background" args={["#0a120a"]} />
            <Stars
                radius={100}
                depth={50}
                count={3000}
                factor={3}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* ── Fog: dark green haze — matches grass at distance ── */}
            <fog attach="fog" args={["#0e1a0e", 60, 180]} />

            {/* ── Ambient: visible night lighting ── */}
            <ambientLight intensity={0.7} color="#6677aa" />

            {/* ── Moonlight: strong cold light so players can see ── */}
            <directionalLight
                position={[-50, 80, -30]}
                intensity={2.0}
                color="#99aacc"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
            />

            {/* ── Fill light from opposite side ── */}
            <directionalLight
                position={[30, 15, 40]}
                intensity={0.5}
                color="#556688"
            />

            {/* ── Hemisphere: sky/ground bounce ── */}
            <hemisphereLight
                args={["#4466aa", "#221515", 0.6]}
            />

            {/* ── Heartbeat dread pulse ── */}
            <DreadPulse />

            {/* ── Accent lights at corners — brighter for visibility ── */}
            <pointLight position={[-40, 5, -40]} color="#338855" intensity={1.5} distance={35} decay={2} />
            <pointLight position={[40, 5, 40]} color="#884422" intensity={2.0} distance={40} decay={2} />
            <pointLight position={[40, 5, -40]} color="#335588" intensity={1.2} distance={30} decay={2} />
            <pointLight position={[-40, 5, 40]} color="#553322" intensity={1.5} distance={32} decay={2} />

            {/* ── Atmosphere (fire lights, smoke, dust, embers) ── */}
            <AtmosphereEffects />

            <Physics debug={false} interpolate>
                <Map level={level} />
                <Character groupRef={playerRef} />
                <Pet playerRef={playerRef} />
                <Multiplayer />
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
