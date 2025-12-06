import React, { useRef, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Float,
  Sparkles,
  MeshReflectorMaterial,
  Text,
  Html,
  Environment,
  Stats,
  Center,
  useTexture
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";

// --- Configuration Constants ---
const COLORS = {
  emerald: "#002b15",       // Deep dark emerald
  emeraldBright: "#005c2e", // Lighter facet reflections
  gold: "#FFD700",
  goldDark: "#AA8800",
  ambient: "#001a0f",
};

// --- Components ---

/**
 * A single ornament bauble.
 */
const Bauble: React.FC<{
  position: [number, number, number];
  scale?: number;
  type?: 'sphere' | 'diamond';
}> = ({ position, scale = 1, type = 'sphere' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    if (type === 'diamond') {
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef} castShadow receiveShadow>
        {type === 'sphere' ? (
          <sphereGeometry args={[0.12, 32, 32]} />
        ) : (
          <octahedronGeometry args={[0.10, 0]} />
        )}
        <meshStandardMaterial
          color={COLORS.gold}
          metalness={1}
          roughness={0.05}
          emissive={COLORS.goldDark}
          emissiveIntensity={0.2}
          envMapIntensity={2}
        />
      </mesh>
    </group>
  );
};

/**
 * A segment of the sword blade.
 * Uses a 4-sided cylinder (diamond profile) to look like a cut emerald.
 */
const BladeSegment = ({ 
  position, 
  bottomRadius, 
  topRadius, 
  height, 
  ornamentCount 
}: { 
  position: [number, number, number], 
  bottomRadius: number, 
  topRadius: number, 
  height: number, 
  ornamentCount: number 
}) => {
  // Generate positions along the central ridge of the blade
  const ornaments = useMemo(() => {
    const items = [];
    for (let i = 0; i < ornamentCount; i++) {
      // Position along height
      const y = (Math.random() - 0.5) * height * 0.9;
      
      // Interpolate radius at this Y
      const t = (y + height / 2) / height;
      const r = bottomRadius * (1 - t) + topRadius * t;
      
      // Place on the "flat" faces or the "sharp" edge?
      // Let's place them on the center ridge of the flat face for a "spine" look.
      // 4-sided cylinder rotated by PI/4 has vertices at X/Z axes.
      // Faces are flat along diagonals. 
      // Let's place gems on the edges (vertices) to accentuate sharpness.
      
      const angle = (Math.floor(Math.random() * 4) * Math.PI) / 2; // 0, 90, 180, 270
      
      const x = (r * 0.9) * Math.cos(angle);
      const z = (r * 0.9) * Math.sin(angle);
      
      items.push({
        pos: [x, y, z] as [number, number, number],
        type: Math.random() > 0.6 ? 'diamond' : 'sphere',
        scale: 0.6 + Math.random() * 0.4
      });
    }
    return items;
  }, [bottomRadius, topRadius, height, ornamentCount]);

  return (
    <group position={position}>
      {/* The Blade Crystal */}
      <mesh castShadow receiveShadow rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[topRadius, bottomRadius, height, 4, 1]} />
        <meshPhysicalMaterial
          color={COLORS.emerald}
          emissive={COLORS.emerald}
          emissiveIntensity={0.1}
          roughness={0.1}
          metalness={0.6}
          clearcoat={1}
          clearcoatRoughness={0.1}
          flatShading={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Decorative Ornaments stuck to the blade */}
      {ornaments.map((o, i) => (
        <Bauble key={i} position={o.pos} scale={o.scale} type={o.type as any} />
      ))}
      
      {/* Golden edge highlights (Thin Torus at segment connections) */}
      <mesh position={[0, -height/2, 0]} rotation={[Math.PI/2, 0, 0]}>
         <torusGeometry args={[bottomRadius * 0.85, 0.04, 4, 4]} />
         <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
};

/**
 * The Crossguard (Hilt Guard).
 */
const CrossGuard = () => {
  return (
    <group position={[0, -2.5, 0]}>
      {/* Main horizontal block */}
      <mesh castShadow receiveShadow position={[0, 0, 0]} scale={[1, 1, 0.4]}>
        <boxGeometry args={[3.5, 0.4, 0.8]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.2} />
      </mesh>
      
      {/* Wing tips */}
      <mesh position={[2, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.3, 1.5, 4]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[-2, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <coneGeometry args={[0.3, 1.5, 4]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.2} />
      </mesh>

      {/* Center Gem */}
      <mesh position={[0, 0, 0.25]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={COLORS.emeraldBright} metalness={0.8} roughness={0} emissive={COLORS.emerald} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};

/**
 * Handle and Pommel.
 */
const Hilt = () => {
  return (
    <group position={[0, -4, 0]}>
      {/* Grip */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 2.5, 8]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.7} />
      </mesh>
      
      {/* Grip Wrappings (Gold rings) */}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.26, 0.05, 16, 32]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.31, 0.05, 16, 32]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} />
      </mesh>

      {/* Pommel */}
      <mesh position={[0, -0.7, 0]}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
};

/**
 * The Sword Topper (Tip of the blade).
 */
const SwordTipStar = () => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = -state.clock.getElapsedTime() * 0.8;
    }
  });

  return (
    <group ref={ref} position={[0, 6.2, 0]}>
      {/* Star shape */}
      <mesh>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {/* Glow halo */}
      <mesh scale={1.8}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={COLORS.gold}
          metalness={1}
          roughness={0}
          wireframe
          emissive={COLORS.gold}
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight intensity={30} distance={8} color={COLORS.gold} decay={2} />
    </group>
  );
};

