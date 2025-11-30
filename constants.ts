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
  [BuildingType.TRASH]: '垃圾桶 (移除)',
};

export const TICK_RATE_MS = 600; // Speed of the game

/**
 * Smart Decompose Logic
 * Recursively decomposes a target number into source numbers based on available operations and depth.
 */
const decomposeSmart = (val: number, depthRemaining: number, availableOps: string[]): number[] => {
  if (val <= 2 || depthRemaining <= 0) {
    return [val];
  }

  // Choose allowed operations based on depth to control complexity
  // If depth is high, prefer simpler operations (add/sub) to keep numbers manageable
  let ops = availableOps;
  if (depthRemaining > 2) {
    ops = availableOps.filter(op => ['+', '-'].includes(op));
    if (ops.length === 0) ops = ['+']; // Fallback
  }
  
  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === '+') {
    // Decompose into two roughly balanced numbers
    // val = a + b
    const splitPoint = Math.floor(val * (0.3 + Math.random() * 0.4)); // 0.3 to 0.7
    const a = Math.max(1, splitPoint);
    const b = val - a;
    return [
      ...decomposeSmart(a, depthRemaining - 1, availableOps),
      ...decomposeSmart(b, depthRemaining - 1, availableOps)
    ];
  } 
  else if (op === '-') {
    // val = a - b => a = val + b
    const b = Math.floor(Math.random() * Math.min(20, val)) + 1;
    const a = val + b;
    if (a > 999) {
      // Too big, retry current level without reducing depth effectively (or fallback)
      return decomposeSmart(val, depthRemaining, availableOps);
    }
    // Since this is reverse logic, we return the inputs required for the operation.
    // To get 'val' via subtraction, we need 'a' and 'b'.
    // But wait, this function returns the SOURCES. 
    // If the step was "val came from a - b", then we need to find sources for a and b.
    // However, the recursion applies to the inputs. 
    // If we stop here, we return [a, b].
    // If we recurse, we decompose a and b further.
    // Note: 'b' is usually small, maybe don't decompose 'b' further if it's small.
    
    // Let's simplify: decrement depth.
    // Only decompose 'a' further if it's large? For now, standard recursion.
    return [a, b]; 
  } 
  else if (op === '*') {
    // val = a * b
    // Find factors
    const factors: number[] = [];
    const limit = Math.min(Math.floor(Math.sqrt(val)) + 1, 20);
    for (let i = 2; i < limit; i++) {
      if (val % i === 0) factors.push(i);
    }
    
    if (factors.length === 0) {
      // Prime or hard to factor, fallback to addition
      return decomposeSmart(val, depthRemaining, ['+', '-']); 
    }
    
    const a = factors[Math.floor(Math.random() * factors.length)];
    const b = val / a;
    return [a, b];
  } 
  else if (op === '/') {
    // val = a / b => a = val * b
    const b = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const a = val * b;
    if (a > 999) {
       return decomposeSmart(val, depthRemaining, availableOps);
    }
    return [a, b];
  }

  return [val];
};


// Dynamic Level Generator
export const generateLevel = (index: number, difficulty: Difficulty = 'EASY'): LevelConfig => {
  const id = index + 1;
  
  // 1. Target Calculation (Smoother Logarithmic Growth)
  let target: number;
  if (difficulty === 'EASY') {
    const base = 10;
    // target ≈ 10 + 0.8*i + 0.1*i^1.2
    target = Math.floor(base + index * 0.8 + Math.pow(index, 1.2) * 0.1);
  } else { // HARD
    const base = 20;
    // target ≈ 20 + 1.5*i + 0.2*i^1.15
    target = Math.floor(base + index * 1.5 + Math.pow(index, 1.15) * 0.2);
  }

  // Add random fluctuation ±20%
  const fluctuation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  target = Math.floor(target * fluctuation);
  target = Math.max(5, target); // Minimum safety

  // 2. Decomposition Depth (Steps)
  // Level 1-10: 1-2 steps
  // Level 11-30: 2-3 steps
  // Level 30+: 3-4 steps
  let steps: number;
  if (id <= 10) {
    steps = 1 + Math.floor(index / 5); 
  } else if (id <= 30) {
    steps = 2 + Math.floor((index - 10) / 10);
  } else {
    steps = Math.min(4, 3 + Math.floor((index - 30) / 20));
  }

  // 3. Available Operations
  const availableOps = ['+'];
  if (id > 5) availableOps.push('-');
  
  if (difficulty === 'HARD') {
     availableOps.push('*'); 
     availableOps.push('/'); 
  } 
  // EASY mode: Strictly '+' and '-' only, no multiplication or division regardless of level.

  // 4. Generate Sources via Decompose
  // We use a simplified wrapper to handle the recursive results which might be nested arrays in a real recursive function,
  // but here we flatten logic or just iterate.
  // Actually, the python logic was recursive. Let's try to mimic the effect iteratively or simply call the recursive function.
  // Our decomposeSmart returns a flat array of sources? 
  // Wait, the python code: return [*decompose(a), *decompose(b)]. Yes, it returns a flat list of leaves.
  const sources = decomposeSmart(target, steps, availableOps);

  // 5. Distractors (Noise)
  if (difficulty === 'HARD' || id > 10) {
    const noiseCount = Math.min(3, Math.floor((id - 10) / 10) + 1);
    
    for (let i = 0; i < noiseCount; i++) {
      const ref = sources[Math.floor(Math.random() * sources.length)];
      let noise = ref;
      
      if (Math.random() < 0.5) {
         // Option 1: Close number
         noise = ref + Math.floor(Math.random() * 11) - 5; // -5 to +5
      } else {
         // Option 2: Fake operation result
         if (sources.length >= 2) {
            const a = sources[Math.floor(Math.random() * sources.length)];
            const b = sources[Math.floor(Math.random() * sources.length)];
            noise = a + b + Math.floor(Math.random() * 3) + 1; // a + b + error
         } else {
            noise = ref + 5;
         }
      }
      
      noise = Math.max(1, noise);
      sources.push(noise);
    }
  }

  // Shuffle
  for (let i = sources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sources[i], sources[j]] = [sources[j], sources[i]];
  }

  return {
    id,
    name: id <= 10 ? `第 ${id} 关` : `无尽模式 ${id}`,
    target,
    description: `目标数字: ${target}。`,
    availableNumbers: sources,
  };
};
