import * as THREE from 'three'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { RigidBody, CapsuleCollider, RapierRigidBody, useRapier } from '@react-three/rapier'
import { useStore } from '../store'
import { Characters_Lis } from './Characters/Characters_Lis'
import { Characters_GermanShepherd } from './Characters/Characters_GermanShepherd'
import { Characters_Matt } from './Characters/Characters_Matt'
import { Characters_Pug } from './Characters/Characters_Pug'
import { Characters_Sam } from './Characters/Characters_Sam'
import { Characters_Shaun } from './Characters/Characters_Shaun'
import { WeaponMount } from './WeaponMount'
import { Characters_Lis_SingleWeapon } from './Characters/Characters_Lis_SingleWeapon'
import { Characters_Matt_SingleWeapon } from './Characters/Characters_Matt_SingleWeapon'
import { Characters_Sam_SingleWeapon } from './Characters/Characters_Sam_SingleWeapon'
import { Characters_Shaun_SingleWeapon } from './Characters/Characters_Shaun_SingleWeapon'

import { useSocket } from '../hooks/useSocket'

const WALK_SPEED = 2.5
const RUN_SPEED = 6.0

const CharacterModels: Record<string, any> = {
  Lis: { Standard: Characters_Lis, SingleWeapon: Characters_Lis_SingleWeapon },
  Matt: { Standard: Characters_Matt, SingleWeapon: Characters_Matt_SingleWeapon },
  Sam: { Standard: Characters_Sam, SingleWeapon: Characters_Sam_SingleWeapon },
  Shaun: { Standard: Characters_Shaun, SingleWeapon: Characters_Shaun_SingleWeapon },
  Pug: { Standard: Characters_Pug },
  GermanShepherd: { Standard: Characters_GermanShepherd },
}

type WeaponVariant = 'Unarmed' | 'SingleWeapon' | 'Standard'
const WEAPON_VARIANTS: WeaponVariant[] = ['Unarmed', 'SingleWeapon', 'Standard']

/** Map weapon slot → which character model to render */
const VARIANT_MODEL: Record<WeaponVariant, 'Standard' | 'SingleWeapon'> = {
  Unarmed: 'Standard',       // bare hands — use dual-wield model
  SingleWeapon: 'SingleWeapon', // melee
  Standard: 'Standard',     // Ranged weapon (SMG)
}

/** Map weapon slot → attack animation name */
const VARIANT_ATTACK: Record<WeaponVariant, string> = {
  Unarmed: 'Punch',
  SingleWeapon: 'Slash',
  Standard: 'Stab',
}

const JUMP_FORCE = 3

