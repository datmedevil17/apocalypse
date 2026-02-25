import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { useTexture, useGLTF } from "@react-three/drei";
import { useMemo } from "react";

const STREET_PATHS = {
    fourWay: "/environement/Street_4Way.gltf",
    straight: "/environement/Street_Straight.gltf",
    straightCrack1: "/environement/Street_Straight_Crack1.gltf",
    straightCrack2: "/environement/Street_Straight_Crack2.gltf",
    turn: "/environement/Street_Turn.gltf",
    tJunction: "/environement/Street_T.gltf",
};

const PROP_PATHS = {
    barrel: "/environement/Barrel.gltf",
    cinderBlock: "/environement/CinderBlock.gltf",
    containerGreen: "/environement/Container_Green.gltf",
    containerRed: "/environement/Container_Red.gltf",
    couch: "/environement/Couch.gltf",
    fireHydrant: "/environement/FireHydrant.gltf",
    pallet: "/environement/Pallet.gltf",
    palletBroken: "/environement/Pallet_Broken.gltf",
    pipes: "/environement/Pipes.gltf",
    plasticBarrier: "/environement/PlasticBarrier.gltf",
    streetLights: "/environement/StreetLights.gltf",
    townSign: "/environement/TownSign.gltf",
    trafficBarrier1: "/environement/TrafficBarrier_1.gltf",
    trafficBarrier2: "/environement/TrafficBarrier_2.gltf",
    trafficCone1: "/environement/TrafficCone_1.gltf",
    trafficCone2: "/environement/TrafficCone_2.gltf",
    trafficLight1: "/environement/TrafficLight_1.gltf",
    trafficLight2: "/environement/TrafficLight_2.gltf",
    trashBag1: "/environement/TrashBag_1.gltf",
    trashBag2: "/environement/TrashBag_2.gltf",
    pickup: "/environement/Vehicle_Pickup.gltf",
    pickupArmored: "/environement/Vehicle_Pickup_Armored.gltf",
    sports: "/environement/Vehicle_Sports.gltf",
    sportsArmored: "/environement/Vehicle_Sports_Armored.gltf",
    truck: "/environement/Vehicle_Truck.gltf",
    truckArmored: "/environement/Vehicle_Truck_Armored.gltf",
    waterTower: "/environement/WaterTower.gltf",
    wheel: "/environement/Wheel.gltf",
    wheelsStack: "/environement/Wheels_Stack.gltf",
};

const RoadSegment = ({ path, position, rotation = [0, 0, 0] }: { path: string, position: [number, number, number], rotation?: [number, number, number] }) => {
    const { scene } = useGLTF(path);
    const clone = useMemo(() => scene.clone(), [scene]);

    // Lift road slightly above ground to prevent Z-fighting and jittering
    const liftedPosition: [number, number, number] = [position[0], position[1] + 0.01, position[2]];

    return (
        <group position={liftedPosition} rotation={rotation}>
            <primitive object={clone} />
            {/* Box collider for the 8x8 segment, slightly thinner to avoid catching feet */}
            <CuboidCollider args={[4, 0.05, 4]} position={[0, -0.04, 0]} />
        </group>
    );
};

const Prop = ({ path, position, rotation = [0, 0, 0], scale = 1, colliderArgs }: {
    path: string,
    position: [number, number, number],
    rotation?: [number, number, number],
    scale?: number,
    colliderArgs?: [number, number, number]
}) => {
    const { scene } = useGLTF(path);
    const clone = useMemo(() => scene.clone(), [scene]);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <primitive object={clone} />
            {colliderArgs && (
                <CuboidCollider args={colliderArgs} />
            )}
        </group>
    );
};

const INTERSECTION_POINTS = [-72, -48, -24, 0, 24, 48, 72];

/** Returns true if the given world position sits on a road lane (within 4 units of a road centre) */
const isOnRoad = (x: number, z: number): boolean => {
    const onVerticalRoad = INTERSECTION_POINTS.some(ix => Math.abs(x - ix) < 4);
    const onHorizontalRoad = INTERSECTION_POINTS.some(iz => Math.abs(z - iz) < 4);
    return onVerticalRoad || onHorizontalRoad;
};

