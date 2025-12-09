import { Vector3 } from 'three';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface DualPosition {
  treePosition: Vector3;
  scatterPosition: Vector3;
  rotation: Vector3;
  scale: number;
  speed: number; // For floating animation
  phase: number; // For floating offset
}

export interface OrnamentData {
  position: Vector3;
  rotation: Vector3;
  scale: number;
}

export interface OrnamentProps {
  mode: TreeState;
  count: number; // Used for fallback or loop limit
  type: 'box' | 'sphere' | 'star';
  color: string;
  precomputed?: OrnamentData[];
}