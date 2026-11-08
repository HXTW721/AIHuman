import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF, useAnimations } from '@react-three/drei'
import { EMOTIONS } from '../data/emotions'
import { mood } from '../mood'
import { useCompanion } from '../store/companion'

const MODEL_URL = '/models/RobotExpressive.glb'

/**
 * 第二个角色：RobotExpressive。
 *
 * 选它的理由是它拥有 12 段内置动画（Idle / Dance / Wave / Punch / Jump /
 * Sitting / Sad_pose …），情绪可以由真实动作表达，而不是只靠换颜色。
 * 为了不像官方 demo，这里做了三件事：
 *   1. 材质改成偏磨砂的金属，并压低原色
 *   2. 颜色与自发光跟着情绪主色走
 *   3. 整体朝向、缩放、弹跳由情绪参数驱动
 */
export function RobotCreature() {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions } = useAnimations(animations, group)
  const emotion = useCompanion(s => s.emotion)
  const materials = useRef<Array<{ mat: THREE.MeshStandardMaterial; base: THREE.Color }>>([])
  const face = useRef<{ mesh: THREE.Mesh | null; index: Record<string, number> }>({
    mesh: null,
    index: {},
  })

  const { scale, offsetY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = 2.45 / Math.max(size.y, 0.001)
    return { scale: s, offsetY: -1.1 - box.min.y * s }
  }, [scene])

  useMemo(() => {
    const list: Array<{ mat: THREE.MeshStandardMaterial; base: THREE.Color }> = []
    scene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return
      const dict = obj.morphTargetDictionary
      if (dict && 'Angry' in dict) {
        face.current = { mesh: obj, index: dict }
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial
        if (!mat?.isMeshStandardMaterial) continue
        mat.roughness = Math.min(1, (mat.roughness ?? 0.5) + 0.2)
        mat.metalness = Math.min(1, (mat.metalness ?? 0.2) + 0.3)
        mat.emissive = new THREE.Color('#000000')
        list.push({ mat, base: mat.color.clone() })
      }
    })
    materials.current = list
  }, [scene])

  useEffect(() => {
    const clip = EMOTIONS[emotion].clip
    const action = actions[clip] ?? actions['Idle']
    if (!action) return
    action.reset().setEffectiveWeight(1).fadeIn(0.45).play()
    return () => {
      action.fadeOut(0.45)
    }
  }, [emotion, actions])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const p = mood.current

    if (group.current) {
      group.current.position.y = offsetY + Math.abs(Math.sin(t * 2.4)) * 0.05 * p.bounce
      group.current.rotation.y = mood.pointer.x * 0.18 + Math.sin(t * 0.5) * 0.03
      group.current.scale.setScalar((0.94 + p.size * 0.06) * scale)
    }

    for (const { mat, base } of materials.current) {
      mat.color.copy(base).lerp(mood.glow, 0.15)
      mat.emissive.copy(mood.glow)
      mat.emissiveIntensity = 0.04 + p.glow * 0.12
    }

    // 头部三个表情 morph：Angry / Surprised / Sad
    const f = face.current
    if (f.mesh?.morphTargetInfluences) {
      const desired: Record<string, number> = {
        Angry: emotion === 'angry' ? 1 : 0,
        Surprised: emotion === 'surprised' ? 1 : 0,
        Sad: emotion === 'sad' ? 1 : 0,
      }
      const k = 1 - Math.exp(-dt * 10)
      for (const [name, idx] of Object.entries(f.index)) {
        const target = desired[name] ?? 0
        const current = f.mesh.morphTargetInfluences[idx] ?? 0
        f.mesh.morphTargetInfluences[idx] = current + (target - current) * k
      }
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
