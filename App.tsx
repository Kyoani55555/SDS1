import React, { useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import Foliage from './components/Foliage';
import Ornaments from './components/Ornaments';
import { TreeState, OrnamentData } from './types';

// UI Components
const Overlay = ({ state, toggle }: { state: TreeState; toggle: () => void }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif text-[#d4af37] tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.5)' }}>
            MERRY CHRISTMAS 11
          </h1>
          <div className="flex flex-col items-start">
            <p className="text-[#004d25] text-sm tracking-widest mt-1 font-bold bg-[#d4af37] px-2 inline-block">
              Holiday Collection 2025
            </p>
            <p className="text-[#d4af37] text-sm tracking-widest mt-1 font-serif italic">
              from Bobby
            </p>
          </div>
        </div>
      </header>

      <footer className="flex justify-center pb-12 pointer-events-auto">
        <button
          onClick={toggle}
          className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full border border-[#d4af37]/50 transition-all hover:border-[#d4af37]"
        >
          <div className="absolute inset-0 w-0 bg-[#d4af37] transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
          <span className="relative text-[#d4af37] font-serif tracking-widest text-lg uppercase transition-colors group-hover:text-white">
            {state === TreeState.SCATTERED ? 'Assemble Tree' : 'Scatter Elements'}
          </span>
        </button>
      </footer>
    </div>
  );
};

const Experience = ({ treeState }: { treeState: TreeState }) => {
  // Precompute collision-free positions for all ornaments
  const layout = useMemo(() => {
    const specs = [
      { id: 'redBoxes', count: 80, minScale: 0.25, maxScale: 0.35 },
      { id: 'goldBoxes', count: 40, minScale: 0.25, maxScale: 0.35 },
      { id: 'goldSpheres', count: 150, minScale: 0.15, maxScale: 0.25 },
      { id: 'whiteSpheres', count: 100, minScale: 0.15, maxScale: 0.25 },
    ];

    const occupied: { pos: THREE.Vector3, radius: number }[] = [];
    const results: Record<string, OrnamentData[]> = {
      redBoxes: [],
      goldBoxes: [],
      goldSpheres: [],
      whiteSpheres: []
    };

    specs.forEach(spec => {
      const items: OrnamentData[] = [];
      
      // Try to place each item
      for (let i = 0; i < spec.count; i++) {
        let bestPos: THREE.Vector3 | null = null;
        let bestScale = 0;
        
        // Retry loop to find empty spot
        for (let attempt = 0; attempt < 50; attempt++) {
           const h = (Math.random() * 11) - 5.5; 
           // Replicate cone geometry
           const normalizedH = (h + 6) / 12;
           // Cone radius at height h
           const coneR = 4.2 * (1.0 - normalizedH); 
           
           const theta = Math.random() * Math.PI * 2;
           
           const pos = new THREE.Vector3(
             coneR * Math.cos(theta),
             h,
             coneR * Math.sin(theta)
           );
           
           const scale = spec.minScale + Math.random() * (spec.maxScale - spec.minScale);
           const radius = scale * 0.9; // Approximate bounding radius for collision

           // Check collision against all previously placed items
           let collision = false;
           for (const obs of occupied) {
              const dist = pos.distanceTo(obs.pos);
              // Simple sphere collision check with margin
              if (dist < (radius + obs.radius + 0.1)) { 
                 collision = true;
                 break;
              }
           }

           if (!collision) {
              bestPos = pos;
              bestScale = scale;
              break;
           }
        }
        
        // If we found a valid spot, save it
        if (bestPos) {
           occupied.push({ pos: bestPos, radius: bestScale * 0.9 });
           items.push({
              position: bestPos,
              scale: bestScale,
              rotation: new THREE.Vector3(
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
              )
           });
        }
      }
      results[spec.id] = items;
    });
    
    return results;
  }, []);

  return (
    <>
      <color attach="background" args={['#000500']} />
      
      {/* Lighting Setup */}
      <ambientLight intensity={0.4} color="#001a0f" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.2} 
        penumbra={1} 
        intensity={300} 
        color="#fff5cc" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={80} color="#00ff88" />

      {/* Environment for reflections - Intensity increased for metallic look */}
      <Environment preset="city" background={false} environmentIntensity={1.0} />

      {/* The Tree Components */}
      <group position={[0, -2, 0]}>
        {/* Core Foliage */}
        <Foliage mode={treeState} count={8000} />
        
        {/* Top Star - Golden Yellow, lowered to cover tip */}
        <Ornaments mode={treeState} count={1} type="star" color="#ffd700" />

        {/* Luxury Ornaments - Brighter Colors - Now using precomputed layout */}
        <Ornaments 
          mode={treeState} 
          count={layout.redBoxes.length} 
          type="box" 
          color="#ff0022" 
          precomputed={layout.redBoxes}
        /> 
        <Ornaments 
          mode={treeState} 
          count={layout.goldBoxes.length} 
          type="box" 
          color="#ffcc00" 
          precomputed={layout.goldBoxes}
        /> 
        <Ornaments 
          mode={treeState} 
          count={layout.goldSpheres.length} 
          type="sphere" 
          color="#ffcc00" 
          precomputed={layout.goldSpheres}
        /> 
        <Ornaments 
          mode={treeState} 
          count={layout.whiteSpheres.length} 
          type="sphere" 
          color="#ffffff" 
          precomputed={layout.whiteSpheres}
        /> 
        
        {/* Ambient Floating Sparkles that are always there */}
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
          <Sparkles 
            count={300} 
            scale={14} 
            size={5} 
            speed={0.4} 
            opacity={0.6} 
            color="#ffd700" 
          />
        </Float>
      </group>

      {/* Ground Reflections */}
      <ContactShadows 
        resolution={1024} 
        scale={50} 
        blur={2} 
        opacity={0.5} 
        far={10} 
        color="#000000" 
      />

      {/* Controls */}
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={8}
        maxDistance={25}
        autoRotate={treeState === TreeState.TREE_SHAPE}
        autoRotateSpeed={0.5}
      />

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.7} // Lower threshold so more things glow
          mipmapBlur 
          intensity={1.2} 
          radius={0.5}
        />
        <ToneMapping />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

export default function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  return (
    <div className="w-full h-screen bg-black">
      <Overlay state={treeState} toggle={toggleState} />
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: false, toneMappingExposure: 1.2 }}
        camera={{ position: [0, 0, 18], fov: 35 }}
      >
        <Suspense fallback={null}>
          <Experience treeState={treeState} />
        </Suspense>
      </Canvas>
    </div>
  );
}