import * as THREE from 'three'
import React, { useEffect } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

export function Characters_Sam({ animation, weaponSlot, onAnimationFinished, ...props }: any) {
  const group = React.useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Characters_Sam-transformed.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as any
  const { actions, mixer } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions[animation]
    if (!action) return

    const isOneShot = !['Idle', 'Run', 'Walk'].includes(animation)

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

    const WEAPON_NODE_NAMES = ['Axe', 'Guitar', 'Knife', 'Pistol', 'SMG', 'Rifle', 'Spear', 'WoodenBat'];
    useEffect(() => {
        if (!nodes.Root) return;
        nodes.Root.traverse((child: any) => {
            if (WEAPON_NODE_NAMES.includes(child.name)) {
                child.visible = (weaponSlot === 'SingleWeapon');
            }
        });
    }, [weaponSlot, nodes]);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh name="Sam" geometry={nodes.Sam.geometry} material={materials.Atlas} skeleton={nodes.Sam.skeleton} castShadow receiveShadow />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Characters_Sam-transformed.glb')