/**
 * The Main Sword Assembly.
 */
const SwordTree = (props: any) => {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      // Very slow majestic rotation
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.05;
    }
  });

  return (
    <group ref={group} {...props}>
      <SwordTipStar />
      
      {/* BLADE SEGMENTS (Bottom to Top) */}
      {/* Total Blade Height approx 8.5 units */}
      
      {/* Base of blade (Wide) */}
      <BladeSegment 
        position={[0, -1.0, 0]} 
        bottomRadius={1.2} 
        topRadius={0.9} 
        height={3} 
        ornamentCount={12} 
      />
      
      {/* Mid blade */}
      <BladeSegment 
        position={[0, 2.0, 0]} 
        bottomRadius={0.9} 
        topRadius={0.6} 
        height={3} 
        ornamentCount={10} 
      />
      
      {/* Top blade (Tip) */}
      <BladeSegment 
        position={[0, 4.5, 0]} 
        bottomRadius={0.6} 
        topRadius={0.05} // Sharp point
        height={2} 
        ornamentCount={6} 
      />

      {/* CROSSGUARD */}
      <CrossGuard />

      {/* HILT / GRIP */}
      <Hilt />

    </group>
  );
};

/**
 * Floor with elegant reflections.
 */
const ReflectiveFloor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#050505"
        metalness={0.5}
        mirror={1}
      />
    </mesh>
  );
};

const UI = () => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '50px',
      left: '0',
      width: '100%',
      textAlign: 'center',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 1
    }}>
      <h1 style={{
        fontFamily: "'Italiana', serif",
        color: '#fff',
        fontSize: '4rem',
        letterSpacing: '0.2em',
        margin: 0,
        textShadow: '0 0 30px rgba(0, 255, 100, 0.3)'
      }}>ARIX <span style={{ color: COLORS.gold }}>BLADE</span></h1>
      <p style={{
        fontFamily: "'Montserrat', sans-serif",
        color: '#aaa',
        fontSize: '0.9rem',
        letterSpacing: '0.5em',
        marginTop: '10px',
        textTransform: 'uppercase'
      }}>Interactive Holiday Experience</p>
    </div>
  );
};

const App = () => {
  return (
    <>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 14], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[0, 1, 16]} fov={50} />
        
        {/* Cinematic Lighting */}
        <color attach="background" args={['#000905']} />
        <ambientLight intensity={0.3} color={COLORS.emerald} />
        
        {/* Main Key Light (Warm Gold) */}
        <spotLight
          position={[10, 20, 10]}
          angle={0.2}
          penumbra={1}
          intensity={200}
          color="#ffedcc"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        {/* Fill Light */}
        <pointLight position={[-10, 5, -5]} intensity={50} color="#004422" />
        
        {/* Back Light / Rim Light */}
        <spotLight
          position={[0, 10, -10]}
          angle={0.5}
          intensity={100}
          color="#aaffdd"
        />

        {/* The Sword */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
          <SwordTree />
        </Float>

        <ReflectiveFloor />
        
        {/* Golden floating particles */}
        <Sparkles 
          count={400} 
          scale={[10, 15, 10]} 
          size={4} 
          speed={0.4} 
          opacity={0.5} 
          color={COLORS.gold} 
        />
        
        <Environment preset="city" />

        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 1.8}
          minDistance={10}
          maxDistance={25}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />

        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={0.7} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.5}
          />
          <Noise opacity={0.03} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
      <UI />
    </>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
