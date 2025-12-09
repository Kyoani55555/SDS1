import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition, OrnamentProps } from '../types';

const tempObj = new THREE.Object3D();

const Ornaments: React.FC<OrnamentProps> = ({ mode, count, type, color, precomputed }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Generate Star Shape for ExtrudeGeometry
  const starShape = useMemo(() => {
    if (type !== 'star') return null;
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.0;
    const innerRadius = 0.5;
    
    for (let i = 0; i < points * 2; i++) {
      // Start at PI/2 to have the top point pointing straight up (12 o'clock)
      const angle = (i * Math.PI) / points + Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, [type]);
  
  // Prepare dual positions
  const data = useMemo(() => {
    const items: DualPosition[] = [];
    
    // If we have precomputed positions (collision-free), use them
    if (precomputed) {
      precomputed.forEach((item) => {
        // Generate Scatter Position only (random)
        const sr = 12 + Math.random() * 15;
        const sTheta = Math.random() * Math.PI * 2;
        const sPhi = Math.acos(2 * Math.random() - 1);
        const scatterPos = new THREE.Vector3(
          sr * Math.sin(sPhi) * Math.cos(sTheta),
          sr * Math.sin(sPhi) * Math.sin(sTheta),
          sr * Math.cos(sPhi)
        );

        items.push({
          treePosition: item.position,
          scatterPosition: scatterPos,
          rotation: item.rotation,
          scale: item.scale,
          speed: Math.random() * 0.5 + 0.2,
          phase: Math.random() * Math.PI * 2
        });
      });
      return items;
    }

    // Fallback: Legacy Random Generation (mainly for Star or if precomputed missing)
    for (let i = 0; i < count; i++) {
      // SCATTER POSITION
      const sr = 12 + Math.random() * 15; 
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos(2 * Math.random() - 1);
      const scatterPos = new THREE.Vector3(
        sr * Math.sin(sPhi) * Math.cos(sTheta),
        sr * Math.sin(sPhi) * Math.sin(sTheta),
        sr * Math.cos(sPhi)
      );

      // TREE POSITION & ROTATION
      let treePos = new THREE.Vector3();
      let rotation = new THREE.Vector3();
      let scale = 1;

      if (type === 'star') {
        treePos.set(0, 5.9, 0); 
        rotation.set(0, 0, 0); 
        scale = 0.8; 
      } else {
        const h = Math.random() * 11 - 5.5; 
        const normalizedH = (h + 6) / 12;
        const coneR = 4.2 * (1.0 - normalizedH); 
        const theta = Math.random() * Math.PI * 2;
        
        treePos.set(
          coneR * Math.cos(theta),
          h,
          coneR * Math.sin(theta)
        );

        rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        scale = type === 'box' ? Math.random() * 0.3 + 0.2 : Math.random() * 0.2 + 0.15;
      }

      items.push({
        treePosition: treePos,
        scatterPosition: scatterPos,
        rotation,
        scale,
        speed: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }
    return items;
  }, [count, type, precomputed]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.getElapsedTime();
    const isTree = mode === TreeState.TREE_SHAPE;
    
    const lerpFactor = 0.05; // Speed of transition
    const itemCount = data.length;

    for (let i = 0; i < itemCount; i++) {
      const item = data[i];
      
      // Determine target position based on mode
      const target = isTree ? item.treePosition : item.scatterPosition;
      
      // Get current matrix
      meshRef.current.getMatrixAt(i, tempObj.matrix);
      tempObj.matrix.decompose(tempObj.position, tempObj.quaternion, tempObj.scale);
      
      // Interpolate position
      tempObj.position.lerp(target, lerpFactor);
      
      // Animation Logic
      if (!isTree) {
         // Float more when scattered
         tempObj.position.y += Math.sin(t * item.speed + item.phase) * 0.02;
         tempObj.rotation.x += 0.01;
         tempObj.rotation.y += 0.01;
      } else {
         if (type === 'star') {
            // Spin the star slowly upright
            tempObj.rotation.set(0, t * 0.5, 0);
         } else {
            // Gentle idle when in tree
            tempObj.rotation.x = item.rotation.x;
            tempObj.rotation.y += 0.005; 
            tempObj.rotation.z = item.rotation.z;
         }
      }
      
      tempObj.scale.setScalar(item.scale);
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]} castShadow receiveShadow>
      {type === 'box' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : type === 'star' ? (
        <extrudeGeometry 
          args={[
            starShape, 
            { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 } // Flatter profile
          ]} 
        />
      ) : (
        <sphereGeometry args={[1, 32, 32]} />
      )}
      <meshStandardMaterial 
        color={color} 
        roughness={0.3}     // Increased from 0.05 (less glossy)
        metalness={0.7}     // Decreased from 1.0 (less harsh metallic)
        envMapIntensity={0.6} // Decreased from 2.0 (less environmental reflection)
        emissive={color}
        emissiveIntensity={0.05} // Decreased from 0.4 (less self-illumination)
      />
    </instancedMesh>
  );
};

export default Ornaments;