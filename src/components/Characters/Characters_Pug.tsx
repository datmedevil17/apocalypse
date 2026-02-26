import * as THREE from 'three'
import React, { useEffect } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

export function Characters_Pug({ animation, onAnimationFinished, ...props }: any) {
  const group = React.useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Characters_Pug-transformed.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as any
  const { actions, mixer } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions[animation]
    if (!action) return
    const isOneShot = !['Idle', 'Run', 'Walk', 'Idle_2', 'Idle_2_HeadLow'].includes(animation)

    action.reset().fadeIn(0.24).play()

    if (isOneShot) {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
    }

    return () => {
      action.fadeOut(0.24)
    }
  }, [animation, actions])

  useEffect(() => {
    const handleFinished = (e: any) => {
      if (onAnimationFinished) onAnimationFinished(e.action.getClip().name)
    }
    mixer.addEventListener('finished', handleFinished)
    return () => mixer.removeEventListener('finished', handleFinished)
  }, [mixer, onAnimationFinished])

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="AnimalArmature">
          <primitive object={nodes.Body} />
          <primitive object={nodes.IKBackLegL} />
          <primitive object={nodes.IKFrontLegL} />
          <primitive object={nodes.IKBackLegR} />
          <primitive object={nodes.IKFrontLegR} />
        </group>
        <skinnedMesh name="Pug" geometry={nodes.Pug.geometry} material={materials.Atlas} skeleton={nodes.Pug.skeleton} castShadow receiveShadow />
        <skinnedMesh name="Pug001" geometry={nodes.Pug001.geometry} material={materials.Atlas} skeleton={nodes.Pug001.skeleton} castShadow receiveShadow />
        <skinnedMesh name="Pug002" geometry={nodes.Pug002.geometry} material={materials.Atlas} skeleton={nodes.Pug002.skeleton} castShadow receiveShadow />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Characters_Pug-transformed.glb')
