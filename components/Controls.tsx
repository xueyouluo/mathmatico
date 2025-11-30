import React from 'react';
import { BuildingType, Difficulty, GameSpeed } from '../types';
import { ArrowUp, Plus, Minus, X, Divide, Eraser, ChevronsUp, Zap, FastForward } from 'lucide-react';
import clsx from 'clsx';
import { Language, translations } from '../utils/i18n';

interface ControlsProps {
  selectedBuilding: BuildingType;
  onSelect: (b: BuildingType) => void;
  selectedNumber: number;
  onSelectNumber: (n: number) => void;
  difficulty: Difficulty;
  speed: GameSpeed;
  onToggleSpeed: () => void;
  lang: Language;
}

const Controls: React.FC<ControlsProps> = ({ selectedBuilding, onSelect, selectedNumber, onSelectNumber, difficulty, speed, onToggleSpeed, lang }) => {
  
  const t = translations[lang];

  // Removed EXTRACTOR from available buttons
  let buttons = [
    { type: BuildingType.NONE, icon: <Eraser size={20} />, label: t.eraser, color: 'bg-red-50 text-red-600 border-red-200' },
    { type: BuildingType.BELT, icon: <ChevronsUp size={20} />, label: t.belt, color: 'bg-gray-100 text-gray-700' },
    { type: BuildingType.ADDER, icon: <Plus size={20} />, label: t.adder, color: 'bg-blue-100 text-blue-700' },
    { type: BuildingType.SUBTRACTOR, icon: <Minus size={20} />, label: t.subtractor, color: 'bg-red-100 text-red-700' },
    { type: BuildingType.MULTIPLIER, icon: <X size={20} />, label: t.multiplier, color: 'bg-purple-100 text-purple-700' },
    { type: BuildingType.DIVIDER, icon: <Divide size={20} />, label: t.divider, color: 'bg-orange-100 text-orange-700' },
  ];

  if (difficulty === 'EASY') {
    buttons = buttons.filter(b => b.type !== BuildingType.MULTIPLIER && b.type !== BuildingType.DIVIDER);
  }

  return (
    <div className="flex flex-col gap-2 md:gap-4 p-2 md:p-4 bg-white/90 backdrop-blur-md rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-2 md:mt-4 z-20 border border-white/20">
      
      <div className="flex overflow-x-auto py-3 px-2 gap-2 md:justify-center scrollbar-hide snap-x">
        {buttons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => onSelect(btn.type)}
            className={clsx(
              "flex flex-col items-center justify-center min-w-[3.5rem] w-14 h-14 md:w-16 md:h-16 rounded-xl transition-all border-2 snap-center",
              btn.color,
              selectedBuilding === btn.type 
                ? "border-indigo-500 bg-white scale-105 md:scale-110 shadow-lg z-10 ring-2 ring-indigo-300 ring-offset-2" 
                : "border-transparent hover:scale-105 opacity-90 hover:opacity-100"
            )}
            title={btn.label}
          >
            {btn.icon}
            <span className="text-[10px] font-bold mt-0.5 md:mt-1">{btn.label}</span>
          </button>
        ))}
        
        <div className="w-px bg-gray-300 mx-1 h-10 md:h-12 self-center shrink-0"></div>

        <button
            onClick={onToggleSpeed}
            className={clsx(
              "flex flex-col items-center justify-center min-w-[3.5rem] w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 transition-all snap-center shrink-0",
              speed === 'INSANE' ? "bg-purple-100 text-purple-600 border-purple-200" : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"
            )}
            title={t.speed}
        >
            {speed === 'NORMAL' && <span className="text-lg font-black font-mono">1x</span>}
            {speed === 'FAST' && <FastForward size={24} fill="currentColor" className="opacity-80" />}
            {speed === 'INSANE' && <Zap size={24} fill="currentColor" />}
            <span className="text-[10px] font-bold mt-0.5 md:mt-1">{t.speed}</span>
        </button>
      </div>
      
      <div className="text-center text-[10px] md:text-xs text-gray-500 font-medium hidden md:block">
         {t.controls_hint}{difficulty === 'EASY' && t.easy_mode_hidden}
      </div>
    </div>
  );
};

export default Controls;