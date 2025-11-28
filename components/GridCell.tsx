
import React from 'react';
import { ChevronsUp, Plus, Minus, X, Divide, Trash2, Home, ArrowUp, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { Tile, Direction, BuildingType } from '../types';
import clsx from 'clsx';
import { TICK_RATE_MS } from '../constants'; // Import TICK_RATE_MS

interface GridCellProps {
  tile: Tile;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const GridCell: React.FC<GridCellProps> = ({ tile, onMouseDown, onMouseEnter, onContextMenu }) => {
  
  const getIcon = () => {
    const iconProps = { size: 28, strokeWidth: 2.5 };
    
    // Helper for Directional Inputs (Arrows only, no text)
    const InputGuides = () => (
      <>
        {/* Main Input (Back) - Green Arrow */}
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-emerald-500 opacity-60 animate-pulse">
          <ChevronUp size={16} strokeWidth={3} />
        </div>
        {/* Side Inputs - Red/Orange Arrows */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-rose-500 opacity-60">
           <ChevronRight size={16} strokeWidth={3} />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-rose-500 opacity-60">
           <ChevronLeft size={16} strokeWidth={3} />
        </div>
      </>
    );

    // Helper to render the dynamic operation text overlay
    const OperationOverlay = (symbol: string) => {
      if (tile.storedItems.length === 0) {
         // Default icon when empty
         const Icon = 
            symbol === '+' ? Plus : 
            symbol === '-' ? Minus : 
            symbol === '×' ? X : Divide;
            
         const color = 
            symbol === '+' ? "text-blue-600" : 
            symbol === '-' ? "text-red-600" : 
            symbol === '×' ? "text-purple-600" : "text-orange-600";
            
         return <Icon {...iconProps} className={clsx(color, "relative z-10")} />;
      }

      // Dynamic Text Display
      let text = symbol;
      const isCommutative = symbol === '+' || symbol === '×';
      
      if (isCommutative) {
         const v1 = tile.storedItems[0]?.item.value;
         const v2 = tile.storedItems[1]?.item.value;
         if (tile.storedItems.length === 1) {
            text = `${v1} ${symbol} ?`;
         } else if (tile.storedItems.length >= 2) {
            text = `${v1} ${symbol} ${v2}`;
         }
      } else {
         // Directional Logic for - and ÷
         // Need to match logic in gameLogic.ts
         // Current Tile Direction is Output. Back Input is (Dir + 2) % 4.
         const backDir = (tile.direction + 2) % 4;
         
         const mainItem = tile.storedItems.find(slot => slot.fromDir === backDir);
         const sideItem = tile.storedItems.find(slot => slot.fromDir !== backDir);
         
         const mainVal = mainItem ? mainItem.item.value : '?';
         const sideVal = sideItem ? sideItem.item.value : '?';
         
         text = `${mainVal} ${symbol} ${sideVal}`;
      }

      // Adjust font size based on length
      const fontSize = text.length > 5 ? "text-[10px]" : text.length > 3 ? "text-xs" : "text-sm";

      return (
        <div className={clsx("relative z-10 font-black bg-white/80 px-1 rounded border border-gray-200 shadow-sm whitespace-nowrap", fontSize)}>
           {text}
        </div>
      );
    };

    switch (tile.building) {
      case BuildingType.BELT:
        // Custom visual for Belt to look like a conveyor
        return (
          <div className="relative flex flex-col items-center justify-center h-full space-y-0 opacity-40 text-gray-600">
            <ChevronsUp size={32} strokeWidth={2} />
            {/* Small directional arrow */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-blue-500">
                <ArrowUp size={16} strokeWidth={3} />
            </div>
          </div>
        );
      case BuildingType.EXTRACTOR:
        const val = tile.extractorValue || 0;
        const textSize = val > 99 ? 'text-lg' : val > 9 ? 'text-xl' : 'text-2xl';
        return <div className={`font-black ${textSize} text-amber-900`}>{val}</div>;
      case BuildingType.ADDER:
        return OperationOverlay('+');
      case BuildingType.SUBTRACTOR:
        return (
          <div className="relative w-full h-full flex items-center justify-center">
             <InputGuides />
             {OperationOverlay('-')}
          </div>
        );
      case BuildingType.MULTIPLIER:
        return OperationOverlay('×');
      case BuildingType.DIVIDER:
        return (
          <div className="relative w-full h-full flex items-center justify-center">
             <InputGuides />
             {/* Use a custom symbol for divide if needed, but text works well */}
             {OperationOverlay('÷')}
          </div>
        );
      case BuildingType.TRASH:
        return <Trash2 {...iconProps} className="text-gray-500" />;
      case BuildingType.HUB:
        return <Home size={32} strokeWidth={2} className="text-emerald-700" />;
      default:
        return null;
    }
  };

  const getRotation = () => {
    switch (tile.direction) {
      case Direction.UP: return 'rotate-0';
      case Direction.RIGHT: return 'rotate-90';
      case Direction.DOWN: return 'rotate-180';
      case Direction.LEFT: return '-rotate-90';
      default: return 'rotate-0';
    }
  };

  // Background color based on building
  const getBgColor = () => {
    switch (tile.building) {
      case BuildingType.NONE: return 'bg-white hover:bg-blue-50';
      case BuildingType.EXTRACTOR: return 'bg-amber-100 border-amber-300';
      case BuildingType.BELT: return 'bg-gray-200 border-gray-300';
      case BuildingType.HUB: return 'bg-emerald-200 border-emerald-400 ring-2 ring-emerald-500 ring-inset';
      case BuildingType.TRASH: return 'bg-slate-200 border-slate-300';
      default: return 'bg-white border-indigo-200 shadow-sm'; // Processors
    }
  };

  const isDirectional = 
    tile.building !== BuildingType.NONE && 
    tile.building !== BuildingType.HUB && 
    tile.building !== BuildingType.TRASH;

  // Dynamic text size for items floating on belt
  const getItemTextSize = (val: number) => {
    if (val > 99 || val < -99) return 'text-xs';
    if (val > 9 || val < -9) return 'text-sm';
    return 'text-lg';
  };

  // Calculate item's display position for animation
  const clampedPhase = tile.item ? Math.min(1, Math.max(0, tile.item.animationPhase)) : 1;
  const itemDisplayX = tile.item 
    ? tile.item.lastX + (tile.item.x - tile.item.lastX) * clampedPhase
    : tile.x;
  const itemDisplayY = tile.item 
    ? tile.item.lastY + (tile.item.y - tile.item.lastY) * clampedPhase
    : tile.y;

  const CELL_SIZE = 64; // Based on w-16 h-16 (16*4 = 64px)

  const transformStyle = {
    transform: `translate(${(itemDisplayX - tile.x) * CELL_SIZE}px, ${(itemDisplayY - tile.y) * CELL_SIZE}px)`,
    // Transition removed to allow direct JS control via requestAnimationFrame
  };


  return (
    <div 
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
      data-x={tile.x}
      data-y={tile.y}
      className={clsx(
        "relative w-16 h-16 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors duration-100 select-none touch-none", // Added touch-none
        getBgColor()
      )}
    >
      {/* Building Layer (Rotated) */}
      <div className={clsx("absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200", getRotation())}>
        {getIcon()}
      </div>

      {/* CLEAR Direction Indicator Overlay for Machines (Not Belts, they are the arrow) */}
      {isDirectional && tile.building !== BuildingType.BELT && (
         <div className={clsx("absolute inset-0 pointer-events-none", getRotation())}>
            {/* A prominent arrow at the 'top' (which becomes direction after rotation) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-indigo-500 opacity-80 filter drop-shadow-sm">
               <ArrowUp size={20} strokeWidth={4} fill="currentColor" />
            </div>
         </div>
      )}

      {/* Item Layer (Floating on top) */}
      {tile.item && (
        <div 
          className="absolute z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none"
          style={{ ...transformStyle, backgroundColor: tile.item.color }}
        >
          <span className={clsx("text-white font-bold leading-none shadow-black drop-shadow-md", getItemTextSize(tile.item.value))}>
            {tile.item.value}
          </span>
        </div>
      )}

      {/* Stored Items Indicator */}
      {tile.storedItems.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5 pointer-events-none z-10">
          {tile.storedItems.map((_, idx) => (
            <div key={idx} className="w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white"></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GridCell;
