
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GridCell from './components/GridCell';
import Controls from './components/Controls';
import { GameState, BuildingType, Direction, GRID_WIDTH, GRID_HEIGHT, Tile, Difficulty, GameSpeed } from './types';
import { initializeGrid, processTick } from './utils/gameLogic';
import { TICK_RATE_MS, generateLevel } from './constants';
import { Trophy, HelpCircle, Play, Pause, RefreshCw, ArrowRight, Star, ChevronRight, ChevronLeft, BookOpen, BrainCircuit, Calculator, Sigma, Binary, Percent, Divide, Plus, X, Minus, Lightbulb, Zap, FastForward, Activity, Globe } from 'lucide-react';
import clsx from 'clsx';
import TutorialDemo from './components/TutorialDemo';
import { solveLevel } from './utils/solver';
import { Language, detectLanguage, translations } from './utils/i18n';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<Language>(() => {
      const saved = localStorage.getItem('mathmatico_lang');
      if (saved === 'zh' || saved === 'en') return saved;
      return detectLanguage();
  });
  
  const t = translations[lang];

  const toggleLanguage = () => {
    const newLang = lang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    localStorage.setItem('mathmatico_lang', newLang);
  };

  // Game Configuration
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const storedDifficulty = localStorage.getItem('mathmatico_difficulty');
      return storedDifficulty === 'HARD' ? 'HARD' : 'EASY';
    } catch (error) {
      console.error("Failed to load difficulty from localStorage", error);
      return 'EASY';
    }
  });
  const [speed, setSpeed] = useState<GameSpeed>('NORMAL');

  // Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    let savedScore = 0;
    let savedLevelIndex = 0;
    try {
      const storedScore = localStorage.getItem('mathmatico_score');
      const storedLevelIndex = localStorage.getItem('mathmatico_levelIndex');
      if (storedScore) savedScore = parseInt(storedScore, 10);
      if (storedLevelIndex) savedLevelIndex = parseInt(storedLevelIndex, 10);
    } catch (error) {
      console.error("Failed to load game state from localStorage", error);
    }

    const initialLevelConfig = generateLevel(savedLevelIndex, difficulty);
    
    return {
      grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, savedLevelIndex, difficulty, initialLevelConfig.availableNumbers),
      score: savedScore,
      levelIndex: savedLevelIndex,
      currentLevel: initialLevelConfig,
      isLevelComplete: false,
      tickCount: 0,
      lastScoreIncrease: null,
    };
  });

  const handleHint = () => {
    if (gameState.score < 1000) {
      setHintContent(t.hint_need_points);
      setShowHint(true);
      return;
    }

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
      setHintContent(t.hint_no_sources);
      setShowHint(true);
      return;
    }

    // 2. Solve
    const solution = solveLevel(sources, gameState.currentLevel.target, difficulty);
    
    if (solution) {
      setHintContent(solution);
      // Deduct score
      setGameState(prev => ({ ...prev, score: prev.score - 1000 }));
    } else {
      setHintContent(t.hint_no_solution);
    }
    setShowHint(true);
  };

  // UI State
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType>(BuildingType.BELT);
  const [selectedNumber, setSelectedNumber] = useState<number>(1);

  const [paused, setPaused] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      const hasScore = localStorage.getItem('mathmatico_score');
      const hasLevel = localStorage.getItem('mathmatico_levelIndex');
      const tutorialSeen = localStorage.getItem('mathmatico_tutorial_seen');
      
      // Don't show if user has played before (score/level exists) or explicitly seen it
      if (hasScore || hasLevel || tutorialSeen) return false;
      return true;
    } catch (e) {
      return true;
    }
  });
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  
  // Hint State
  const [showHint, setShowHint] = useState(false);
  const [hintContent, setHintContent] = useState<string | null>(null);
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [isRightDragging, setIsRightDragging] = useState(false);
  const lastDragPos = useRef<{x: number, y: number} | null>(null);
  const dragStartPixelPos = useRef<{x: number, y: number} | null>(null); // For touch deadzone
  const isDragOutFromExtractor = useRef(false);

  // Mobile / Responsive State
  const [scale, setScale] = useState(1);
  const [gridWrapperSize, setGridWrapperSize] = useState<{width: number, height: number} | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scale Calculation Logic
  useEffect(() => {
    if (isLoading) return;

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
    
    // Initial calc
    handleResize();
    
    // Recalculate after a short delay to ensure layout is stable
    const timer = setTimeout(handleResize, 100);

    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [isLoading]);

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
               // Check for Extractor/Processor drag-out start (Mirroring handleMouseDown)
               const startTile = gameState.grid[y][x];
               const isProcessor = [BuildingType.ADDER, BuildingType.SUBTRACTOR, BuildingType.MULTIPLIER, BuildingType.DIVIDER].includes(startTile.building);

               if ((startTile.building === BuildingType.EXTRACTOR || isProcessor) && selectedBuilding !== BuildingType.NONE) {
                   isDragOutFromExtractor.current = true;
               } else {
                   isDragOutFromExtractor.current = false;
                   handleInteract(x, y);
               }
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
     isDragOutFromExtractor.current = false;
  };

  // Tutorial Steps
  const TUTORIAL_STEPS = [
    {
      title: t.tut_intro_title,
      content: t.tut_intro_content,
      demo: <TutorialDemo type="goal" />
    },
    {
      title: t.tut_resources_title,
      content: t.tut_resources_content,
      demo: <TutorialDemo type="resources" />
    },
    {
      title: t.tut_machines_title,
      content: t.tut_machines_content,
      demo: <TutorialDemo type="math" />
    },
    {
      title: t.tut_controls_title,
      content: t.tut_controls_content,
      demo: <TutorialDemo type="controls" />
    },
    {
      title: t.tut_difficulty_title,
      content: t.tut_difficulty_content,
      demo: <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden"><BrainCircuit className="text-emerald-500" size={64} /></div>
    }
  ];

  // Game Loop
  useEffect(() => {
    if (paused || gameState.isLevelComplete || showTutorial) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const currentTickRate = speed === 'NORMAL' ? TICK_RATE_MS : (speed === 'FAST' ? TICK_RATE_MS / 2 : TICK_RATE_MS / 4);

    intervalRef.current = setInterval(() => {
      setGameState((prev) => processTick(prev));
    }, currentTickRate);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, gameState.isLevelComplete, showTutorial, speed]);

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

      const currentTickRate = speed === 'NORMAL' ? TICK_RATE_MS : (speed === 'FAST' ? TICK_RATE_MS / 2 : TICK_RATE_MS / 4);

      setGameState(prevGameState => {
        let gridChanged = false;
        const newGrid = prevGameState.grid.map(row => row.map(tile => {
          if (tile.item && tile.item.animationPhase < 1) {
            // Speed up animation slightly (90% of tick rate) to ensure it finishes before next tick
            // This prevents visual "snap back" when tick updates logical position
            const newAnimationPhase = Math.min(1, tile.item.animationPhase + (deltaTime / (currentTickRate * 0.9)));
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
  }, [paused, gameState.isLevelComplete, showTutorial, speed]); // Dependencies ensure loop restarts when necessary

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') setPaused(p => !p);
    };
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsRightDragging(false);
      lastDragPos.current = null;
      isDragOutFromExtractor.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Timer for Hint Offer
  const [showHintOffer, setShowHintOffer] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setShowHintOffer(false);
    
    const timerInterval = setInterval(() => {
      if (Date.now() - startTimeRef.current > 60000 && !gameState.isLevelComplete && !showHintOffer) { // 1 minute
         setShowHintOffer(true);
         clearInterval(timerInterval);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState.levelIndex]); // Reset on level change

  // Save/Load Game Progress functions
  const saveGameProgress = useCallback((scoreToSave: number, levelIndexToSave: number, difficultyToSave: Difficulty) => {
    try {
      localStorage.setItem('mathmatico_score', scoreToSave.toString());
      localStorage.setItem('mathmatico_levelIndex', levelIndexToSave.toString());
      localStorage.setItem('mathmatico_difficulty', difficultyToSave);
    } catch (error) {
      console.error("Failed to save game state to localStorage", error);
    }
  }, []);

  const clearGameProgress = useCallback(() => {
    try {
      localStorage.removeItem('mathmatico_score');
      localStorage.removeItem('mathmatico_levelIndex');
      localStorage.removeItem('mathmatico_difficulty');
    } catch (error) {
      console.error("Failed to clear game state from localStorage", error);
    }
  }, []);



  const modifyTile = (grid: Tile[][], x: number, y: number, updates: Partial<Tile>): Tile[][] => {
    if (y < 0 || y >= GRID_HEIGHT || x < 0 || x >= GRID_WIDTH) return grid;
    
        const existing = grid[y][x];
        
        // 1. Strictly Protected: HUB, EXTRACTOR
        // Cannot be overwritten OR erased.
        if (existing.building === BuildingType.HUB || existing.building === BuildingType.EXTRACTOR) {
             if (updates.building !== undefined && updates.building !== existing.building) {
                 return grid;
             }
        }
    
        // 2. Protected from Overwrite: Processors
        // Cannot be overwritten by placing another building on top (except Eraser).
        const overwriteProtected = [
          BuildingType.ADDER, 
          BuildingType.SUBTRACTOR, 
          BuildingType.MULTIPLIER, 
          BuildingType.DIVIDER,
        ];
    
        if (overwriteProtected.includes(existing.building) 
            && updates.building !== undefined 
            && updates.building !== existing.building
            && updates.building !== BuildingType.NONE) {
            return grid;
        }
        
        const newGrid = [...grid];    newGrid[y] = [...newGrid[y]];
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

  const placeBuilding = (x: number, y: number, directionOverride?: Direction, buildingTypeOverride?: BuildingType) => {
    setGameState((prev) => {
      const building = buildingTypeOverride !== undefined ? buildingTypeOverride : selectedBuilding;
      const dir = directionOverride !== undefined ? directionOverride : Direction.RIGHT;
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
      
      // If starting drag on an Extractor or Processor, engage "Belt Drag-Out" mode
      // UNLESS we are using the Eraser!
      const startTile = gameState.grid[y][x];
      const isProcessor = [BuildingType.ADDER, BuildingType.SUBTRACTOR, BuildingType.MULTIPLIER, BuildingType.DIVIDER].includes(startTile.building);
      
      if ((startTile.building === BuildingType.EXTRACTOR || isProcessor) && selectedBuilding !== BuildingType.NONE) {
          isDragOutFromExtractor.current = true;
      } else {
          isDragOutFromExtractor.current = false;
          handleInteract(x, y);
      }
    } else if (e.button === 2) {
      setIsRightDragging(true);
      eraseBuilding(x, y);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isRightDragging) { eraseBuilding(x, y); return; }
    if (!isDragging) return;

    // Determine effective tool
    // If dragging out from extractor/machine, strictly use BELT regardless of selected tool
    const effectiveBuildingType = isDragOutFromExtractor.current ? BuildingType.BELT : selectedBuilding;

    // Eraser Tool Logic (Left-click drag to erase)
    if (effectiveBuildingType === BuildingType.NONE) {
      eraseBuilding(x, y);
      return;
    }

    // Only allow drag-painting for Belts
    if (effectiveBuildingType !== BuildingType.BELT) return;

    const prevPos = lastDragPos.current;
    if (!prevPos || (prevPos.x === x && prevPos.y === y)) return;

    const dx = x - prevPos.x;
    const dy = y - prevPos.y;
    
    // Determine drag direction if adjacent
    let dragDir: Direction | undefined;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
       if (dy === -1) dragDir = Direction.UP;
       if (dy === 1) dragDir = Direction.DOWN;
       if (dx === -1) dragDir = Direction.LEFT;
       if (dx === 1) dragDir = Direction.RIGHT;
    }

    // If we moved non-adjacently (fast drag), dragDir remains undefined and we use default direction logic in placeBuilding.

    if (dragDir !== undefined) {
      // If dragging out from a source (Extractor or Machine), this step sets its direction!
      setGameState(prev => {
        const newGrid = modifyTile(prev.grid, prevPos.x, prevPos.y, { direction: dragDir });
        return { ...prev, grid: newGrid };
      });
      placeBuilding(x, y, dragDir, effectiveBuildingType);
    } else {
      placeBuilding(x, y, undefined, effectiveBuildingType);
    }
    lastDragPos.current = { x, y };
  };

  const nextLevel = () => {
    const nextIndex = gameState.levelIndex + 1;
    const nextConfig = generateLevel(nextIndex, difficulty);
    
    setGameState({
      grid: initializeGrid(GRID_WIDTH, GRID_HEIGHT, nextIndex, difficulty, nextConfig.availableNumbers),
      score: gameState.score + 1000, // Increment score by 1000 for completing a level
      levelIndex: nextIndex,
      currentLevel: nextConfig,
      isLevelComplete: false,
      tickCount: 0,
      lastScoreIncrease: 1000, // Show the last score increase
    });

    // Save progress after moving to next level
    saveGameProgress(gameState.score + 1000, nextIndex, difficulty);
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

    // Clear saved progress on game reset
    clearGameProgress();
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
        })); // Corrected: added `})`
    }
    // Always save the new difficulty setting
    saveGameProgress(gameState.score, gameState.levelIndex, newDiff);
  };

  const handleNextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      setShowTutorial(false);
      try { localStorage.setItem('mathmatico_tutorial_seen', 'true'); } catch (e) {}
    }
  };

  const handlePrevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

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
               <span className="font-bold">{t.level.replace('{n}', gameState.currentLevel.id.toString())}</span>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => toggleDifficulty('EASY')}
                    className={clsx(
                        "px-3 py-1 rounded-md text-xs font-bold transition-all",
                        difficulty === 'EASY' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    {t.easy}
                </button>
                <button 
                    onClick={() => toggleDifficulty('HARD')}
                    className={clsx(
                        "px-3 py-1 rounded-md text-xs font-bold transition-all",
                        difficulty === 'HARD' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    {t.hard}
                </button>
            </div>

            <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title={t.help}>
                <BookOpen size={24} />
            </button>

            <button onClick={toggleLanguage} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
                <Globe size={24} />
            </button>

        </div>

        {/* Center: Targets */}
        <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t.target}</span>
                <div className="text-3xl md:text-4xl font-black text-indigo-600">
                    {gameState.currentLevel.target}
                </div>
            </div>

            <div className="h-10 w-px bg-gray-200"></div>

            <div className="flex flex-col items-center relative">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t.score}</span>
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
            <button onClick={resetGame} className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold flex gap-2" title={t.reset_game}>
                <RefreshCw size={20} />
            </button>
        </div>
      </div>



      {/* Main Game Area - Flex 1 to take remaining space */}
      <div 
        ref={gameAreaRef}
        className="flex-1 w-full relative overflow-hidden flex items-center justify-center bg-blue-50/50"
      >
        {/* Floating Hint Button */}
        <button 
            onClick={handleHint}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-20 bg-yellow-400 hover:bg-yellow-500 text-white font-bold p-2 md:py-2 md:px-4 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 border-2 border-yellow-300 animate-bounce-subtle opacity-90 hover:opacity-100"
            title={t.hint_cost}
        >
            <Lightbulb size={20} fill="currentColor" />
            <span className="hidden md:inline">{t.hint_cost}</span>
        </button>

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
              difficulty={difficulty}
              speed={speed}
              onToggleSpeed={() => setSpeed(s => s === 'NORMAL' ? 'FAST' : s === 'FAST' ? 'INSANE' : 'NORMAL')}
              lang={lang}
            />
         </div>
      </div>

      {/* Hint Offer Modal (Timer Triggered) */}
      {showHintOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHintOffer(false)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center relative overflow-hidden border-4 border-blue-200 transform animate-in zoom-in-95 duration-200 mx-4" onClick={e => e.stopPropagation()}>
            
            <div className="bg-blue-100 p-4 rounded-full text-blue-500 mb-4 shadow-inner">
               <HelpCircle size={48} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.hint_stuck_title}</h2>
            <p className="text-gray-500 text-sm mb-6">{t.hint_stuck_desc} <span className="font-bold text-red-500">1000</span> {t.hint_stuck_desc_2}</p>

            <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowHintOffer(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all"
                >
                  {t.no_thanks}
                </button>
                <button 
                  onClick={() => {
                      setShowHintOffer(false);
                      handleHint();
                  }}
                  className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Lightbulb size={18} fill="currentColor" /> {t.get_hint}
                </button>
            </div>
          </div>
        </div>
      )}

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
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.op_hint_title}</h2>
            <p className="text-gray-500 text-sm mb-6">{t.op_hint_desc}</p>

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
              {t.got_it}
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
              <h2 className="text-4xl font-black text-gray-800 mb-2">{t.level_complete}</h2>
              <p className="text-gray-500 text-lg mb-8">
                {t.success_msg} <span className="font-bold text-indigo-600 text-2xl">{gameState.currentLevel.target}</span> !
              </p>
              
              <button 
                onClick={nextLevel}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                {t.next_level} <ArrowRight size={24} />
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
                       <ChevronLeft size={20} /> {t.prev_step}
                    </button>
                    
                    <button 
                        onClick={handleNextStep}
                        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        {tutorialStep === TUTORIAL_STEPS.length - 1 ? t.start_game : t.next_step} 
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
