import React, { useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

interface WeaponMountProps {
  characterGroupRef: React.RefObject<THREE.Group>
}

// Bone names to search for, in priority order
const HAND_BONE_NAMES = ['Index1.R', 'Index1_R', 'Hand_R', 'LowerArm.R']

// Reusable temp objects — avoid per-frame allocations
const _boneWorldPos = new THREE.Vector3()
const _boneWorldQuat = new THREE.Quaternion()
const _parentWorldPos = new THREE.Vector3()
const _parentWorldQuat = new THREE.Quaternion()
const _parentWorldQuatInv = new THREE.Quaternion()

export function WeaponMount({ characterGroupRef }: WeaponMountProps) {
  const selectedVariant = useStore((state) => state.selectedVariant)
  const weaponRef = useRef<THREE.Group>(null!)

  const { scene: pistolScene } = useGLTF('/weapons/Pistol.gltf')

  const pistolClone = useMemo(() => {
    const clone = pistolScene.clone()
    clone.name = 'Pistol'
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.name = 'PistolMesh'
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [pistolScene])

  // Cache the bone ref so we don't traverse every frame once found
  const boneRef = useRef<THREE.Object3D | null>(null)
  const lastSkeletonId = useRef<string | null>(null)

  // Each frame: find the right-hand bone, read its world transform,
  // and apply it to the weapon group (converted to local space).
  // This avoids the React ↔ Three.js scene-graph conflict that handBone.add() causes.
  useFrame(() => {
    if (!characterGroupRef.current || !weaponRef.current) return
    if (selectedVariant !== 'Standard') return

    // Re-find bone if character model changed (skeleton swap)
    const skeletonId = characterGroupRef.current.uuid
    if (lastSkeletonId.current !== skeletonId) {
      boneRef.current = null
      lastSkeletonId.current = skeletonId
    }

    // Find the hand bone (cached after first find)
    if (!boneRef.current) {
      for (const boneName of HAND_BONE_NAMES) {
        characterGroupRef.current.traverse((child) => {
          if (!boneRef.current && child.name === boneName) {
            boneRef.current = child
          }
        })
        if (boneRef.current) break
      }
    }

    const handBone = boneRef.current
    if (!handBone) return

    // Get bone world position and quaternion
    handBone.getWorldPosition(_boneWorldPos)
    handBone.getWorldQuaternion(_boneWorldQuat)

    // Convert to local space of weapon's parent (the character group)
    const parent = weaponRef.current.parent
    if (parent) {
      parent.getWorldPosition(_parentWorldPos)
      parent.getWorldQuaternion(_parentWorldQuat)
      _parentWorldQuatInv.copy(_parentWorldQuat).invert()

      // Local position = parentQuatInverse * (boneWorldPos - parentWorldPos)
      weaponRef.current.position
        .copy(_boneWorldPos)
        .sub(_parentWorldPos)
        .applyQuaternion(_parentWorldQuatInv)

      // Local rotation = parentQuatInverse * boneWorldQuat
      weaponRef.current.quaternion
        .copy(_parentWorldQuatInv)
        .multiply(_boneWorldQuat)
    }
  })

  // Don't render anything if not in ranged mode
  if (selectedVariant !== 'Standard') return null

  return (
    <group ref={weaponRef}>
      <primitive
        object={pistolClone}
        position={[0, 0.02, 0.05]}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        scale={[0.3, 0.3, 0.3]}
      />
    </group>
  )
}

useGLTF.preload('/weapons/Pistol.gltf')
