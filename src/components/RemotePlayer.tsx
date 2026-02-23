import * as THREE from 'three'
import type { PlayerState } from '../store'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier'
import { Characters_Lis } from './Characters/Characters_Lis'
import { Characters_GermanShepherd } from './Characters/Characters_GermanShepherd'
import { Characters_Matt } from './Characters/Characters_Matt'
import { Characters_Pug } from './Characters/Characters_Pug'
import { Characters_Sam } from './Characters/Characters_Sam'
import { Characters_Shaun } from './Characters/Characters_Shaun'

const CharacterModels: Record<string, any> = {
    Lis: Characters_Lis,
    Matt: Characters_Matt,
    Sam: Characters_Sam,
    Shaun: Characters_Shaun,
    Pug: Characters_Pug,
    GermanShepherd: Characters_GermanShepherd,
}

// RemotePlayer state is now imported from store.ts

export function RemotePlayer({ state }: { state: PlayerState }) {
    const rb = useRef<RapierRigidBody>(null!)
    const petRb = useRef<RapierRigidBody>(null!)
    const group = useRef<THREE.Group>(null!)
    const petGroup = useRef<THREE.Group>(null!)

    const CharacterModel = CharacterModels[state.selectedCharacter] || Characters_Lis
    const PetModel = CharacterModels[state.selectedPet] || Characters_Pug

    useFrame(() => {
        if (!group.current || !rb.current) return

        // Smoothly lerp towards the reported position and rotation
        const targetPos = new THREE.Vector3(...state.position)
        const targetRot = new THREE.Quaternion(...state.rotation)

        // Interpolate current position for smoothness
        const currentPos = new THREE.Vector3().copy(rb.current.translation())
        const currentRot = new THREE.Quaternion().copy(rb.current.rotation())

        currentPos.lerp(targetPos, 0.15)
        currentRot.slerp(targetRot, 0.15)

        // Update physics body - this ensures the collider moves with the visual model
        rb.current.setNextKinematicTranslation(currentPos)
        rb.current.setNextKinematicRotation(currentRot)

        // Sync local visual group to identity since RigidBody now handles it
        group.current.position.set(0, 0, 0)
        group.current.quaternion.set(0, 0, 0, 1)

        // Sync pet for remote players
        if (petGroup.current && petRb.current) {
            // Use synced pet state if available, fallback to follow logic for backward compatibility
            const targetPetPos = state.petPosition ? new THREE.Vector3(...state.petPosition) : null
            const targetPetRot = state.petRotation ? new THREE.Quaternion(...state.petRotation) : null

            if (targetPetPos && targetPetRot) {
                // Smoothly lerp pet
                const currentPetPos = new THREE.Vector3().copy(petRb.current.translation())
                const currentPetRot = new THREE.Quaternion().copy(petRb.current.rotation())

                currentPetPos.lerp(targetPetPos, 0.1)
                currentPetRot.slerp(targetPetRot, 0.1)

                petRb.current.setNextKinematicTranslation(currentPetPos)
                petRb.current.setNextKinematicRotation(currentPetRot)
            } else {
                // Fallback follow logic
                const petOffset = new THREE.Vector3(1.2, 0, 1.2).applyQuaternion(currentRot)
                const fallbackTargetPetPos = currentPos.clone().add(petOffset)

                const currentPetPos = new THREE.Vector3().copy(petRb.current.translation())
                currentPetPos.lerp(fallbackTargetPetPos, 0.1)

                petRb.current.setNextKinematicTranslation(currentPetPos)
                const petLookAt = new THREE.Quaternion().setFromRotationMatrix(
                    new THREE.Matrix4().lookAt(currentPetPos, currentPos, new THREE.Vector3(0, 1, 0))
                )
                petRb.current.setNextKinematicRotation(petLookAt)
            }

            petGroup.current.position.set(0, 0, 0)
            petGroup.current.quaternion.set(0, 0, 0, 1)
        }
    })

    return (
        <>
            <RigidBody
                ref={rb}
                type="kinematicPosition"
                colliders={false}
                position={state.position}
            >
                <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.9, 0]} />
                <group ref={group}>
                    <CharacterModel animation={state.animation} />
                </group>
            </RigidBody>

            <RigidBody
                ref={petRb}
                type="kinematicPosition"
                colliders={false}
                position={state.position} // Initial pos doesn't matter much as it's kinematic and updated
            >
                <CapsuleCollider args={[0.3, 0.2]} position={[0, 0.4, 0]} />
                <group ref={petGroup}>
                    <PetModel animation={state.petAnimation || (state.animation === 'Run' ? 'Run' : state.animation === 'Walk' ? 'Walk' : 'Idle')} />
                </group>
            </RigidBody>
        </>
    )
}
