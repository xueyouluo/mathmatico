
import React, { useEffect, useState } from 'react';
import GridCell from './GridCell';
import { Tile, BuildingType, Direction, Item } from '../types';
import { ITEM_COLORS } from '../constants';

interface TutorialDemoProps {
  type: 'goal' | 'resources' | 'math' | 'controls';
}

const TutorialDemo: React.FC<TutorialDemoProps> = ({ type }) => {
  // Mini grid state (3x3 or 3x1 depending on need, let's do 3x3 for flexibility)
  // We will simulate the "state" manually for the animation loop.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 600); // Sync with game tick roughly
    return () => clearInterval(timer);
  }, []);

  // Render helpers
  const renderMiniGrid = (tiles: Tile[][]) => (
    <div className="grid grid-cols-3 gap-0 border border-gray-200 bg-white p-1 rounded-lg shadow-sm scale-90 origin-center">
       {tiles.map((row, y) => row.map((tile, x) => (
          <div key={`${x}-${y}`} className="w-16 h-16 scale-75 origin-center">
             {/* We mock the props for GridCell. 
                 GridCell expects handlers, we pass no-ops. 
             */}
             <GridCell 
                tile={tile} 
                onMouseDown={() => {}} 
                onMouseEnter={() => {}} 
                onContextMenu={() => {}} 
             />
          </div>
       )))}
    </div>
  );

  const createMockItem = (val: number, x: number, y: number, phase: number): Item => ({
    id: 'demo',
    value: val,
    color: ITEM_COLORS[val % ITEM_COLORS.length],
    x, y, lastX: x, lastY: y,
    animationPhase: phase
  });

  // Scenario Logic
  const getScenarioGrid = (): Tile[][] => {
    // Initialize empty 3x3
    const grid: Tile[][] = Array(3).fill(null).map((_, y) => 
       Array(3).fill(null).map((_, x) => ({
          x, y, building: BuildingType.NONE, direction: Direction.RIGHT, storedItems: []
       }))
    );

    const t = tick % 6; // Loop every 6 ticks

    if (type === 'goal') {
       // 0: Belt(Item) -> 1: Belt -> 2: Hub
       grid[1][0] = { x:0, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };
       grid[1][1] = { x:1, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };
       grid[1][2] = { x:2, y:1, building: BuildingType.HUB, direction: Direction.RIGHT, storedItems: [] };
       
       // Item Animation
       // Tick 0: Item at 0
       // Tick 1: Item at 1
       // Tick 2: Item enters Hub (disappears)
       // Tick 3: Score popup (simulated by text overlay maybe, or just wait)
       let itemPos = -1;
       if (t === 0) itemPos = 0;
       if (t === 1) itemPos = 1;
       
       if (itemPos !== -1) {
          grid[1][itemPos].item = createMockItem(42, itemPos, 1, 1);
       }
    } 
    else if (type === 'resources') {
       // Extractor -> Belt -> Belt
       grid[1][0] = { x:0, y:1, building: BuildingType.EXTRACTOR, direction: Direction.RIGHT, extractorValue: 7, storedItems: [] };
       grid[1][1] = { x:1, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };
       grid[1][2] = { x:2, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };

       // Item spawns at 0, moves to 1, then 2
       let itemX = -1;
       if (t === 1) itemX = 0;
       if (t === 2) itemX = 1;
       if (t === 3) itemX = 2;

       if (itemX !== -1) {
          grid[1][itemX].item = createMockItem(7, itemX, 1, 1);
       }
    }
    else if (type === 'math') {
       // Top Belt (Input A=2) -> Adder
       // Left Belt (Input B=3) -> Adder -> Right Belt (Output=5)
       
       // Layout:
       // .  A(Belt Down)  .
       // B(Belt Right) Adder(Right)  Out(Belt Right)
       
       grid[0][1] = { x:1, y:0, building: BuildingType.BELT, direction: Direction.DOWN, storedItems: [] };
       grid[1][0] = { x:0, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };
       grid[1][1] = { x:1, y:1, building: BuildingType.ADDER, direction: Direction.RIGHT, storedItems: [] }; // Adder
       grid[1][2] = { x:2, y:1, building: BuildingType.BELT, direction: Direction.RIGHT, storedItems: [] };

       // Logic:
       // T0: Items appear at sources (0,1) and (1,0)
       // T1: Items enter Adder (stored)
       // T2: Adder outputs 5 to (1,2)
       // T3: Item moves away
       
       if (t === 0) {
          grid[0][1].item = createMockItem(2, 1, 0, 1);
          grid[1][0].item = createMockItem(3, 0, 1, 1);
       }
       if (t === 1) {
          // Inside Adder
          grid[1][1].storedItems = [
             { item: createMockItem(2, 1, 1, 1), fromDir: Direction.UP },
             { item: createMockItem(3, 1, 1, 1), fromDir: Direction.LEFT }
          ];
       }
       if (t >= 2 && t <= 3) {
          const xPos = t === 2 ? 1 : 2; // Spawn at adder then move right
          grid[1][xPos].item = createMockItem(5, xPos, 1, 1);
       }
    }
    else if (type === 'controls') {
       // Just show a belt rotating
       // T0-T1: Right
       // T2-T3: Down
       // T4-T5: Left
       
       const dir = t < 2 ? Direction.RIGHT : t < 4 ? Direction.DOWN : Direction.LEFT;
       grid[1][1] = { x:1, y:1, building: BuildingType.BELT, direction: dir, storedItems: [] };
       
       // Visual cue for action?
       // Maybe just the rotation is enough.
    }

    return grid;
  };

  return (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden">
       {renderMiniGrid(getScenarioGrid())}
    </div>
  );
};

export default TutorialDemo;
