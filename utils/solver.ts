
import { Difficulty } from '../types';

type Op = '+' | '-' | '*' | '/';

interface SolutionStep {
  a: number;
  b: number;
  op: Op;
  result: number;
}

// Format a solution object into a readable string
// e.g. "3 + 5 = 8\n8 * 2 = 16"
export const formatSolution = (steps: SolutionStep[]): string => {
  if (steps.length === 0) return "";
  return steps.map(s => {
      if (s.op === '-') {
          // Ensure we display larger - smaller
          const max = Math.max(s.a, s.b);
          const min = Math.min(s.a, s.b);
          return `${max} - ${min} = ${s.result}`;
      }
      if (s.op === '/') {
          // Ensure we display dividend / divisor
          // Since our logic allows a/b or b/a, we need to check which one yields result
          if (s.b !== 0 && s.a / s.b === s.result) return `${s.a} ÷ ${s.b} = ${s.result}`;
          return `${s.b} ÷ ${s.a} = ${s.result}`;
      }
      const symbol = s.op === '*' ? '×' : s.op;
      return `${s.a} ${symbol} ${s.b} = ${s.result}`;
  }).join('\n');
};

export const solveLevel = (numbers: number[], target: number, difficulty: Difficulty): string | null => {
  const ops: Op[] = difficulty === 'EASY' ? ['+', '-'] : ['+', '-', '*', '/'];
  
  // BFS State: { values: number[], steps: SolutionStep[] }
  // We want to find a state where 'values' contains 'target'.
  
  const queue: { values: number[]; steps: SolutionStep[] }[] = [
    { values: numbers, steps: [] }
  ];
  
  // Visited set to avoid cycles (hash of sorted values)
  const visited = new Set<string>();
  
  let iterations = 0;
  const MAX_ITERATIONS = 5000; // Prevent freeze

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = queue.shift()!;
    
    // Check success
    if (current.values.includes(target)) {
      return formatSolution(current.steps);
    }
    
    // Hash state
    const stateKey = current.values.slice().sort((a,b)=>a-b).join(',');
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    
    // Branch out: Try all pairs
    if (current.values.length < 2) continue;
    
    for (let i = 0; i < current.values.length; i++) {
      for (let j = i + 1; j < current.values.length; j++) {
        const a = current.values[i];
        const b = current.values[j];
        
        // Remaining values if we remove a and b
        const remaining = current.values.filter((_, idx) => idx !== i && idx !== j);
        
        for (const op of ops) {
          let res: number | null = null;
          
          if (op === '+') res = a + b;
          else if (op === '-') res = Math.abs(a - b); // Abs subtraction
          else if (op === '*') res = a * b;
          else if (op === '/') {
             // Only integer division
             if (b !== 0 && a % b === 0) res = a / b;
             else if (a !== 0 && b % a === 0) res = b / a;
          }
          
          if (res !== null && res <= 999) { // Cap reasonable numbers
             const nextSteps = [...current.steps, { a, b, op, result: res }];
             // Optimization: Check immediately
             if (res === target) return formatSolution(nextSteps);
             
             queue.push({
               values: [...remaining, res],
               steps: nextSteps
             });
          }
        }
      }
    }
  }
  
  return null;
};
