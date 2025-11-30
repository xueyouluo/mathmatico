
export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export enum BuildingType {
  NONE = 'NONE',
  BELT = 'BELT',
  EXTRACTOR = 'EXTRACTOR', // Produces numbers
  ADDER = 'ADDER',
  SUBTRACTOR = 'SUBTRACTOR',
  MULTIPLIER = 'MULTIPLIER',
  DIVIDER = 'DIVIDER',
  TRASH = 'TRASH', // Removes items
  HUB = 'HUB', // The goal
}

export type Difficulty = 'EASY' | 'HARD';

export interface Item {
  id: string;
  value: number;
  color: string;
  // Current logical grid position
  x: number;
  y: number;
  // Previous logical grid position for animation interpolation
  lastX: number;
  lastY: number;
  // Animation phase (0.0 to 1.0)
  animationPhase: number;
}

export interface Tile {
  x: number;
  y: number;
  building: BuildingType;
  direction: Direction;
  extractorValue?: number; // For EXTRACTOR (1-9)
  item?: Item; // Item currently on the belt/tile
  storedItems: { item: Item; fromDir: Direction }[]; // For processors waiting for 2nd input
  fixedInputDir?: Direction; // Locks the direction for the first operand (Left side)
}

export interface LevelConfig {
  id: number;
  target: number;
  name: string;
  description: string;
  availableNumbers: number[]; // Pre-calculated source numbers that guarantee a solution
}

export interface GameState {
  grid: Tile[][];
  score: number;
  levelIndex: number; // Current level index
  currentLevel: LevelConfig; // The generated config for the current level
  isLevelComplete: boolean; // Win state
  tickCount: number;
  lastScoreIncrease: number | null; // For animation
}

// Determine grid size based on screen size
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

export const GRID_WIDTH = isMobile ? 10 : 16;
export const GRID_HEIGHT = isMobile ? 14 : 10;
