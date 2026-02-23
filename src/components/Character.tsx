import * as THREE from 'three'
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier'
import { useStore } from '../store'
import { Characters_Lis } from './Characters/Characters_Lis'
import { Characters_GermanShepherd } from './Characters/Characters_GermanShepherd'
import { Characters_Matt } from './Characters/Characters_Matt'
import { Characters_Pug } from './Characters/Characters_Pug'
import { Characters_Sam } from './Characters/Characters_Sam'
import { Characters_Shaun } from './Characters/Characters_Shaun'
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

export function Character({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group> }) {
  const rb = useRef<RapierRigidBody>(null!)
  const [animation, setAnimation] = useState('Idle')
  const selectedCharacter = useStore((state) => state.selectedCharacter)
  const selectedVariant = useStore((state) => state.selectedVariant)

  const spawnPos = useMemo(() => {
    return [Math.random() * 10 - 5, 5, Math.random() * 10 - 5] as [number, number, number]
  }, [])

  const setPlayerAnimation = useStore((state) => state.setPlayerAnimation)
  const setLocalPlayerPos = useStore((state) => state.setLocalPlayerPos)

  const variants = CharacterModels[selectedCharacter] || CharacterModels.Lis
  const CharacterModel = variants[selectedVariant] || variants.Standard

  const [, getKeys] = useKeyboardControls()
  const { broadcast } = useSocket()

  useFrame((state) => {
    if (!rb.current || !groupRef.current) return

    const { forward, backward, left, right, sprint, petting, action1, action2, action3, action4, action5, action6, action7, action8, action9, action0 } = getKeys()

    // Broadcast state
    const pos = rb.current.translation()
    const rot = groupRef.current.quaternion
    broadcast([pos.x, pos.y, pos.z], [rot.x, rot.y, rot.z, rot.w])
    setLocalPlayerPos([pos.x, pos.y, pos.z])

    // Camera follow ...

    const velocity = rb.current.linvel()
    const movement = new THREE.Vector3(0, 0, 0)

    if (forward) movement.z -= 1
    if (backward) movement.z += 1
    if (left) movement.x -= 1
    if (right) movement.x += 1

    let nextAnimation = animation

    if (movement.length() > 0) {
      const speed = sprint ? RUN_SPEED : WALK_SPEED
      movement.normalize().multiplyScalar(speed)

      // Calculate rotation
      const angle = Math.atan2(movement.x, movement.z)
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      groupRef.current.quaternion.slerp(rotation, 0.1)

      nextAnimation = sprint ? 'Run' : 'Walk'
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
      else if (animation === 'Walk' || animation === 'Run') {
        nextAnimation = 'Idle'
      }
    }

    if (nextAnimation !== animation) {
      setAnimation(nextAnimation)
      setPlayerAnimation(nextAnimation)
    }

    rb.current.setLinvel({ x: movement.x, y: velocity.y, z: movement.z }, true)

    // Camera follow - using visual group position for interpolation
    const characterPosition = new THREE.Vector3()
    groupRef.current.getWorldPosition(characterPosition)

    const cameraOffset = new THREE.Vector3(0, 5, 8)
    const targetCameraPosition = characterPosition.clone().add(cameraOffset)

    state.camera.position.lerp(targetCameraPosition, 0.1)
    state.camera.lookAt(characterPosition.x, characterPosition.y + 1, characterPosition.z)
  })

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
          onAnimationFinished={(name: string) => {
            const isOneShot = !['Idle', 'Run', 'Walk', 'Idle_2', 'Idle_2_HeadLow'].includes(name)
            if (isOneShot) {
              setAnimation('Idle')
              setPlayerAnimation('Idle')
            }
          }}
        />
      </group>
    </RigidBody>
  )
}