export function Character({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group> }) {
  const rb = useRef<RapierRigidBody>(null!)
  const [animation, setAnimation] = useState('Idle')
  const selectedCharacter = useStore((state) => state.selectedCharacter)
  const selectedVariant = useStore((state) => state.selectedVariant)
  const setSelectedVariant = useStore((state) => state.setSelectedVariant)
  const gamePhase = useStore((state) => state.gamePhase)
  const { rapier, world } = useRapier()

  // Camera rotation state
  const cameraRotation = useRef({ yaw: 0, pitch: -Math.PI / 8 })
  const cameraDistance = 8
  const jumpPressed = useRef(false)

  // Jump & Grounding state
  const isGrounded = useRef(true)
  const inAir = useRef(false)
  const canDoubleJump = useRef(false)

  // Attack state
  const attackPending = useRef(false)

  // Weapon switch helper — cycles through all 3 slots
  const cycleWeapon = useCallback((direction: number) => {
    const currentIdx = WEAPON_VARIANTS.indexOf(selectedVariant as WeaponVariant)
    const nextIdx = (currentIdx + direction + WEAPON_VARIANTS.length) % WEAPON_VARIANTS.length
    setSelectedVariant(WEAPON_VARIANTS[nextIdx])
  }, [selectedVariant, setSelectedVariant])

  // Setup Pointer Lock, Mouse Movement, Weapon Switching
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        cameraRotation.current.yaw -= e.movementX * 0.002
        cameraRotation.current.pitch = Math.max(
          -Math.PI / 2.5,
          Math.min(-0.05, cameraRotation.current.pitch - e.movementY * 0.002)
        )
      }
    }

    const handleCanvasClick = (e: MouseEvent) => {
      if (gamePhase !== 'playing') return
      if (e.button !== 0) return // left click only
      const canvas = document.querySelector('canvas')
      if (!canvas) return
      // If pointer is already locked, fire attack immediately
      if (document.pointerLockElement === canvas) {
        attackPending.current = true
      } else {
        // Lock pointer; attack will fire next click once locked
        canvas.requestPointerLock()
      }
    }

    // Weapon switch: M cycles Unarmed -> Melee -> Ranged
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== 'playing') return
      if (e.code === 'KeyM') cycleWeapon(1)
    }

    // Scroll wheel cycles through weapons
    const handleWheel = (e: WheelEvent) => {
      if (gamePhase !== 'playing') return
      cycleWeapon(e.deltaY > 0 ? 1 : -1)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleCanvasClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleCanvasClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [gamePhase, cycleWeapon, setSelectedVariant])

  const spawnPos = useMemo(() => {
    return [Math.random() * 10 - 5, 5, Math.random() * 10 - 5] as [number, number, number]
  }, [])

  const setPlayerAnimation = useStore((state) => state.setPlayerAnimation)
  const setLocalPlayerPos = useStore((state) => state.setLocalPlayerPos)

  const variants = CharacterModels[selectedCharacter] || CharacterModels.Lis
  const modelKey = VARIANT_MODEL[selectedVariant as WeaponVariant] ?? 'Standard'
  const CharacterModel = variants[modelKey] || variants.Standard

  const [, getKeys] = useKeyboardControls()
  const { broadcast } = useSocket()

  useFrame((state) => {
    if (gamePhase !== 'playing') return
    if (!rb.current || !groupRef.current) return

    const { forward, backward, left, right, sprint, jump, petting, action1, action2, action3, action4, action5, action6, action7, action8, action9, action0 } = getKeys()

    // Broadcast state
    const pos = rb.current.translation()
    const rot = groupRef.current.quaternion
    broadcast([pos.x, pos.y, pos.z], [rot.x, rot.y, rot.z, rot.w])
    setLocalPlayerPos([pos.x, pos.y, pos.z])

    const velocity = rb.current.linvel()

    // Raycast down from slightly below the character's feet to detect floor or props
    const ray = new rapier.Ray(
      { x: pos.x, y: pos.y - 0.05, z: pos.z }, 
      { x: 0, y: -1, z: 0 } 
    )
    // Cast ray up to 0.2 units downwards. 
    const hit = world.castRay(ray, 0.2, true)

    // Grounded if vertical velocity is near zero AND raycast hit something directly below
    const wasGrounded = isGrounded.current
    isGrounded.current = Math.abs(velocity.y) < 0.2 && hit !== null

    if (isGrounded.current && !wasGrounded) {
      canDoubleJump.current = true
    }

    // Jump: apply upward impulse when grounded and Space is pressed
    if (jump && !jumpPressed.current) {
      jumpPressed.current = true
      
      if (isGrounded.current) {
        rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true)
        inAir.current = true
        setAnimation('Jump')
        setPlayerAnimation('Jump')
      } else if (canDoubleJump.current) {
        canDoubleJump.current = false
        // Reset downward velocity slightly before applying second jump
        rb.current.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true)
        rb.current.applyImpulse({ x: 0, y: JUMP_FORCE * 0.9, z: 0 }, true)
        
        // Use a different animation or re-trigger Jump for visual feedback
        setAnimation('Run_Jump')
        setPlayerAnimation('Run_Jump')
      }
    }
    if (!jump) jumpPressed.current = false

    // Detect landing
    if (inAir.current && isGrounded.current && velocity.y > -0.5) {
      inAir.current = false
      setAnimation('Jump_Land')
      setPlayerAnimation('Jump_Land')
    }

    let nextAnimation = animation

    // Left-click attack — use weapon-slot-specific animation
    if (attackPending.current) {
      attackPending.current = false
      const isAnimal = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd'
      const attackAnim = isAnimal ? 'Attack' : (VARIANT_ATTACK[selectedVariant as WeaponVariant] ?? 'Punch')
      setAnimation(attackAnim)
      setPlayerAnimation(attackAnim)
      return // let the one-shot finish, skip movement overrides this frame
    }

    const rawMovement = { x: 0, z: 0 }
    if (forward) rawMovement.z -= 1
    if (backward) rawMovement.z += 1
    if (left) rawMovement.x -= 1
    if (right) rawMovement.x += 1

    const movement = new THREE.Vector3(0, 0, 0)

    if (rawMovement.x !== 0 || rawMovement.z !== 0) {
      // Calculate movement relative to camera yaw
      const yaw = cameraRotation.current.yaw
      const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)

      movement.add(forwardVec.multiplyScalar(-rawMovement.z))
      movement.add(rightVec.multiplyScalar(rawMovement.x))
      movement.normalize()

      const speed = sprint ? RUN_SPEED : WALK_SPEED
      movement.multiplyScalar(speed)

      // Character faces movement direction
      const targetRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(movement.x, movement.z)
      )
      groupRef.current.quaternion.slerp(targetRotation, 0.15)

      // Only set Walk/Run if not jumping
      if (!inAir.current && animation !== 'Jump_Land') {
        nextAnimation = sprint ? 'Run' : 'Walk'
      }
    } else {
      // Handle action shortcuts when not moving
      const isAnimal = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd'

      if (petting) nextAnimation = 'Duck'
      else if (action1) nextAnimation = isAnimal ? 'Attack' : 'Wave'
      else if (action2) nextAnimation = isAnimal ? 'Eating' : 'Punch'
      else if (action3) nextAnimation = isAnimal ? 'Idle_2' : 'Slash'
      else if (action4) nextAnimation = isAnimal ? 'Idle_2_HeadLow' : 'Stab'
      else if (action5) nextAnimation = isAnimal ? 'Run_Jump' : 'Yes'
      else if (action6) nextAnimation = isAnimal ? 'Death' : 'No'
      else if (action7) nextAnimation = isAnimal ? 'HitReact_Left' : 'Duck'
      else if (action8) nextAnimation = isAnimal ? 'HitReact_Right' : 'HitReact'
      else if (action9) nextAnimation = isAnimal ? 'Walk' : 'Death'
      else if (action0) nextAnimation = 'Idle'
      else if (!inAir.current && animation !== 'Jump_Land' && (animation === 'Walk' || animation === 'Run')) {
        nextAnimation = 'Idle'
      }
    }

    if (nextAnimation !== animation) {
      setAnimation(nextAnimation)
      setPlayerAnimation(nextAnimation)
    }

    rb.current.setLinvel({ x: movement.x, y: rb.current.linvel().y, z: movement.z }, true)

    // Camera follow - Orbit logic
    const characterPosition = new THREE.Vector3()
    groupRef.current.getWorldPosition(characterPosition)

    // Calculate camera position based on orbit
    const { yaw, pitch } = cameraRotation.current
    const cameraOffset = new THREE.Vector3(0, 0, cameraDistance)
    cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch)
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)

    const targetCameraPosition = characterPosition.clone().add(cameraOffset)

    // Simple Camera Ground-Plane Clamp
    // Ensure the camera never goes below y=0.5 to prevent "below ground" view
    if (targetCameraPosition.y < 0.5) targetCameraPosition.y = 0.5

    state.camera.position.lerp(targetCameraPosition, 0.1)
    state.camera.lookAt(characterPosition.x, characterPosition.y + 1, characterPosition.z)
  })

  if (gamePhase !== 'playing') return null

  return (
    <RigidBody
      ref={rb}
      colliders={false}
      enabledRotations={[false, false, false]}
      position={spawnPos}
      restitution={0}
      friction={1}
      linearDamping={0.5}
      ccd={true}
    >
      <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      <group ref={groupRef}>
        <CharacterModel
          animation={animation}
          weaponSlot={selectedVariant}
          onAnimationFinished={(name: string) => {
            const isOneShot = !['Idle', 'Run', 'Walk', 'Idle_2', 'Idle_2_HeadLow'].includes(name)
            if (isOneShot) {
              setAnimation('Idle')
              setPlayerAnimation('Idle')
            }
          }}
        />
        {(selectedCharacter !== 'Pug' && selectedCharacter !== 'GermanShepherd') && (
          <WeaponMount characterGroupRef={groupRef} />
        )}
      </group>
    </RigidBody>
  )
}
