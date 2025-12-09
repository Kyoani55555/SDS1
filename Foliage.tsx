import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { TreeState } from '../types';
import { extend } from '@react-three/fiber';

// --- Custom Shader Material ---
const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0, // 0 = Scattered, 1 = Tree
    uColorCore: new THREE.Color('#004d25'), // Deep Emerald
    uColorTip: new THREE.Color('#d4af37'), // Metallic Gold
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uProgress;
    
    attribute vec3 aTreePos;
    attribute vec3 aScatterPos;
    attribute float aRandom;
    attribute float aSize;

    varying vec3 vColor;
    varying float vAlpha;

    // Simplex Noise (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    // Cubic ease in out
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      // Ease the progress for smoother motion
      float t = easeInOutCubic(uProgress);
      
      // Interpolate position
      vec3 pos = mix(aScatterPos, aTreePos, t);
      
      // Add breathing/floating effect based on state
      // More chaotic float when scattered, gentle breathing when tree
      float noiseVal = snoise(pos * 0.5 + uTime * 0.5);
      float floatIntensity = mix(1.5, 0.1, t); // High float in scattered, low in tree
      
      pos += vec3(0.0, 1.0, 0.0) * noiseVal * floatIntensity;

      // Add a slight "implosion" swirl effect during transition
      if (t > 0.1 && t < 0.9) {
         float angle = t * 3.14 * 2.0;
         float c = cos(angle * 0.5);
         float s = sin(angle * 0.5);
         // simple rotation around Y
         // pos.x = pos.x * c - pos.z * s;
         // pos.z = pos.x * s + pos.z * c;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Size attenuation
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColorCore;
    uniform vec3 uColorTip;
    varying vec3 vColor;
    
    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      // Glow gradient: Core is green, Edge is gold
      float glow = 1.0 - (dist * 2.0);
      glow = pow(glow, 2.0); // Sharpen gradient

      // Mix colors based on radial distance
      vec3 color = mix(uColorTip, uColorCore, smoothstep(0.3, 0.0, dist));
      
      // Add extra brightness at the very center for "sparkle"
      color += vec3(1.0) * smoothstep(0.05, 0.0, dist) * 0.5;

      gl_FragColor = vec4(color, glow);
    }
  `
);

extend({ FoliageMaterial });

interface FoliageProps {
  mode: TreeState;
  count?: number;
}

const Foliage: React.FC<FoliageProps> = ({ mode, count = 5000 }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate geometry data
  const { positions, scatterPositions, randoms, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scatterPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 1. Tree Position (Cone/Spiral)
      // Height from -6 to 6
      const h = Math.random() * 12 - 6;
      // Radius decreases as height increases (Cone shape)
      // Base radius ~4 at bottom, ~0 at top
      const normalizedH = (h + 6) / 12; // 0 to 1
      const maxRadius = 4.0 * (1.0 - normalizedH); 
      const r = Math.random() * maxRadius;
      
      // Spiral angle for better distribution
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = h;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 2. Scatter Position (Sphere/Cloud)
      // Random distribution in a large sphere (radius 15)
      const sr = 15 + Math.random() * 10;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos(2 * Math.random() - 1);
      
      scatterPositions[i * 3] = sr * Math.sin(sPhi) * Math.cos(sTheta);
      scatterPositions[i * 3 + 1] = sr * Math.sin(sPhi) * Math.sin(sTheta);
      scatterPositions[i * 3 + 2] = sr * Math.cos(sPhi);

      // Attributes
      randoms[i] = Math.random();
      sizes[i] = Math.random() * 0.8 + 0.2; // varies size
    }
    return { positions, scatterPositions, randoms, sizes };
  }, [count]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Time for breathing
      materialRef.current.uniforms.uTime.value += delta;

      // Smooth transition for uProgress
      const targetProgress = mode === TreeState.TREE_SHAPE ? 1.0 : 0.0;
      const currentProgress = materialRef.current.uniforms.uProgress.value;
      
      // Custom dampening logic
      const step = (targetProgress - currentProgress) * 3.0 * delta;
      materialRef.current.uniforms.uProgress.value += step;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Actually just placeholder, shader uses aTreePos
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

export default Foliage;
