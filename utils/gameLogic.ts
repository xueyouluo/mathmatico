
import { GameState, Tile, Direction, BuildingType, Item, GRID_WIDTH, GRID_HEIGHT, LevelConfig, Difficulty } from '../types';
import { ITEM_COLORS } from '../constants';

// Helper to get next coordinates based on direction
const getNextCoords = (x: number, y: number, dir: Direction): { x: number; y: number } | null => {
  let nx = x;
  let ny = y;
  switch (dir) {
    case Direction.UP: ny -= 1; break;
    case Direction.RIGHT: nx += 1; break;
    case Direction.DOWN: ny += 1; break;
    case Direction.LEFT: nx -= 1; break;
  }
  if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) return null;
  return { x: nx, y: ny };
};

const createItem = (value: number, x: number, y: number): Item => ({
  id: Math.random().toString(36).substr(2, 9),
  value: Math.floor(value), // Ensure integers
  color: ITEM_COLORS[Math.abs(Math.floor(value)) % ITEM_COLORS.length],
  x,
  y,
  lastX: x,
  lastY: y,
  animationPhase: 1.0, // Starts fully arrived
});

export const initializeGrid = (w: number, h: number, levelIndex: number, difficulty: Difficulty, availableNumbers?: number[]): Tile[][] => {
  const grid: Tile[][] = [];
  
  const isPortrait = h > w;
  
  // Determine Hub Location
  // Landscape: Right-Center (w-2, h/2)
  // Portrait: Bottom-Center (w/2, h-2)
  const hubX = isPortrait ? Math.floor(w / 2) : w - 2;
  const hubY = isPortrait ? h - 2 : Math.floor(h / 2);

  // 1. Create Empty Grid
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      let building = BuildingType.NONE;
      if (x === hubX && y === hubY) {
        building = BuildingType.HUB;
      }
      row.push({
        x,
        y,
        building,
        direction: isPortrait ? Direction.DOWN : Direction.RIGHT, // Default flow direction towards Hub general area
        storedItems: [],
      });
    }
    grid.push(row);
  }

  // 2. Randomly Spawn Extractors
  // Number of sources increases slightly with level, capped at a reasonable amount
  const minSources = 4;
  const maxSources = 8;
  const numSources = Math.min(maxSources, minSources + Math.floor(levelIndex / 3));
  
  let placed = 0;
  let attempts = 0;
  
  // Track placed extractors to verify connections
  const placedExtractors: {x: number, y: number, dir: Direction}[] = [];
  
  // Prioritize available numbers if provided
  const priorityNumbers = availableNumbers ? [...availableNumbers] : [];
  
  while (placed < numSources && attempts < 200) {
    attempts++;
    
    // Spawn Area Logic
    // Landscape: Avoid right-most columns (near hub) -> x in [0, w-3]
    // Portrait: Avoid bottom-most rows (near hub) -> y in [0, h-3]
    
    const rx = Math.floor(Math.random() * (isPortrait ? w : w - 2)); 
    const ry = Math.floor(Math.random() * (isPortrait ? h - 2 : h));
    
    const tile = grid[ry][rx];
    
    // Check if empty
    if (tile.building !== BuildingType.NONE) continue;

    // Check distance to Hub
    const distToHub = Math.abs(rx - hubX) + Math.abs(ry - hubY);
    if (distToHub <= 2) continue;

    // CONSTRAINT 1: Do not place on a tile that is being pointed to by an EXISTING extractor
    // This prevents placing a number directly in front of another number
    const isTargetedByOther = placedExtractors.some(e => {
        const target = getNextCoords(e.x, e.y, e.dir);
        return target && target.x === rx && target.y === ry;
    });
    if (isTargetedByOther) continue;

    // CONSTRAINT 2: Find a valid direction that doesn't point to boundary or existing building
    const validDirections: Direction[] = [];
    
    [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT].forEach(dir => {
        const next = getNextCoords(rx, ry, dir);
        
        // Check boundary
        if (!next) return;
        
        // Check if pointing to an existing building (Extractor or Hub)
        const neighbor = grid[next.y][next.x];
        if (neighbor.building !== BuildingType.NONE) return;
        
        validDirections.push(dir);
    });

    if (validDirections.length > 0) {
      tile.building = BuildingType.EXTRACTOR;
      
      // Determine Extractor Value
      let val;
      
      // Use priority numbers first
      if (priorityNumbers.length > 0) {
         val = priorityNumbers.shift()!;
      } else {
         // Fallback to random logic
         // In EASY mode, strictly 1-9.
         // In HARD mode, 25% chance to spawn larger numbers (10-99) to encourage division/subtraction.
         val = Math.floor(Math.random() * 9) + 1;
      
         if (difficulty === 'HARD') {
           if (Math.random() < 0.25) {
               val = Math.floor(Math.random() * 90) + 10; // 10 to 99
           }
         }
      }

      tile.extractorValue = val;
      
      // Pick a random VALID direction
      // Prefer direction towards Hub if available? No, random is fine, adds puzzle.
      tile.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
      
      placedExtractors.push({ x: rx, y: ry, dir: tile.direction });
      placed++;
    }
  }

  return grid;
};

