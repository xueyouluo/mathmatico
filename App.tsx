
import React, { useState, useEffect, useRef } from 'react';
import GridCell from './components/GridCell';
import Controls from './components/Controls';
import { GameState, BuildingType, Direction, GRID_WIDTH, GRID_HEIGHT, Tile, Difficulty } from './types';
import { initializeGrid, processTick } from './utils/gameLogic';
import { TICK_RATE_MS, generateLevel } from './constants';
import { Trophy, HelpCircle, Play, Pause, RefreshCw, ArrowRight, Star, ChevronRight, ChevronLeft, BookOpen, BrainCircuit, Calculator, Sigma, Binary, Percent, Divide, Plus, X, Minus, Lightbulb } from 'lucide-react';
import clsx from 'clsx';
import TutorialDemo from './components/TutorialDemo';
import { solveLevel } from './utils/solver';

const App: React.FC = () => {
  // Game Configuration
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');

  // Initialize with Level 1
  const initialLevel = generateLevel(0, difficulty);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, 0, difficulty, initialLevel.availableNumbers),
    score: 0,
    levelIndex: 0,
    currentLevel: initialLevel,
    isLevelComplete: false,
    tickCount: 0,
    lastScoreIncrease: null,
  });

  const handleHint = () => {
    // 1. Gather all source numbers
    const sources: number[] = [];
    gameState.grid.forEach(row => {
      row.forEach(tile => {
        if (tile.building === BuildingType.EXTRACTOR && tile.extractorValue !== undefined) {
          sources.push(tile.extractorValue);
        }
      });
    });

    if (sources.length === 0) {
      setHintContent("地图上没有数字源！");
      setShowHint(true);
      return;
    }

    // 2. Solve
    const solution = solveLevel(sources, gameState.currentLevel.target, difficulty);
    
    if (solution) {
      setHintContent(solution);
    } else {
      setHintContent("抱歉，暂未找到简单的组合解法，请尝试利用更多的数字！");
    }
    setShowHint(true);
  };

  // UI State
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType>(BuildingType.BELT);
  const [selectedNumber, setSelectedNumber] = useState<number>(1);
  const [currentDirection, setCurrentDirection] = useState<Direction>(Direction.RIGHT);
  const [paused, setPaused] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(true);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  
  // Hint State
  const [showHint, setShowHint] = useState(false);
  const [hintContent, setHintContent] = useState<string | null>(null);
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [isRightDragging, setIsRightDragging] = useState(false);
  const lastDragPos = useRef<{x: number, y: number} | null>(null);
  const dragStartPixelPos = useRef<{x: number, y: number} | null>(null); // For touch deadzone

  // Mobile / Responsive State
  const [scale, setScale] = useState(1);
  const [gridWrapperSize, setGridWrapperSize] = useState<{width: number, height: number} | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scale Calculation Logic
  useEffect(() => {
    const handleResize = () => {
      if (!gameAreaRef.current) return;
      
      // Get the container's dimensions directly
      const { width, height } = gameAreaRef.current.getBoundingClientRect();
      
      // Board logical size: 
      // Width = GRID_WIDTH * 64
      // Height = GRID_HEIGHT * 64
      // No extra padding for mobile calculation to ensure full fit
      const padding = window.innerWidth < 768 ? 0 : 16;
      const boardW = GRID_WIDTH * 64 + padding;
      const boardH = GRID_HEIGHT * 64 + padding;

      const scaleX = width / boardW;
      const scaleY = height / boardH;
      
      // Use a tighter margin. On mobile, we want it as big as possible (1.0).
      const marginFactor = window.innerWidth < 768 ? 1.0 : 0.95;
      
      // Calculate scale to fit
      const newScale = Math.min(scaleX, scaleY, 1.2) * marginFactor;
      
      setScale(newScale);
      
      // Update wrapper size to match scaled content exactly
      // This removes the "ghost space" taken by the unscaled element
      setGridWrapperSize({
          width: boardW * newScale,
          height: boardH * newScale
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calc
    // Recalculate after a short delay to ensure layout is stable
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch Handlers for Mobile Dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent scrolling while playing
    // e.preventDefault(); // React synthetic event cant be prevented this way always, handled by touch-none CSS

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      // Traverse up to find the grid cell wrapper with data attributes
      const cell = element.closest('[data-x]');
      if (cell) {
        const x = parseInt(cell.getAttribute('data-x') || '-1');
        const y = parseInt(cell.getAttribute('data-y') || '-1');
        
        if (x !== -1 && y !== -1) {
           if (!isDragging) {
               // Frame 1: Start Drag/Tap
               setIsDragging(true);
               lastDragPos.current = { x, y };
               dragStartPixelPos.current = { x: touch.clientX, y: touch.clientY };
               
               // Execute Interact immediately (Tap logic)
               handleInteract(x, y);
           } else {
               // Frame 2+: Continuation
               if (dragStartPixelPos.current) {
                   const dx = touch.clientX - dragStartPixelPos.current.x;
                   const dy = touch.clientY - dragStartPixelPos.current.y;
                   const dist = Math.sqrt(dx * dx + dy * dy);
                   
                   // Deadzone check: prevent jitter from triggering drag-draw
                   if (dist < 15) return; 
               }
               
               handleMouseEnter(x, y);
           }
        }
      }
    }
  };
  
  const handleTouchEnd = () => {
     setIsDragging(false);
     setIsRightDragging(false);
     lastDragPos.current = null;
     dragStartPixelPos.current = null;
  };

  // Tutorial Steps
  const TUTORIAL_STEPS = [
    {
      title: "欢迎来到无尽工厂",
      content: "这是一个无限挑战。你的目标是利用地图上的资源，合成目标数字并输送到绿色的【中心】。",
      demo: <TutorialDemo type="goal" />
    },
    {
      title: "随机资源与方向",
      content: "地图上会随机生成数字。在【困难模式】下，偶尔会出现 10-99 的大数字！利用除法和减法来削减它们，以达成目标。",
      demo: <TutorialDemo type="resources" />
    },
    {
      title: "运算机器",
      content: "机器需要两个输入。注意箭头方向：对于减法和除法，【后方输入】（箭头反方向）是被减数/被除数，【侧面输入】是减数/除数。结果沿箭头输出。",
      demo: <TutorialDemo type="math" />
    },
    {
      title: "调整与删除",
      content: "点错了吗？选择【橡皮擦】或直接【点击鼠标右键】即可删除。点击已有的方块可以【旋转】它的方向。",
      demo: <TutorialDemo type="controls" />
    },
    {
      title: "难度选择",
      content: "觉得太难？可以点击顶部的开关切换【简单模式】（仅加减法，数字小）或【困难模式】（包含乘除法，有大数字）。",
      demo: <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden"><BrainCircuit className="text-emerald-500" size={64} /></div>
    }
  ];

  // Game Loop
  useEffect(() => {
    if (paused || gameState.isLevelComplete || showTutorial) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setGameState((prev) => processTick(prev));
    }, TICK_RATE_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, gameState.isLevelComplete, showTutorial]);

  // Animation Loop (requestAnimationFrame)
  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = performance.now();

    const animate = () => {
      if (paused || gameState.isLevelComplete || showTutorial) {
        return;
      }

      const now = performance.now();
      const deltaTime = now - lastFrameTime; // Time elapsed since last frame
      lastFrameTime = now;

      setGameState(prevGameState => {
        let gridChanged = false;
        const newGrid = prevGameState.grid.map(row => row.map(tile => {
          if (tile.item && tile.item.animationPhase < 1) {
            // Speed up animation slightly (90% of tick rate) to ensure it finishes before next tick
            // This prevents visual "snap back" when tick updates logical position
            const newAnimationPhase = Math.min(1, tile.item.animationPhase + (deltaTime / (TICK_RATE_MS * 0.9)));
            if (newAnimationPhase !== tile.item.animationPhase) { // Only update if phase actually changed
              gridChanged = true;
              return {
                ...tile,
                item: {
                  ...tile.item,
                  animationPhase: newAnimationPhase,
                },
              };
            }
          }
          return tile;
        }));

        if (gridChanged) {
          return { ...prevGameState, grid: newGrid };
        }
        return prevGameState;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate); // Start the animation loop

    return () => {
      cancelAnimationFrame(animationFrameId); // Clean up on unmount or dependency change
    };
  }, [paused, gameState.isLevelComplete, showTutorial]); // Dependencies ensure loop restarts when necessary

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') rotate();
      if (e.key === ' ') setPaused(p => !p);
    };
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsRightDragging(false);
      lastDragPos.current = null;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Effect to update level config if difficulty changes mid-game for NEW levels,
  // but usually we might want to restart or just apply to next level.
  // Here we just keep playing, but `nextLevel` will use the new difficulty.

  const rotate = () => setCurrentDirection((prev) => (prev + 1) % 4);

  const modifyTile = (grid: Tile[][], x: number, y: number, updates: Partial<Tile>): Tile[][] => {
    if (y < 0 || y >= GRID_HEIGHT || x < 0 || x >= GRID_WIDTH) return grid;
    
    // Prevent overwriting Hub or Extractor (Source)
    const existing = grid[y][x];
    if (existing.building === BuildingType.HUB || existing.building === BuildingType.EXTRACTOR) return grid;
    
    const newGrid = [...grid];
    newGrid[y] = [...newGrid[y]];
    newGrid[y][x] = { ...newGrid[y][x], ...updates };
    return newGrid;
  };

  const rotateTile = (x: number, y: number) => {
    setGameState((prev) => {
      const currentTile = prev.grid[y][x];
      // Allow rotating user-placed blocks. Extractors can be rotated but usually don't need to be if they are sources. 
      // Actually, let's allow rotating processors/belts.
      if (currentTile.building === BuildingType.NONE || currentTile.building === BuildingType.HUB || currentTile.building === BuildingType.EXTRACTOR) return prev;
      
      const newDirection = ((currentTile.direction + 1) % 4) as Direction;
      return { ...prev, grid: modifyTile(prev.grid, x, y, { direction: newDirection }) };
    });
  };

  const placeBuilding = (x: number, y: number, directionOverride?: Direction) => {
    setGameState((prev) => {
      const building = selectedBuilding;
      const dir = directionOverride !== undefined ? directionOverride : currentDirection;
      // Removed Extractor logic since user can't select it
      
      const newGrid = modifyTile(prev.grid, x, y, {
        building,
        direction: dir,
        extractorValue: undefined,
        item: building === BuildingType.BELT ? prev.grid[y][x].item : undefined,
        storedItems: []
      });
      return { ...prev, grid: newGrid };
    });
  };

  const eraseBuilding = (x: number, y: number) => {
    setGameState((prev) => ({ ...prev, grid: modifyTile(prev.grid, x, y, { building: BuildingType.NONE, item: undefined, storedItems: [] }) }));
  };

  const handleInteract = (x: number, y: number) => {
      const tile = gameState.grid[y][x];
      const isSameBuilding = tile.building === selectedBuilding;
      
      // If clicking an existing building with the same tool, rotate it.
      // Exception: Belt rotation is always useful.
      if (tile.building !== BuildingType.NONE && selectedBuilding !== BuildingType.NONE && isSameBuilding) {
         rotateTile(x, y);
      } else {
         placeBuilding(x, y);
      }
  };

  const handleMouseDown = (e: React.MouseEvent, x: number, y: number) => {
    if (e.button === 0) {
      setIsDragging(true);
      lastDragPos.current = { x, y };
      handleInteract(x, y);
    } else if (e.button === 2) {
      setIsRightDragging(true);
      eraseBuilding(x, y);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isRightDragging) { eraseBuilding(x, y); return; }
    if (!isDragging) return;
    const prevPos = lastDragPos.current;
    if (!prevPos || (prevPos.x === x && prevPos.y === y)) return;

    const dx = x - prevPos.x;
    const dy = y - prevPos.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
       lastDragPos.current = { x, y }; 
       // For drag enter, we usually just place (overwrite), unless we want smart drag-rotate logic.
       // Current logic was: placeBuilding(x, y);
       // Let's keep simple placement for drag entry to avoid flickering rotations.
       placeBuilding(x, y); 
       return;
    }

    let dragDir: Direction = Direction.RIGHT;
    if (dy === -1) dragDir = Direction.UP;
    if (dy === 1) dragDir = Direction.DOWN;
    if (dx === -1) dragDir = Direction.LEFT;
    if (dx === 1) dragDir = Direction.RIGHT;

    if (selectedBuilding === BuildingType.BELT) {
      setGameState(prev => {
        const newGrid = modifyTile(prev.grid, prevPos.x, prevPos.y, { direction: dragDir });
        return { ...prev, grid: newGrid };
      });
      placeBuilding(x, y, dragDir);
    } else {
      placeBuilding(x, y);
    }
    lastDragPos.current = { x, y };
  };

  const nextLevel = () => {
    const nextIndex = gameState.levelIndex + 1;
    const nextConfig = generateLevel(nextIndex, difficulty);
    
    setGameState({
      grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, nextIndex, difficulty, nextConfig.availableNumbers),
      score: gameState.score, // Keep score accumulator
      levelIndex: nextIndex,
      currentLevel: nextConfig,
      isLevelComplete: false,
      tickCount: 0,
      lastScoreIncrease: null,
    });
  };

  const resetGame = () => {
    const firstLevel = generateLevel(0, difficulty);
    setGameState({
      grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, 0, difficulty, firstLevel.availableNumbers),
      score: 0,
      levelIndex: 0,
      currentLevel: firstLevel,
      isLevelComplete: false,
      tickCount: 0,
      lastScoreIncrease: null,
    });
  };

  const toggleDifficulty = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    // If we are in level 1 (index 0) with no score, restart the game with new settings immediately for better UX
    if (gameState.levelIndex === 0 && gameState.score === 0) {
        const firstLevel = generateLevel(0, newDiff);
        setGameState(prev => ({ 
            ...prev, 
            currentLevel: firstLevel,
            grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, 0, newDiff, firstLevel.availableNumbers) 
        }));
    }
  };

  const handleNextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handlePrevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center font-sans text-gray-800 select-none overflow-hidden relative">
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
         <div className="absolute inset-0" style={{ 
             backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
         }}></div>
         
         {/* Floating Math Symbols */}
         <div className="absolute top-10 left-10 text-indigo-200 animate-pulse"><Sigma size={120} /></div>
         <div className="absolute bottom-20 right-20 text-emerald-200 animate-bounce duration-[3000ms]"><Calculator size={100} /></div>
         <div className="absolute top-1/3 right-10 text-blue-200 rotate-12"><Percent size={80} /></div>
         <div className="absolute bottom-10 left-1/4 text-orange-200 -rotate-12"><Binary size={90} /></div>
         <div className="absolute top-20 left-1/2 text-purple-100"><Plus size={60} /></div>
         <div className="absolute top-1/2 left-10 text-red-100"><Minus size={70} /></div>
      </div>

      {/* Header / HUD */}
      <div className="w-full bg-white/90 backdrop-blur-sm shadow-md p-3 flex flex-col md:flex-row justify-between items-center px-4 md:px-8 z-10 border-b border-gray-200 gap-4">
        
        {/* Left: Level Info & Difficulty */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 whitespace-nowrap">
               <span className="font-bold">第 {gameState.currentLevel.id} 关</span>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => toggleDifficulty('EASY')}
                    className={clsx(
                        "px-3 py-1 rounded-md text-xs font-bold transition-all",
                        difficulty === 'EASY' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    简单
                </button>
                <button 
                    onClick={() => toggleDifficulty('HARD')}
                    className={clsx(
                        "px-3 py-1 rounded-md text-xs font-bold transition-all",
                        difficulty === 'HARD' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    困难
                </button>
            </div>

            <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="帮助">
                <BookOpen size={24} />
            </button>
            <button onClick={handleHint} className="p-2 hover:bg-yellow-100 rounded-full text-yellow-500" title="提示">
                <Lightbulb size={24} fill="currentColor" />
            </button>
        </div>

        {/* Center: Targets */}
        <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">目标</span>
                <div className="text-3xl md:text-4xl font-black text-indigo-600">
                    {gameState.currentLevel.target}
                </div>
            </div>

            <div className="h-10 w-px bg-gray-200"></div>

            <div className="flex flex-col items-center relative">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">总分</span>
                <div className="text-2xl md:text-3xl font-bold text-emerald-600 flex items-center gap-2">
                    <Trophy size={20} />
                    {gameState.score}
                </div>
                {gameState.lastScoreIncrease && (
                    <div className="absolute -top-4 right-0 text-emerald-500 font-bold text-xl animate-ping">
                        +{gameState.lastScoreIncrease}
                    </div>
                )}
            </div>
        </div>

        {/* Right: Controls */}
        <div className="flex gap-2">
            <button onClick={() => setPaused(!paused)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 flex gap-2">
                {paused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <button onClick={resetGame} className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold flex gap-2" title="重新开始">
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      {/* Level Description Banner */}
      <div className="w-full bg-indigo-50/90 backdrop-blur-sm text-indigo-800 py-1 text-center text-sm font-medium border-b border-indigo-100 px-4 truncate z-10">
         {gameState.currentLevel.description}
      </div>

      {/* Main Game Area - Flex 1 to take remaining space */}
      <div 
        ref={gameAreaRef}
        className="flex-1 w-full relative overflow-hidden flex items-center justify-center bg-blue-50/50"
      >
        {/* Grid Wrapper with Dynamic Scale */}
        {/* Explicit size ensures layout is compact */}
        <div 
           style={{ 
              width: gridWrapperSize ? gridWrapperSize.width : 'auto',
              height: gridWrapperSize ? gridWrapperSize.height : 'auto',
              // We don't scale THIS div, we scale its child. 
              // This div acts as the tight bounding box in the layout flow.
           }}
           className="relative flex items-center justify-center transition-all duration-200"
        >
          <div 
            className="origin-center shadow-2xl rounded-xl border-4 border-indigo-50/50 absolute"
            style={{ 
               transform: `scale(${scale})`,
               // Since we center the child absolutely, 'origin-center' works if we don't offset it.
               // But easier: Let this div just be the scaler.
               // Actually, best approach for "fit to box":
               // Outer box (relative) has size W*S, H*S.
               // Inner box (absolute) has size W, H.
               // Transform scale(S), origin top-left.
               top: 0, left: 0,
               width: GRID_WIDTH * 64 + 16, // Logical size
               height: GRID_HEIGHT * 64 + 16,
               transformOrigin: 'top left'
            }}
          >
            <div 
              className="grid gap-0 border-2 border-gray-100 bg-white p-1 rounded-lg touch-none h-full w-full"
              style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, min-content)` }}
              onMouseLeave={() => { setIsDragging(false); setIsRightDragging(false); lastDragPos.current = null; }}
              onContextMenu={(e) => e.preventDefault()}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchStart={(e) => handleTouchMove(e)}
            >
              {gameState.grid.map((row, y) => (
                row.map((tile, x) => (
                  <GridCell 
                    key={`${x}-${y}`} 
                    tile={tile} 
                    onMouseDown={(e) => handleMouseDown(e, x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ))
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Area - Fixed at bottom */}
      <div className="w-full z-20 px-2 pb-2 pt-0 bg-transparent pointer-events-none flex justify-center">
         <div className="pointer-events-auto w-full max-w-4xl">
            <Controls 
              selectedBuilding={selectedBuilding}
              onSelect={setSelectedBuilding}
              selectedNumber={selectedNumber}
              onSelectNumber={setSelectedNumber}
              onRotate={rotate}
              difficulty={difficulty}
            />
         </div>
      </div>

      {/* Hint Modal */}
      {showHint && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHint(false)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center text-center relative overflow-hidden border-4 border-yellow-200 transform animate-in zoom-in-95 duration-200 mx-4" onClick={e => e.stopPropagation()}>
            
            {/* Close Button */}
            <button onClick={() => setShowHint(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
               <X size={24} />
            </button>

            {/* Header */}
            <div className="bg-yellow-100 p-4 rounded-full text-yellow-500 mb-4 shadow-inner">
               <Lightbulb size={48} fill="currentColor" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">运算提示</h2>
            <p className="text-gray-500 text-sm mb-6">利用当前的资源，可以尝试以下组合：</p>

            {/* Equation Display */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 w-full mb-6">
               <div className="font-mono text-xl md:text-2xl font-bold text-indigo-600 break-words leading-relaxed whitespace-pre-wrap">
                  {hintContent}
               </div>
            </div>

            <button 
              onClick={() => setShowHint(false)}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold shadow-lg shadow-yellow-200 transition-all"
            >
              明白了
            </button>
          </div>
        </div>
      )}

      {/* Level Complete Modal */}
      {gameState.isLevelComplete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center text-center relative overflow-hidden border-4 border-yellow-400 transform animate-in zoom-in-95 duration-300">
            {/* Shiny Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-50 via-white to-yellow-50 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="mb-4 flex justify-center">
                 <div className="bg-yellow-100 p-4 rounded-full text-yellow-500 shadow-inner">
                    <Star size={64} fill="currentColor" className="animate-spin-slow" />
                 </div>
              </div>
              <h2 className="text-4xl font-black text-gray-800 mb-2">关卡完成!</h2>
              <p className="text-gray-500 text-lg mb-8">
                成功合成数字 <span className="font-bold text-indigo-600 text-2xl">{gameState.currentLevel.target}</span> !
              </p>
              
              <button 
                onClick={nextLevel}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                下一关 <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 mx-4">
            {/* Tutorial Header / Demo Area */}
            <div className="bg-white p-6 pb-0">
                {TUTORIAL_STEPS[tutorialStep].demo}
            </div>

            {/* Content */}
            <div className="p-6 pt-2 flex-1">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{TUTORIAL_STEPS[tutorialStep].title}</h2>
                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                        {tutorialStep + 1} / {TUTORIAL_STEPS.length}
                    </span>
                </div>
                
                <p className="text-gray-600 leading-relaxed text-lg mb-6 min-h-[80px]">
                    {TUTORIAL_STEPS[tutorialStep].content}
                </p>

                {/* Navigation */}
                <div className="flex gap-4 mt-4">
                    <button 
                        onClick={handlePrevStep}
                        disabled={tutorialStep === 0}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                    >
                       <ChevronLeft size={20} /> 上一步
                    </button>
                    
                    <button 
                        onClick={handleNextStep}
                        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        {tutorialStep === TUTORIAL_STEPS.length - 1 ? '开始游戏' : '下一步'} 
                        {tutorialStep !== TUTORIAL_STEPS.length - 1 && <ChevronRight size={20} />}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
