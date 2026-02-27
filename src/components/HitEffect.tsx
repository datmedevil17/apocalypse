import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Particle {
  id: number
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: string
}

interface HitParticleSystemProps {
  position: THREE.Vector3
  onDone: () => void
  death?: boolean
}

/** Burst of particles at attack impact point */
function HitParticleSystem({ position, onDone, death = false }: HitParticleSystemProps) {
  const count = death ? 18 : 10
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const speed = death ? (Math.random() * 4 + 2) : (Math.random() * 3 + 1)
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const elevation = Math.random() * Math.PI * 0.5
      return {
        id: i,
        pos: position.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed * 0.8 + 1,
          Math.sin(angle) * Math.cos(elevation) * speed
        ),
        life: 1.0,
        maxLife: death ? (0.4 + Math.random() * 0.4) : (0.25 + Math.random() * 0.2),
        size: death ? (0.06 + Math.random() * 0.06) : (0.04 + Math.random() * 0.04),
        color: death ? '#ff0000' : (Math.random() > 0.3 ? '#cc0000' : '#880000'),
      }
    })
  }, [])

  const stateRef = useRef(particles.map(p => ({ ...p, pos: p.pos.clone() })))
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const done = useRef(false)

  useFrame((_, delta) => {
    if (done.current) return
    let allDead = true
    stateRef.current.forEach((p, i) => {
      if (p.life <= 0) return
      allDead = false
      // Update position
      p.pos.addScaledVector(p.vel, delta)
      p.vel.y -= 9.8 * delta // gravity
      p.vel.multiplyScalar(0.92) // drag
      p.life -= delta / p.maxLife

      const mesh = meshRefs.current[i]
      if (mesh) {
        mesh.position.copy(p.pos)
        const scale = Math.max(0, p.life) * p.size
        mesh.scale.setScalar(scale * 10)
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life)
      }
    })
    if (allDead && !done.current) {
      done.current = true
      onDone()
    }
  })

  return (
    <>
      {particles.map((p, i) => (
        <mesh
          key={p.id}
          ref={el => { meshRefs.current[i] = el }}
          position={p.pos.clone()}
        >
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshBasicMaterial color={p.color} transparent opacity={1} />
        </mesh>
      ))}
    </>
  )
}

/** Manager: call spawnHit() to add a new burst */
export function useHitEffects() {
  const [effects, setEffects] = useState<{ id: number; pos: THREE.Vector3; death: boolean }[]>([])
  const nextId = useRef(0)

  const spawnHit = (pos: THREE.Vector3, death = false) => {
    const id = nextId.current++
    setEffects(prev => [...prev, { id, pos: pos.clone(), death }])
  }

  const HitEffects = () => (
    <>
      {effects.map(e => (
        <HitParticleSystem
          key={e.id}
          position={e.pos}
          death={e.death}
          onDone={() => setEffects(prev => prev.filter(x => x.id !== e.id))}
        />
      ))}
    </>
  )

  return { spawnHit, HitEffects }
}
