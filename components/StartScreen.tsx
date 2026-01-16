
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { ActiveTab } from '../App';
import { 
  SparklesIcon, 
  ArrowRightIcon, 
  BoltIcon, 
  ZapIcon, 
  StyleExtractorIcon, 
  EraserIcon
} from './icons';

interface StartScreenProps {
  onStart: (tab?: ActiveTab) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleQuickStart = (tab: ActiveTab) => {
    setTimeout(() => onStart(tab), 200);
  };

  const handleMainLaunch = () => {
    setTimeout(() => onStart(), 200);
  };

  // Only 3 Core Modules as requested
  const modules: { id: ActiveTab; title: string; sub: string; icon: React.FC<{className?: string}>; color: string; accent: string }[] = [
    { 
      id: 'flux', 
      title: 'Flux Engine', 
      sub: 'Neural Image Synthesis & Generation', 
      icon: BoltIcon, 
      color: 'from-red-600/20 to-transparent',
      accent: 'text-red-500 border-red-500/30'
    },
    { 
      id: 'style_extractor', 
      title: 'Style DNA', 
      sub: 'Visual Property Analysis & Logic', 
      icon: StyleExtractorIcon, 
      color: 'from-purple-600/20 to-transparent',
      accent: 'text-purple-500 border-purple-500/30'
    },
    { 
      id: 'inpaint', 
      title: 'Magic Inpaint', 
      sub: 'Context-Aware Pixel Reconstruction', 
      icon: EraserIcon, 
      color: 'from-cyan-600/20 to-transparent',
      accent: 'text-cyan-500 border-cyan-500/30'
    },
  ];

  return (
    <div className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
      
      {/* Scanning Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="flex-1 w-full flex flex-col items-center p-6 sm:p-12 z-10 overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Logo Section */}
        <div className={`text-center mt-6 mb-12 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="inline-block relative transform -rotate-3">
            <h1 
              className="text-7xl sm:text-9xl font-graffiti text-white tracking-wide relative z-10"
              style={{ 
                textShadow: '4px 4px 0px #F8130D, 8px 8px 0px rgba(0,0,0,0.5)',
                filter: 'drop-shadow(0 0 15px rgba(248,19,13,0.4))'
              }}
            >
              PIXSH<span className="text-red-600">O</span>P
            </h1>
            {/* Tag splatter/drip decoration */}
            <div className="absolute -bottom-4 right-0 text-red-600 font-graffiti text-4xl opacity-80" style={{ transform: 'rotate(-10deg)' }}>
                "
            </div>
            
            <div className="absolute -top-4 -right-8 px-3 py-1 bg-red-600 text-black text-[12px] font-black italic rounded-sm skew-x-[-15deg] shadow-[0_0_15px_rgba(220,38,38,0.5)] border-2 border-white transform rotate-3">
              PRO V4.0
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-6 opacity-60">
            <div className="h-[2px] w-8 bg-gradient-to-r from-transparent to-red-600"></div>
            <p className="text-gray-300 font-mono text-[10px] tracking-[0.4em] uppercase font-bold">
              The Sakuga Visual Engine
            </p>
            <div className="h-[2px] w-8 bg-gradient-to-l from-transparent to-red-600"></div>
          </div>
        </div>

        {/* Primary Action */}
        <div className={`w-full max-w-lg transition-all duration-700 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <button
            onClick={handleMainLaunch}
            className="group w-full h-16 bg-white text-black font-black uppercase italic tracking-widest text-base flex items-center justify-center gap-4 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <SparklesIcon className="w-6 h-6" />
            <span className="relative z-10">Initialize Full Engine</span>
            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform relative z-10" />
          </button>
        </div>

        {/* Vertical Modules Stack */}
        <div className={`mt-16 w-full max-w-2xl transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="text-center mb-8 flex flex-col items-center">
            <span className="text-[10px] font-mono font-black text-gray-500 tracking-[0.6em] uppercase">Specialized Visual Labs</span>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-red-600/40 to-transparent mt-3"></div>
          </div>
          
          <div className="flex flex-col gap-4">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => handleQuickStart(m.id)}
                className={`group relative p-6 sm:p-8 rounded-xl border border-white/5 bg-[#080808] text-left transition-all hover:border-white/20 hover:bg-[#0c0c0c] overflow-hidden active:scale-[0.98] shadow-2xl`}
              >
                {/* Accent Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${m.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10 flex items-center gap-6">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg border flex items-center justify-center bg-black/40 ${m.accent} group-hover:scale-110 transition-transform duration-500`}>
                    <m.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-white text-lg sm:text-xl uppercase tracking-tighter italic font-display">
                        {m.title}
                      </h3>
                      <ZapIcon className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${m.accent.split(' ')[0]}`} />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide">
                      {m.sub}
                    </p>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                    <ArrowRightIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Secondary Entry */}
          <button
            onClick={handleMainLaunch}
            className="mt-8 w-full py-4 rounded-lg border border-dashed border-white/10 text-gray-500 text-[10px] font-mono uppercase tracking-[0.4em] hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-white" />
            Access Legacy Toolset
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-white" />
          </button>
        </div>

        {/* Immersive Footer */}
        <div className={`mt-16 pb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-40 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-6">
                <div className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Encryption: AES-256</div>
                <div className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Protocol: Neural-V4</div>
                <div className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Region: Global-Alpha</div>
             </div>
             <div className="text-[8px] text-gray-700 font-mono uppercase tracking-[1em] mt-2">Neural Canvas Infra • Tokyo HQ</div>
          </div>
        </div>
      </div>
    </div>
  );
};
