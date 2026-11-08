import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RobotCreature } from './RobotCreature'
import { mood } from '../mood'

function TintLight() {
  const light = useRef<THREE.PointLight>(null)
  useFrame(() => {
    if (!light.current) return
    light.current.color.copy(mood.glow)
    light.current.intensity = 3 + mood.current.glow * 9
  })
  return (
    <pointLight
      ref={light}
      position={[-2.2, 1.6, -1.4]}
      distance={10}
      decay={2}
      intensity={6}
    />
  )
}

/** 桌子右侧的小舞台：透明背景，只渲染机器人和它自己的补光。 */
export function RobotStage() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 6.3], fov: 30, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1
      }}
    >
      <ambientLight intensity={1.2} color="#cfe0ff" />
      <directionalLight position={[2.4, 4, 3]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#7f9dff" />
      <TintLight />
      <Suspense fallback={null}>
        <RobotCreature />
      </Suspense>
    </Canvas>
  )
}
