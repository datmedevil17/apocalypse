import * as THREE from 'three'
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { useKeyboardControls, Html } from '@react-three/drei'
import { useStore } from '../store'
import { Characters_Pug } from './Characters/Characters_Pug'
import { Characters_GermanShepherd } from './Characters/Characters_GermanShepherd'

const PetModels: Record<string, any> = {
    Pug: Characters_Pug,
    GermanShepherd: Characters_GermanShepherd,
}

const EMOJI_MAP: Record<string, string> = {
    love: "❤️",
    sleepy: "💤",
    roaming: "🦴",
    confused: "❓",
    excited: "✨",
}

export function Pet({ playerRef }: { playerRef: React.MutableRefObject<THREE.Group> }) {
    const rb = useRef<RapierRigidBody>(null!)
    const group = useRef<THREE.Group>(null!)
    const [animation, setAnimation] = useState('Idle')
    const lastPlayerMoveTime = useRef(Date.now())
    const [emoji, setEmoji] = useState<string | null>(null)
    const selectedPet = useStore((state) => state.selectedPet)
    const playerAnimation = useStore((state) => state.playerAnimation)
    const PetModel = PetModels[selectedPet] || Characters_Pug
    const [, getKeys] = useKeyboardControls()
    const setLocalPetState = useStore((state) => state.setLocalPetState)

    const petSpawnPos = useMemo(() => {
        return [Math.random() * 10 - 5, 5, Math.random() * 10 - 5] as [number, number, number]
    }, [])

    // AI State
    const [roamingTarget, setRoamingTarget] = useState<THREE.Vector3 | null>(null)
    const [isCalled, setIsCalled] = useState(false)
    const [isSitting, setIsSitting] = useState(false)

    const idleTimer = useRef(0)
    const lastPlayerPos = useRef(new THREE.Vector3())
    // Stabilization state
    const smoothedTarget = useRef(new THREE.Vector3())
    const currentVelocity = useRef(new THREE.Vector3())
    const [isFollowing, setIsFollowing] = useState(false)

    const tempVec = new THREE.Vector3()
    const tempQuat = new THREE.Quaternion()

    useFrame((_, delta) => {
        if (!rb.current || !playerRef.current || !group.current) return

        const { callPet, petting } = getKeys()
        const playerPos = playerRef.current.getWorldPosition(tempVec)
        const petPos = rb.current.translation()
        const petPosVec = new THREE.Vector3(petPos.x, petPos.y, petPos.z)
        const distToPlayer = petPosVec.distanceTo(playerPos)

        // Sync timers
        const playerMoved = lastPlayerPos.current.distanceTo(playerPos) > 0.05
        if (playerMoved) {
            lastPlayerMoveTime.current = Date.now()
            lastPlayerPos.current.copy(playerPos)
            setIsSitting(false)
            setIsCalled(false)
            setRoamingTarget(null)
        }

        let speed = 0
        let nextAnimation = isSitting ? 'Idle_2' : 'Idle'
        let targetPos = new THREE.Vector3()
        let isMoving = false
        let currentEmoji = null

        // PETTING LOGIC
        if (petting && distToPlayer < 2) {
            nextAnimation = 'Idle_2_HeadLow'
            currentEmoji = EMOJI_MAP.love
            speed = 0
            isMoving = false
            setIsFollowing(false)
        }
        // CALL LOGIC
        else if (callPet || isCalled) {
            if (callPet) setIsCalled(true)
            targetPos.copy(playerPos).add(new THREE.Vector3(1, 0, 1))
            if (petPosVec.distanceTo(targetPos) > 0.8) {
                speed = 6
                nextAnimation = 'Run'
                isMoving = true
                currentEmoji = EMOJI_MAP.excited
            } else {
                setIsCalled(false)
            }
        }
        // EMOTE SYNC
        else if (playerAnimation === 'Wave' && distToPlayer < 4) {
            nextAnimation = 'Idle_2'
            setIsFollowing(false)
        }
        else if ((playerAnimation === 'Punch' || playerAnimation === 'Slash') && distToPlayer < 4) {
            nextAnimation = 'Attack'
            setIsFollowing(false)
        }
        // FOLLOW LOGIC
        else if (Date.now() - lastPlayerMoveTime.current < 1000) {
            const playerRot = playerRef.current.getWorldQuaternion(tempQuat)
            const offset = new THREE.Vector3(1.5, 0, 1.5).applyQuaternion(playerRot)
            targetPos.copy(playerPos).add(offset)

            const dist = petPosVec.distanceTo(targetPos)

            // Hysteresis logic
            if (dist > 5) {
                rb.current.setTranslation({ x: targetPos.x, y: targetPos.y + 1, z: targetPos.z }, true)
                setIsFollowing(false)
            } else if (dist > 1.5) {
                setIsFollowing(true)
            } else if (dist < 0.8) {
                setIsFollowing(false)
            }

            if (isFollowing) {
                const isPlayerRunning = playerAnimation === 'Run'
                speed = isPlayerRunning ? 6 : 2.5
                nextAnimation = isPlayerRunning ? 'Run' : 'Walk'

                if (dist > 3 && !isPlayerRunning) {
                    speed = 4
                    nextAnimation = 'Run'
                }
                isMoving = true
            }
        }
        // ROAMING / ADAPTIVE AI
        else {
            idleTimer.current += delta
            if (idleTimer.current > 15) {
                setIsSitting(true)
                currentEmoji = EMOJI_MAP.sleepy
            }

            if (!isSitting) {
                if (!roamingTarget || petPosVec.distanceTo(roamingTarget) < 0.5) {
                    if (Math.random() > 0.99) {
                        const angle = Math.random() * Math.PI * 2
                        const d = 2 + Math.random() * 3
                        setRoamingTarget(playerPos.clone().add(new THREE.Vector3(Math.cos(angle) * d, 0, Math.sin(angle) * d)))
                    }
                }

                if (roamingTarget) {
                    targetPos.copy(roamingTarget)
                    speed = 2.5
                    nextAnimation = 'Walk'
                    isMoving = true
                    currentEmoji = EMOJI_MAP.roaming
                }
            }
        }

        // Apply movement with smoothing
        if (isMoving) {
            // Smooth target interpolation
            smoothedTarget.current.lerp(targetPos, 0.1)

            const dir = smoothedTarget.current.clone().sub(petPosVec).normalize()
            const targetVelocity = dir.multiplyScalar(speed)

            // Velocity damping
            currentVelocity.current.lerp(targetVelocity, 0.1)
            rb.current.setLinvel({ x: currentVelocity.current.x, y: rb.current.linvel().y, z: currentVelocity.current.z }, true)

            // Frame-rate independent rotation slerp
            const angle = Math.atan2(dir.x, dir.z)
            const targetRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
            const slerpFactor = 1 - Math.pow(0.001, delta)
            group.current.quaternion.slerp(targetRot, slerpFactor)

            setIsSitting(false)
            idleTimer.current = 0
        } else {
            currentVelocity.current.lerp(new THREE.Vector3(0, 0, 0), 0.2)
            rb.current.setLinvel({ x: currentVelocity.current.x, y: rb.current.linvel().y, z: currentVelocity.current.z }, true)
        }

        if (animation !== nextAnimation) setAnimation(nextAnimation)
        if (emoji !== currentEmoji) setEmoji(currentEmoji)

        // Sync local pet state to store for broadcasting
        const currentPetPos = rb.current.translation()
        const currentPetRot = group.current.quaternion
        setLocalPetState(
            [currentPetPos.x, currentPetPos.y, currentPetPos.z],
            [currentPetRot.x, currentPetRot.y, currentPetRot.z, currentPetRot.w],
            animation
        )
    })

    return (
        <RigidBody
            ref={rb}
            colliders={false}
            enabledRotations={[false, false, false]}
            position={petSpawnPos}
            linearDamping={2}
            friction={1}
            ccd={true}
            name="pet"
        >
            <CapsuleCollider args={[0.3, 0.2]} position={[0, 0.4, 0]} />
            <group ref={group}>
                {emoji && (
                    <Html position={[0, 1.2, 0]} center distanceFactor={10}>
                        <div style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            backdropFilter: "blur(10px)",
                            padding: "8px 12px",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            animation: "float 2s infinite ease-in-out",
                            userSelect: "none",
                            pointerEvents: "none"
                        }}>
                            {emoji}
                            <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-5px); }
                }
              `}</style>
                        </div>
                    </Html>
                )}
                <PetModel
                    animation={animation}
                    onAnimationFinished={(name: string) => {
                        const isOneShot = !['Idle', 'Run', 'Walk', 'Idle_2', 'Idle_2_HeadLow'].includes(name)
                        if (isOneShot) setAnimation('Idle')
                    }}
                />
            </group>
        </RigidBody>
    )
}
