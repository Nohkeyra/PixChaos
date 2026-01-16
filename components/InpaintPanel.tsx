/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EraserIcon, SparklesIcon, XIcon, TrashIcon } from './icons';

interface InpaintPanelProps {
  onApplyInpaint: (instruction: string) => void;
  onClearMask: () => void;
  isLoading: boolean;
  brushSize: number;
  setBrushSize: (size: number) => void;
  hasImage: boolean;
}

export const InpaintPanel: React.FC<InpaintPanelProps> = ({ 
    onApplyInpaint, 
    onClearMask, 
    isLoading, 
    brushSize, 
    setBrushSize,
    hasImage
}) => {
  const [instruction, setInstruction] = useState('');
  
  const handleApply = () => {
    if (instruction.trim()) {
        onApplyInpaint(instruction.trim());
    }
  };

  const isActionDisabled = isLoading || !instruction.trim() || !hasImage;

  return (
    <div className="flex flex-col h-full bg-surface-panel">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-surface-panel relative z-10 shrink-0">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-900 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                     <EraserIcon className="w-5 h-5 text-white" />
                 </div>
                 <div>
                     <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                       Magic Inpaint
                     </h3>
                     <p className="text-[10px] text-cyan-500 font-mono tracking-widest uppercase">
                       Smart Edit & Fill
                     </p>
                 </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {!hasImage ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                    <EraserIcon className="w-12 h-12 text-gray-700 mb-4 opacity-50" />
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
                        Upload image to start editing.
                    </p>
                </div>
            ) : (
                <>
                    {/* Brush Controls - Note: Disabled/Hidden in this version as masking canvas is pending, relying on auto-edit */}
                    <div className="bg-surface-card border border-surface-border rounded-lg p-3 opacity-50 pointer-events-none grayscale">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Masking Brush</label>
                            <span className="text-[10px] text-cyan-500 font-mono">Auto</span>
                        </div>
                        <div className="w-full h-1 bg-surface-border rounded-lg"></div>
                        <p className="text-[8px] text-gray-600 mt-2 font-mono">MANUAL MASKING DISABLED. MODE: WHOLE IMAGE CONTEXT.</p>
                    </div>

                    {/* Prompt Input */}
                    <div className="bg-surface-card border border-surface-border rounded-lg p-3 group focus-within:border-cyan-500/50 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Edit Instruction</label>
                            {instruction && <button onClick={() => setInstruction('')}><XIcon className="w-3 h-3 text-gray-600 hover:text-white" /></button>}
                        </div>
                        <textarea 
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Describe what to change or remove (e.g., 'remove the background', 'change blue shirt to red')..."
                            className="w-full bg-transparent text-gray-300 text-xs font-mono focus:outline-none resize-none h-32 placeholder-gray-700 leading-relaxed"
                            disabled={isLoading}
                        />
                    </div>
                </>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-hover bg-surface-panel shrink-0">
            <button
                onClick={handleApply}
                disabled={isActionDisabled}
                className="w-full h-12 relative overflow-hidden group rounded-sm bg-surface-elevated border border-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {!isActionDisabled && <div className="absolute inset-0 bg-cyan-900/20"></div>}
                
                <div className="relative z-10 flex items-center justify-center gap-2 h-full">
                    <span className={`font-black italic uppercase tracking-widest text-sm skew-x-[-10deg] ${isActionDisabled ? 'text-gray-500' : 'text-cyan-400 group-hover:text-white'}`}>
                        {isLoading ? 'Processing...' : 'Execute Smart Edit'}
                    </span>
                    {!isActionDisabled && <SparklesIcon className="w-4 h-4 text-cyan-400 group-hover:text-white skew-x-[-10deg]" />}
                </div>
            </button>
        </div>
    </div>
  );
};