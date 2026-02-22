import * as THREE from 'three'
import { useRef, useState } from 'react'
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

export function Character() {
  const group = useRef<THREE.Group>(null!)
  const rb = useRef<RapierRigidBody>(null!)
  const [animation, setAnimation] = useState('Idle')
  const selectedCharacter = useStore((state) => state.selectedCharacter)
  const selectedVariant = useStore((state) => state.selectedVariant)

  const variants = CharacterModels[selectedCharacter] || CharacterModels.Lis
  const CharacterModel = variants[selectedVariant] || variants.Standard

  const [, getKeys] = useKeyboardControls()

  useFrame((state) => {
    if (!rb.current || !group.current) return

    const { forward, backward, left, right, sprint, action1, action2, action3, action4, action5, action6, action7, action8, action9, action0 } = getKeys()

    const velocity = rb.current.linvel()
    const movement = new THREE.Vector3(0, 0, 0)

    if (forward) movement.z -= 1
    if (backward) movement.z += 1
    if (left) movement.x -= 1
    if (right) movement.x += 1

    if (movement.length() > 0) {
      const speed = sprint ? RUN_SPEED : WALK_SPEED
      movement.normalize().multiplyScalar(speed)

      // Calculate rotation
      const angle = Math.atan2(movement.x, movement.z)
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      group.current.quaternion.slerp(rotation, 0.1)

      const targetAnim = sprint ? 'Run' : 'Walk'
      if (animation !== targetAnim) setAnimation(targetAnim)
    } else {
      // Handle action shortcuts when not moving
      const isAnimal = selectedCharacter === 'Pug' || selectedCharacter === 'GermanShepherd'
      let nextAnimation = animation

      if (action1) nextAnimation = isAnimal ? 'Attack' : 'Wave'
      if (action2) nextAnimation = isAnimal ? 'Eating' : 'Punch'
      if (action3) nextAnimation = isAnimal ? 'Idle_2' : 'Slash'
      if (action4) nextAnimation = isAnimal ? 'Idle_2_HeadLow' : 'Stab'
      if (action5) nextAnimation = isAnimal ? 'Run_Jump' : 'Yes'
      if (action6) nextAnimation = isAnimal ? 'Death' : 'No'
      if (action7) nextAnimation = isAnimal ? 'HitReact_Left' : 'Duck'
      if (action8) nextAnimation = isAnimal ? 'HitReact_Right' : 'HitReact'
      if (action9) nextAnimation = isAnimal ? 'Walk' : 'Death'
      if (action0) nextAnimation = 'Idle'

      if (nextAnimation !== animation) {
        setAnimation(nextAnimation)
      } else if (animation === 'Walk' || animation === 'Run') {
        // If we were walking or running but movement stopped, return to Idle
        setAnimation('Idle')
      }
    }

    rb.current.setLinvel({ x: movement.x, y: velocity.y, z: movement.z }, true)

    // Camera follow - using visual group position for interpolation
    const characterPosition = new THREE.Vector3()
    group.current.getWorldPosition(characterPosition)

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
      position={[0, 2, 0]}
      restitution={0}
      friction={1}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      <group ref={group}>
        <CharacterModel
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
