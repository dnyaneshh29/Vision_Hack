import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere, Float, Stars, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15
    }
  })

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1.8, 64, 64]}>
        <MeshDistortMaterial
          color="#7c5cfc"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          wireframe={true}
          emissive="#7c5cfc"
          emissiveIntensity={0.5}
          transparent={true}
          opacity={0.3}
        />
      </Sphere>
    </Float>
  )
}

function InnerSolidSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * -0.2
      meshRef.current.rotation.y = state.clock.getElapsedTime() * -0.1
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.3, 32, 32]}>
        <meshStandardMaterial
          color="#06b6d4"
          roughness={0.1}
          metalness={0.9}
          emissive="#06b6d4"
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </Float>
  )
}

export function Abstract3DModel() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen', opacity: 0.8 }}
    >
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#c084fc" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#06b6d4" />

        <AnimatedSphere />
        <InnerSolidSphere />

        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.6} color="#c084fc" />
      </Canvas>
    </div>
  )
}