export const Map = ({ level = 3 }: { level?: number }) => {
    // Textures for non-road areas
    const grassTexture = useTexture("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg");
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(20, 20);

    const brickTexture = useTexture("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg");
    brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
    brickTexture.repeat.set(10, 1);

    const brightness = 0.6;
    const groundColor = new THREE.Color("#2e7d32").multiplyScalar(brightness);

    // Grid definition: 3x3 intersections with connecting roads
    const roadLayout = useMemo(() => {
        const segments = [];
        const tileSize = 8;
        const intersectionPoints = [-72, -48, -24, 0, 24, 48, 72];

        // Loop through the main grid area [-96, 96] to fill 200x200
        for (let x = -96; x <= 96; x += tileSize) {
            for (let z = -96; z <= 96; z += tileSize) {
                const pos: [number, number, number] = [x, 0, z];
                const isInterX = intersectionPoints.includes(x);
                const isInterZ = intersectionPoints.includes(z);

                // 4-Way Intersection
                if (isInterX && isInterZ) {
                    segments.push(<RoadSegment key={`${x}-${z}`} path={STREET_PATHS.fourWay} position={pos} />);
                }
                // Vertical Roads between intersections
                else if (isInterX) {
                    const crack = Math.random() > 0.8 ? (Math.random() > 0.5 ? STREET_PATHS.straightCrack1 : STREET_PATHS.straightCrack2) : STREET_PATHS.straight;
                    segments.push(<RoadSegment key={`${x}-${z}`} path={crack} position={pos} />);
                }
                // Horizontal Roads between intersections
                else if (isInterZ) {
                    const crack = Math.random() > 0.8 ? (Math.random() > 0.5 ? STREET_PATHS.straightCrack1 : STREET_PATHS.straightCrack2) : STREET_PATHS.straight;
                    segments.push(<RoadSegment key={`${x}-${z}`} path={crack} position={pos} rotation={[0, Math.PI / 2, 0]} />);
                }
            }
        }
        return segments;
    }, []);

    const worldProps = useMemo(() => {
        const props = [];
        const tileSize = 8;

        // Difficulty Settings
        const config = {
            hasTrafficJam: level >= 2,
            trafficJamDensity: level === 2 ? 1 : (level === 3 ? 2 : (level === 4 ? 4 : 6)),
            debrisDensity: level === 1 ? 0.2 : (level === 2 ? 0.8 : (level === 3 ? 1 : (level === 4 ? 2 : 3))),
            hasLandmarks: level >= 2,
            hasBarricades: level >= 3,
            streetLightDensity: level >= 2 ? 1 : 0.5,
        };

        // --- 1. Landmarks ---
        if (config.hasLandmarks) {
            // Water Tower in the top-left lot
            props.push(<Prop key="water-tower" path={PROP_PATHS.waterTower} position={[-34, 0, -34]} scale={1.2} colliderArgs={[2.2, 5, 2.2]} />);

            // Industrial Stack 1: Top Right Lot
            props.push(<Prop key="container-1" path={PROP_PATHS.containerGreen} position={[34, 0, -34]} rotation={[0, Math.PI / 4, 0]} colliderArgs={[1.4, 1.3, 3.2]} />);
            props.push(<Prop key="container-stack-1" path={PROP_PATHS.containerRed} position={[34.5, 2.6, -34.5]} rotation={[0, Math.PI / 4.2, 0]} colliderArgs={[1.4, 1.3, 3.2]} />);
            if (level >= 4) {
                props.push(<Prop key="container-extra-1" path={PROP_PATHS.containerGreen} position={[38, 0, -38]} rotation={[0, -Math.PI / 8, 0]} colliderArgs={[1.4, 1.3, 3.2]} />);
            }

            // Industrial Stack 2: Bottom Left Lot
            props.push(<Prop key="container-3" path={PROP_PATHS.containerGreen} position={[-34, 0, 34]} rotation={[0, Math.PI / 2, 0]} colliderArgs={[1.4, 1.3, 3.2]} />);
            props.push(<Prop key="pipes-2" path={PROP_PATHS.pipes} position={[-36, 0, 36]} rotation={[0, Math.PI / 4, 0]} colliderArgs={[1.8, 0.5, 2.5]} />);
        }

        // --- 2. Intersections & Street Furniture ---
        INTERSECTION_POINTS.forEach(x => {
            INTERSECTION_POINTS.forEach(z => {
                // Traffic Lights
                if ((INTERSECTION_POINTS.indexOf(x) + INTERSECTION_POINTS.indexOf(z)) % (level === 1 ? 4 : 2) === 0) {
                    props.push(<Prop key={`tl-${x}-${z}`} path={PROP_PATHS.trafficLight1} position={[x + 4.5, 0, z + 4.5]} rotation={[0, Math.PI, 0]} colliderArgs={[0.1, 2, 0.1]} />);
                    props.push(<Prop key={`tl2-${x}-${z}`} path={PROP_PATHS.trafficLight1} position={[x - 4.5, 0, z - 4.5]} colliderArgs={[0.1, 2, 0.1]} />);
                }
            });
        });

        // Traffic Jams
        if (config.hasTrafficJam) {
            const jamPoints = [[0, 0]];
            if (level >= 3) jamPoints.push([48, 48], [-48, -48]);
            if (level >= 4) jamPoints.push([24, -24], [-24, 24], [72, 0]);
            if (level >= 5) jamPoints.push([0, 72], [0, -72], [72, 72], [-72, 72]);

            jamPoints.forEach(([jx, jz], idx) => {
                props.push(<Prop key={`jam-${idx}-1`} path={PROP_PATHS.pickupArmored} position={[jx + 1, 0, jz + 1]} rotation={[0, 0.5, 0]} colliderArgs={[1.1, 0.8, 2.4]} />);
                props.push(<Prop key={`jam-${idx}-2`} path={PROP_PATHS.sports} position={[jx - 2, 0, jz + 2]} rotation={[0, -1.2, 0]} colliderArgs={[0.9, 0.6, 2.1]} />);
                props.push(<Prop key={`jam-${idx}-3`} path={PROP_PATHS.truckArmored} position={[jx, 0, jz - 3]} rotation={[0, 0.1, 0]} colliderArgs={[1.4, 1.2, 3.8]} />);
                if (level >= 4) {
                    props.push(<Prop key={`jam-${idx}-4`} path={PROP_PATHS.trafficBarrier1} position={[jx + 3, 0, jz]} rotation={[0, Math.PI / 2, 0]} colliderArgs={[1.8, 0.8, 0.2]} />);
                }
            });
        }

        // Street Lights along roads
        const lightStep = tileSize * (level === 1 ? 4 : 2);
        for (let i = -80; i <= 80; i += lightStep) {
            if (!INTERSECTION_POINTS.includes(i)) {
                props.push(<Prop key={`sl-v-${i}`} path={PROP_PATHS.streetLights} position={[4.5, 0, i]} rotation={[0, -Math.PI / 2, 0]} colliderArgs={[0.1, 2, 0.1]} />);
                props.push(<Prop key={`sl-h-${i}`} path={PROP_PATHS.streetLights} position={[i, 0, 4.5]} colliderArgs={[0.1, 2, 0.1]} />);
            }
        }

        // --- 3. Abandoned Vehicles & Debris ---
        // Only off-road props (vehicles, trash bags) - NO stones/blocks on roads
        const offRoadProps = [
            { path: PROP_PATHS.barrel, scale: 1, colliderArgs: [0.35, 0.6, 0.35] },
            { path: PROP_PATHS.trashBag1, scale: 1.8, colliderArgs: [0.7, 0.5, 0.7] },
            { path: PROP_PATHS.trashBag2, scale: 2, colliderArgs: [0.9, 0.7, 0.9] },
        ];
        const onRoadProps = [
            { path: PROP_PATHS.pickupArmored, colliderArgs: [1.1, 0.8, 2.4] },
            { path: PROP_PATHS.sports, colliderArgs: [0.9, 0.6, 2.1] },
            { path: PROP_PATHS.truckArmored, colliderArgs: [1.4, 1.2, 3.8] },
        ];

        // Add random debris based on density — stones/blocks only off-road
        if (level > 1) {
            const debrisCount = Math.floor(20 * config.debrisDensity);
            for (let i = 0; i < debrisCount; i++) {
                const rx = (Math.random() - 0.5) * 160;
                const rz = (Math.random() - 0.5) * 160;
                const onRoad = isOnRoad(rx, rz);

                // Pick prop type: vehicles can go on roads, trash/barrels off-road only
                const pool = onRoad ? onRoadProps : offRoadProps;
                const item = pool[i % pool.length];

                props.push(
                    <Prop
                        key={`debris-${i}`}
                        path={item.path}
                        position={[rx, 0, rz]}
                        rotation={[0, Math.random() * Math.PI, 0]}
                        scale={(item as any).scale || 1}
                        colliderArgs={item.colliderArgs as any}
                    />
                );
            }
        }

        // --- 4. Barricades & Roadblocks ---
        if (config.hasBarricades) {
            const barricadePoints = [[0, -32]];
            if (level >= 4) barricadePoints.push([32, 0], [-32, 0], [0, 32]);
            if (level >= 5) barricadePoints.push([64, 24], [-64, -24], [24, 64], [-24, -64]);

            barricadePoints.forEach(([bx, bz], idx) => {
                props.push(<Prop key={`barr-${idx}-1`} path={PROP_PATHS.trafficBarrier1} position={[bx, 0, bz]} rotation={[0, Math.PI / 2, 0]} colliderArgs={[1.8, 0.8, 0.2]} />);
                props.push(<Prop key={`barr-${idx}-2`} path={PROP_PATHS.trafficBarrier2} position={[bx + 2, 0, bz + 0.5]} rotation={[0, Math.PI / 2.2, 0]} colliderArgs={[0.8, 0.6, 0.2]} />);
                props.push(<Prop key={`plast-${idx}`} path={PROP_PATHS.plasticBarrier} position={[bx - 4, 0, bz]} rotation={[0, -0.2, 0]} colliderArgs={[0.8, 0.7, 0.2]} />);
                props.push(<Prop key={`cone-${idx}`} path={PROP_PATHS.trafficCone1} position={[bx - 2, 0, bz + 1]} colliderArgs={[0.2, 0.4, 0.2]} />);
            });
        }

        // Town entrance sign
        props.push(<Prop key="town-sign" path={PROP_PATHS.townSign} position={[0, 0, 48]} rotation={[0, Math.PI, 0]} colliderArgs={[3, 2, 0.2]} />);

        return props;
    }, [level]);

    return (
        <>
            {/* Ground */}
            <RigidBody type="fixed" name="ground" restitution={0} friction={1}>
                <mesh receiveShadow position={[0, -0.5, 0]}>
                    <boxGeometry args={[200, 1, 200]} />
                    <meshStandardMaterial map={grassTexture} color={groundColor} />
                </mesh>
                <CuboidCollider args={[100, 0.5, 100]} position={[0, -0.5, 0]} />
            </RigidBody>

            {/* Roads */}
            <RigidBody type="fixed" name="roads">
                {roadLayout}
            </RigidBody>

            {/* Environment Props */}
            <RigidBody type="fixed" name="props">
                {worldProps}
            </RigidBody>

            {/* Boundary Walls - Using thin colliders at the edges */}
            <RigidBody type="fixed" name="boundary">
                <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, -100]} />
                <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, 100]} />
                <CuboidCollider args={[0.5, 10, 100]} position={[100, 5, 0]} />
                <CuboidCollider args={[0.5, 10, 100]} position={[-100, 5, 0]} />
            </RigidBody>
        </>
    );
};

// Preload all assets
[...Object.values(STREET_PATHS), ...Object.values(PROP_PATHS)].forEach((path) => useGLTF.preload(path));
