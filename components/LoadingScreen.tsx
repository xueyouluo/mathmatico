import React, { useEffect, useState } from 'react';
import { Calculator, Cog, Cpu, Sigma, Binary, Database, Activity, Percent, Plus, Minus } from 'lucide-react';

const LoadingScreen: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing Mathmatico Kernel...');

  const steps = [
    { threshold: 10, text: 'Loading Logic Modules...' },
    { threshold: 30, text: 'Calibrating Conveyor Belts...' },
    { threshold: 50, text: 'Synthesizing Number Streams...' },
    { threshold: 70, text: 'Optimizing Math Processors...' },
    { threshold: 90, text: 'Starting Factory Simulation...' },
    { threshold: 100, text: 'Ready!' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 5;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const step = steps.find(s => progress < s.threshold);
    if (step) {
      setLoadingText(step.text);
    } else if (progress >= 100) {
       setLoadingText('Ready!');
    }
  }, [progress]);

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 bg-blue-50 flex flex-col items-center justify-center z-50 overflow-hidden font-sans text-gray-800">
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

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
        
        {/* Logo / Icon */}
        <div className="mb-8 relative">
            <div className="absolute inset-0 bg-indigo-200 blur-xl opacity-50 animate-pulse rounded-full"></div>
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-2xl relative">
                <Calculator size={64} className="text-indigo-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full animate-spin">
                <Activity size={24} className="text-white" />
            </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
            MATHMATICO
        </h1>
        <div className="text-gray-500 text-xs mb-12 tracking-[0.2em] uppercase opacity-80">
            Factory Automation System
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden relative mb-4 border border-gray-300">
            <div 
                className="h-full bg-gradient-to-r from-indigo-600 via-emerald-600 to-indigo-600 transition-all duration-100 ease-out relative"
                style={{ width: `${progress}%` }}
            >
                <div className="absolute inset-0 bg-white/30 w-full h-full animate-pulse opacity-50"></div>
            </div>
        </div>

        {/* Text Status */}
        <div className="flex justify-between w-full text-xs text-gray-600 font-sans h-6">
            <span>{loadingText}</span>
            <span>{Math.min(100, Math.floor(progress))}%</span>
        </div>

      </div>
    </div>
  );
};

export default LoadingScreen;