export const processTick = (currentState: GameState): GameState => {
  // If level is already complete, do nothing until user advances
  if (currentState.isLevelComplete) return currentState;

  // IMPORTANT: For animation, we need to modify the item objects directly and maintain references.
  // Deep cloning the entire grid breaks item identity needed for React's reconciliation and animation.
  // Instead, we will shallow copy the grid and tiles, and deep copy only when an item's properties need to change.
  // However, for game logic, we need to apply all changes on a new grid state, then commit.
  // Let's create a deep copy for safe mutation during this tick processing.
  // We'll manage animation phase in App.tsx using RAF.
  const nextGrid: Tile[][] = currentState.grid.map(row => row.map(tile => ({
    ...tile,
    // Deep copy storedItems to ensure modifications don't affect previous state
    storedItems: tile.storedItems.map(stored => ({ ...stored, item: { ...stored.item } })),
    // Deep copy item on tile if present
    item: tile.item ? { ...tile.item } : undefined,
  })));

  let nextScore = currentState.score;
  let isLevelComplete = false;
  let scoreIncreased = null;

  const currentTarget = currentState.currentLevel.target;

  const getTile = (x: number, y: number) => {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
    return nextGrid[y][x];
  };

  // 1. Processing Logic
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const currentTile = currentState.grid[y][x]; // Use current state for decisions
      const nextTile = nextGrid[y][x]; // Mutate next state

      // Processors
      if ([BuildingType.ADDER, BuildingType.SUBTRACTOR, BuildingType.MULTIPLIER, BuildingType.DIVIDER].includes(currentTile.building)) {
        
        // Logic for Direction Locking (All Processors now)
        // If we have a pair and no lock, we lock the first one as the "Main" (Left) input.
        if (nextTile.fixedInputDir === undefined && nextTile.storedItems.length >= 2) {
             // Lock it!
             nextTile.fixedInputDir = nextTile.storedItems[0].fromDir;
        }

        if (nextTile.storedItems.length >= 2) {
          if (!nextTile.item) {
            
            let valA, valB;
            
            if (nextTile.fixedInputDir !== undefined) { // Now applies to all processors if locked
                // Use Locked Directions
                const itemA = nextTile.storedItems.find(i => i.fromDir === nextTile.fixedInputDir);
                const itemB = nextTile.storedItems.find(i => i.fromDir !== nextTile.fixedInputDir);
                
                if (itemA && itemB) {
                    valA = itemA.item.value;
                    valB = itemB.item.value;
                } else {
                    // Fallback to FIFO if locked items are missing (e.g. one input stream dried up)
                    valA = nextTile.storedItems[0].item.value;
                    valB = nextTile.storedItems[1].item.value;
                }
            } else {
                // Standard FIFO (if fixedInputDir is not yet set)
                valA = nextTile.storedItems[0].item.value;
                valB = nextTile.storedItems[1].item.value;
            }

            let result = 0;

            if (currentTile.building === BuildingType.ADDER) {
                result = valA + valB;
            } else if (currentTile.building === BuildingType.SUBTRACTOR) {
                result = valA - valB;
            } else if (currentTile.building === BuildingType.MULTIPLIER) {
                result = valA * valB;
            } else if (currentTile.building === BuildingType.DIVIDER) {
                result = valB !== 0 ? Math.floor(valA / valB) : 0;
            }

            // Consume first two items
            // Note: If using locked dirs, we should remove the specific items used.
            // But since we only hold 2 items max, clearing 0 and 1 is fine.
            nextTile.storedItems.splice(0, 2);

            if (result > 999) result = 999;
            if (result < -999) result = -999;

            nextTile.item = createItem(result, x, y); // New item created at processor's location
          }
        }
      }

      // Extractors
      if (currentTile.building === BuildingType.EXTRACTOR) {
        if (!nextTile.item && nextTile.extractorValue !== undefined) {
           nextTile.item = createItem(nextTile.extractorValue, x, y); // Item created at extractor's location
        }
      }
    }
  }

  // 2. Movement Logic
  // Collect all moves first to prevent issues with concurrent mutation
  const itemMoves: { item: Item; fromX: number; fromY: number; toX: number; toY: number; fromDir?: Direction }[] = [];
  const processorEntries: { item: Item; fromX: number; fromY: number; toX: number; toY: number; fromDir: Direction }[] = [];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const tile = nextGrid[y][x]; // Current state of nextGrid, potentially with newly created items
      
      if (tile.item) {
        let targetCoords = null;
        let effectiveDirection = tile.direction;

        if (tile.building === BuildingType.EXTRACTOR) {
           // Special multi-output logic for Extractor
           const candidates: { coords: {x: number, y: number}, dir: Direction }[] = [];
           
           [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT].forEach(dir => {
               const coords = getNextCoords(x, y, dir);
               if (coords) {
                   const neighbor = getTile(coords.x, coords.y);
                   // Valid if neighbor exists and is a BELT (or the explicit target direction)
                   // AND neighbor is not pointing BACK at us (to prevent immediate back-flow if belt is wrong way)
                   if (neighbor) {
                      // Condition 1: It is the explicit direction (user connected directly to machine?)
                      // Condition 2: It is a BELT.
                      // Additional Check: If it's a belt, it should ideally not be pointing AT the extractor.
                      // (neighbor.direction + 2) % 4 !== dir
                      
                      const isExplicitTarget = dir === tile.direction;
                      const isBelt = neighbor.building === BuildingType.BELT;
                      
                      if (isExplicitTarget || isBelt) {
                          candidates.push({ coords, dir });
                      }
                   }
               }
           });

           if (candidates.length > 0) {
               // Deterministic Round Robin based on global tick count
               // This ensures even distribution if multiple outputs exist
               const selected = candidates[currentState.tickCount % candidates.length];
               targetCoords = selected.coords;
               effectiveDirection = selected.dir;
           }

        } else {
           // Standard behavior for Belts/Machines
           targetCoords = getNextCoords(x, y, tile.direction);
           effectiveDirection = tile.direction;
        }
        
        if (targetCoords) {
          const targetTile = getTile(targetCoords.x, targetCoords.y);
          
          if (targetTile) {
            // STRICTLY prevent moving to empty tiles (NONE).
            // Items must stay on belts or move into machines.
            if (targetTile.building === BuildingType.NONE) continue;

            // TRASH removes items
            if (targetTile.building === BuildingType.TRASH) {
               tile.item = undefined; // Item is trashed
               continue;
            }

            // HUB receives items
            if (targetTile.building === BuildingType.HUB) {
               if (tile.item.value === currentTarget) {
                 nextScore += 100 + (currentState.levelIndex * 10); // Scaled score
                 scoreIncreased = 100 + (currentState.levelIndex * 10);
                 isLevelComplete = true;
               }
               tile.item = undefined; // Item is consumed by hub
               continue;
            }

            // Processors store items
            if ([BuildingType.ADDER, BuildingType.SUBTRACTOR, BuildingType.MULTIPLIER, BuildingType.DIVIDER].includes(targetTile.building)) {
               const fromDir = (effectiveDirection + 2) % 4; // Item entered target from this direction
               
               // Defer processing to handle synchronization logic
               processorEntries.push({
                   item: tile.item,
                   fromX: x,
                   fromY: y,
                   toX: targetCoords.x,
                   toY: targetCoords.y,
                   fromDir
               });
               tile.item = undefined; // Optimistically remove
               continue;
            }

            // BELT to BELT, or EXTRACTOR to BELT/Processor
            // If target tile is a belt or processor and currently empty (no item on it)
            if (!targetTile.item) {
                // If the item needs to move, record its intended movement
                itemMoves.push({
                    item: tile.item,
                    fromX: x,
                    fromY: y,
                    toX: targetCoords.x,
                    toY: targetCoords.y,
                });
                tile.item = undefined; // Item leaves source tile
            }
          }
        }
      }
    }
  }

  // 3. Handle Processor Entries (Synchronization Logic)
  // Group entries by target tile
  const entriesByTarget = new Map<string, typeof processorEntries>();
  processorEntries.forEach(entry => {
      const key = `${entry.toX},${entry.toY}`;
      if (!entriesByTarget.has(key)) entriesByTarget.set(key, []);
      entriesByTarget.get(key)!.push(entry);
  });

  entriesByTarget.forEach((entries, key) => {
      const [tx, ty] = key.split(',').map(Number);
      const targetTile = nextGrid[ty][tx];
      
      // Check Constraints
      const acceptedEntries: typeof processorEntries = [];
      
      // All processors now require distinct input directions
      const usedDirs = new Set(targetTile.storedItems.map(i => i.fromDir));
      let slotsAvailable = 2 - targetTile.storedItems.length;
      
      for (const entry of entries) {
          if (slotsAvailable <= 0) break;
          
          if (!usedDirs.has(entry.fromDir)) {
              acceptedEntries.push(entry);
              usedDirs.add(entry.fromDir);
              slotsAvailable--;
          }
          // If dir is already used, we skip/reject this entry
      }

      // Process Accepted Entries
      acceptedEntries.forEach(entry => {
          targetTile.storedItems.push({ item: entry.item, fromDir: entry.fromDir });
      });
      
      // Reject Remaining Entries (either capacity full or dir conflict)
      // Any entry in `entries` that is NOT in `acceptedEntries` must be bounced
      const acceptedSet = new Set(acceptedEntries);
      entries.forEach(entry => {
          if (!acceptedSet.has(entry)) {
              const sourceTile = getTile(entry.fromX, entry.fromY);
              if (sourceTile) {
                  // Restore item to source
                  entry.item.x = entry.fromX;
                  entry.item.y = entry.fromY;
                  entry.item.lastX = entry.fromX;
                  entry.item.lastY = entry.fromY;
                  entry.item.animationPhase = 1; // Reset animation
                  sourceTile.item = entry.item;
              }
          }
      });
  });

  // 4. Apply Belt Moves
  itemMoves.forEach(({ item, fromX, fromY, toX, toY }) => {
    const targetTile = getTile(toX, toY);
    if (targetTile && !targetTile.item) { // Ensure target is still empty after other moves
      item.lastX = fromX; // Record where it came from
      item.lastY = fromY;
      item.x = toX; // Set new logical position
      item.y = toY;
      item.animationPhase = 0; // Reset animation progress
      targetTile.item = item;
    } else {
      // Move failed (target occupied by another moving item or blocked)
      // Return item to source tile
      const sourceTile = getTile(fromX, fromY);
      if (sourceTile) {
         // Ensure logic coords match source (they should be, but be safe)
         item.x = fromX;
         item.y = fromY;
         item.lastX = fromX;
         item.lastY = fromY;
         item.animationPhase = 1; // Stays still
         sourceTile.item = item;
      }
    }
  });


  return {
    ...currentState,
    grid: nextGrid,
    score: nextScore,
    isLevelComplete,
    tickCount: currentState.tickCount + 1,
    lastScoreIncrease: scoreIncreased
  };
};
