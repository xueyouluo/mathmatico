
import { BuildingType, LevelConfig, Difficulty } from './types';

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  background: '#f0f9ff',
  grid: '#e2e8f0',
  itemText: '#ffffff',
};

export const ITEM_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
];

export const BUILDING_LABELS: Record<string, string> = {
  [BuildingType.BELT]: '传送带',
  [BuildingType.EXTRACTOR]: '数字发生器',
  [BuildingType.ADDER]: '加法器 (+)',
  [BuildingType.SUBTRACTOR]: '减法器 (-)',
  [BuildingType.MULTIPLIER]: '乘法器 (×)',
  [BuildingType.DIVIDER]: '除法器 (÷)',
  [BuildingType.TRASH]: '垃圾桶 (移除)', // Changed from '虚空 (移除)'
};

export const TICK_RATE_MS = 600; // Speed of the game

// Helper to simulate operations for level generation
const calculateTarget = (nums: number[], difficulty: Difficulty): number => {
  let current = [...nums];
  // Perform random operations until we have one number or we want to stop
  // We want a target that isn't too crazy.
  
  // Try to combine at least a few times
  const steps = Math.max(1, Math.floor(current.length / 2) + 1);

  for (let i = 0; i < steps; i++) {
    if (current.length < 2) break;
    
    // Pick two random indices
    const idx1 = Math.floor(Math.random() * current.length);
    let idx2 = Math.floor(Math.random() * current.length);
    while (idx1 === idx2) idx2 = Math.floor(Math.random() * current.length);
    
    const a = current[idx1];
    const b = current[idx2];
    
    // Remove them
    current = current.filter((_, idx) => idx !== idx1 && idx !== idx2);
    
    let op = '+';
    if (difficulty === 'HARD') {
      if (Math.random() < 0.3) { // 30% chance for division
        op = '/';
      } else {
        const others = ['+', '-', '*'];
        op = others[Math.floor(Math.random() * others.length)];
      }
    } else {
      const ops = ['+', '+', '-', '-']; // Weight towards add/sub
      op = ops[Math.floor(Math.random() * ops.length)];
    }
    
    let res = a + b;
    
    if (op === '+') res = a + b;
    else if (op === '-') res = Math.abs(a - b); // Keep positive for target
    else if (op === '*') res = a * b;
    else if (op === '/') {
       // Only divide if clean division
       if (b !== 0 && a % b === 0) res = a / b;
       else if (a !== 0 && b % a === 0) res = b / a;
       else res = a + b; // Fallback to add
    }
    
    // Cap target size to prevent insanity
    if (res > 999) res = 999;
    
    current.push(res);
  }
  
  return current[0]; // The result is one of the remaining numbers (usually just one left if we combined all, but partial combine is ok too)
};

// Dynamic Level Generator for Endless Mode
export const generateLevel = (index: number, difficulty: Difficulty = 'EASY'): LevelConfig => {
  const id = index + 1;
  
  // 1. Generate Base Numbers (The "Deck")
  // More numbers available as levels progress
  const count = Math.min(6, 3 + Math.floor(index / 2));
  const availableNumbers: number[] = [];
  
  for (let i = 0; i < count; i++) {
     // Hard mode can have larger start numbers
     const maxVal = difficulty === 'HARD' && Math.random() < 0.3 ? 50 : 9;
     availableNumbers.push(Math.floor(Math.random() * maxVal) + 1);
  }

  // 2. Calculate a valid target from these numbers
  // We run a simulation to ensure it's possible
  let target = calculateTarget([...availableNumbers], difficulty);
  
  // Edge case: if target is 0 or trivial, force a simple valid one
  if (target <= 0) target = availableNumbers[0] + availableNumbers[1];

  return {
    id,
    name: id <= 10 ? `第 ${id} 关` : `无尽模式 ${id}`,
    target,
    description: `目标数字: ${target}。`,
    availableNumbers,
  };
};
