import { ContactShadows, Stars } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Map } from "./Map";
import { Character } from "./Character";
import { Pet } from "./Pet";
import { Multiplayer } from "./Multiplayer";
import { AtmosphereEffects } from "./AtmosphereEffects";
import { ZombieSpawner } from "./Zombies/ZombieSpawner";
import * as THREE from 'three';
import { useStore } from "../store";
import { EnvironmentConfig } from "../config/EnvironmentConfig";

/* ── Pulsing red ambient for dread (Always On) ── */
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

/* ── Accent lights at corners (Always On) ── */
const AccentLights = () => {
    return (
        <group>
             <pointLight position={[-40, 5, -40]} color="#338855" intensity={1.5} distance={35} decay={2} />
             <pointLight position={[40, 5, 40]} color="#884422" intensity={2.0} distance={40} decay={2} />
             <pointLight position={[40, 5, -40]} color="#335588" intensity={1.2} distance={30} decay={2} />
             <pointLight position={[-40, 5, 40]} color="#553322" intensity={1.5} distance={32} decay={2} />
        </group>
    );
};

const AtmosphereSystem = () => {
    const bgRef = useRef<THREE.Color>(null!);
    const fogRef = useRef<THREE.Fog>(null!);
    const ambientRef = useRef<THREE.AmbientLight>(null!);
    const sunRef = useRef<THREE.DirectionalLight>(null!);
    const fillRef = useRef<THREE.DirectionalLight>(null!);
    const hemiRef = useRef<THREE.HemisphereLight>(null!);
    const starsGroupRef = useRef<THREE.Group>(null!);

    const c1 = useRef(new THREE.Color());
    const c2 = useRef(new THREE.Color());

    const palette = EnvironmentConfig.timePalette;
    const totalDuration = useMemo(() => palette.reduce((sum: number, p: any) => sum + p.duration + p.transition, 0), [palette]);

    useFrame((_, delta) => {
        const state = useStore.getState();
        let currentT = state.timeOfDay;
        
        // Progress time based on timeSpeed (1.0 = realtime)
        currentT = (currentT + delta * state.timeSpeed) % totalDuration;
        useStore.setState({ timeOfDay: currentT });

        // Find which phase we are currently in
        let accumulated = 0;
        let p1Idx = 0;
        let isTransitioning = false;
        
        for (let i = 0; i < palette.length; i++) {
            const phaseTime = palette[i].duration + palette[i].transition;
            if (currentT >= accumulated && currentT < accumulated + phaseTime) {
                p1Idx = i;
                if (currentT >= accumulated + palette[i].duration) {
                    isTransitioning = true;
                }
                break;
            }
            accumulated += phaseTime;
        }

        const p1 = palette[p1Idx];
        const p2Idx = (p1Idx + 1) % palette.length;
        const p2 = palette[p2Idx];
        
        // factor = 0 during the hold duration, smoothly goes 0 -> 1 during the transition
        let factor = 0;
        if (isTransitioning) {
            const transitionStart = accumulated + p1.duration;
            factor = p1.transition === 0 ? 0 : (currentT - transitionStart) / p1.transition;
        }

        if (bgRef.current) bgRef.current.lerpColors(c1.current.set(p1.sky), c2.current.set(p2.sky), factor);
        if (fogRef.current) fogRef.current.color.lerpColors(c1.current.set(p1.fog), c2.current.set(p2.fog), factor);
        if (ambientRef.current) ambientRef.current.color.lerpColors(c1.current.set(p1.amb), c2.current.set(p2.amb), factor);
        if (hemiRef.current) hemiRef.current.color.lerpColors(c1.current.set(p1.hemi), c2.current.set(p2.hemi), factor);
        
        if (sunRef.current) {
            sunRef.current.color.lerpColors(c1.current.set(p1.sun), c2.current.set(p2.sun), factor);
            sunRef.current.intensity = THREE.MathUtils.lerp(p1.int, p2.int, factor);
        }

        if (fillRef.current) {
            fillRef.current.color.lerpColors(c1.current.set(p1.fill), c2.current.set(p2.fill), factor);
        }

        // Stars opacity (fade in heavily during Night/Evening/Sunrise)
        if (starsGroupRef.current) {
            // High at 0 (Night), low at middle (Noon), high at end
            const cyclePhase = currentT / totalDuration;
            const opacity = Math.pow(Math.abs(cyclePhase - 0.5) * 2, 2.5);
            starsGroupRef.current.children.forEach((c: any) => {
                if (c.material) {
                    c.material.transparent = true;
                    c.material.opacity = opacity;
                    c.material.depthWrite = false;
                }
            });
        }
    });

    return (
        <>
            <color attach="background" args={["#0a120a"]} ref={bgRef} />
            <fog attach="fog" args={["#0e1a0e", 60, 180]} ref={fogRef} />
            
            <group ref={starsGroupRef}>
                <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
            </group>

            <ambientLight ref={ambientRef} intensity={0.7} color="#6677aa" />

            <directionalLight
                ref={sunRef}
                position={[-50, 80, -30]}
                intensity={2.0}
                color="#99aacc"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
                shadow-bias={-0.0005} // Prevent shadowing artifacts
            />

            <directionalLight ref={fillRef} position={[30, 15, 40]} intensity={0.5} color="#556688" />
            <hemisphereLight ref={hemiRef} args={["#4466aa", "#221515", 0.6]} />
        </>
    );
};



export const Experience = ({ level = 3 }: { level?: number }) => {
    const playerRef = useRef<THREE.Group>(null!);

    return (
        <>
            <AtmosphereSystem />
            <DreadPulse />
            <AccentLights />

            {/* ── Atmosphere (fire lights, smoke, dust, embers) ── */}
            <AtmosphereEffects />

            <Physics debug={false} interpolate>
                <Map level={level} />
                <Character groupRef={playerRef} />
                <ZombieSpawner playerRef={playerRef} count={15} />
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
