/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GenerationRequest } from '../App';
import { SunIcon, SlidersIcon, SaveIcon, TrashIcon } from './icons';
import { PROTOCOLS } from '../services/geminiService'; 
import { loadUserPresets, addUserPreset, deleteUserPreset } from '../services/persistence';
import { PresetSaveModal } from './PresetSaveModal';

interface AdjustmentPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  setViewerInstruction: (text: string | null) => void;
  isFastAiEnabled?: boolean; // Made optional to prevent build errors in App.tsx
}

// Define the shape of a Preset to fix TypeScript errors
interface Preset {
  name: string;
  description: string;
  prompt: string;
  isCustom: boolean;
  id: string;
}

const PRESETS = [
    { name: 'Studio', description: 'Clean lighting.', prompt: 'Professional studio lighting, soft shadows, neutral white balance, high clarity.' },
    { name: 'Golden', description: 'Warm glow.', prompt: 'Golden hour lighting, warm color temperature, soft sun flares, rich shadows.' },
    { name: 'Cyber', description: 'Teal & Magenta.', prompt: 'Cyberpunk color grading, teal and magenta split tone, crushed blacks, high contrast.' },
    { name: 'Grimy', description: 'Desaturated.', prompt: 'Desaturated colors, high structure, added film grain, green tint in shadows.' },
    { name: 'Noir', description: 'Cinematic B&W.', prompt: 'Film noir black and white photography, high contrast, dramatic shadows, venetian blind lighting.' },
    { name: 'Bleach', description: 'Bleach bypass.', prompt: 'Bleach bypass film look, high contrast, low saturation, gritty texture, silver halide.' },
    { name: 'Film', description: 'Kodak Portra.', prompt: 'Analog film photography style, Kodak Portra 400, fine grain, natural skin tones, soft highlights.' },
    { name: 'Vogue', description: 'High fashion.', prompt: 'High key fashion lighting, overexposed highlights, clean white background, sharp focus.' },
    { name: 'Vivid', description: 'High sat.', prompt: 'Boost vibrance, high saturation, clear definition, punchy contrast.' },
    { name: 'Matte', description: 'Faded blacks.', prompt: 'Lifted blacks, matte finish, low contrast, soft pastel tones.' },
    { name: 'HDR', description: 'Dynamic range.', prompt: 'High dynamic range, recovered highlights, open shadows, detailed textures.' },
    { name: 'Crisp', description: 'Sharpness.', prompt: 'Enhance edge sharpness, micro-contrast boost, de-haze, clear clarity.' }
];

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onRequest, isLoading }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('');
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [intensity, setIntensity] = useState(50); // Visual only, modifies prompt strength conceptually
  
  const loadPresets = useCallback(async () => {
    try {
        const stored = await loadUserPresets();
        setCustomPresets(stored.filter((p: any) => p.recommendedPanel === 'adjust_panel' || p.recommendedPanel === 'adjust'));
    } catch(e) {}
  }, []);

  useEffect(() => {
    loadPresets();
    window.addEventListener('stylePresetsUpdated', loadPresets);
    return () => window.removeEventListener('stylePresetsUpdated', loadPresets);
  }, [loadPresets]);

  const allPresets: Preset[] = useMemo(() => {
      const formattedCustom = customPresets.map(p => ({
          name: p.name,
          description: p.description,
          prompt: p.applyPrompt || p.genPrompt,
          isCustom: true,
          id: p.id
      }));
      
      const formattedStandard = PRESETS.map(p => ({
          ...p,
          isCustom: false,
          id: `std_${p.name}` // Assign specific ID to avoid type errors
      }));

      return [...formattedCustom, ...formattedStandard];
  }, [customPresets]);

  const selectedPreset = useMemo(() => allPresets.find(p => p.name === selectedPresetName), [selectedPresetName, allPresets]);

  const handleApply = () => {
    const parts = [];
    if (selectedPreset) parts.push(selectedPreset.prompt);
    if (userPrompt.trim()) parts.push(userPrompt.trim());
    
    if (parts.length > 0) {
      const adjustmentPrompt = `Apply lighting and color grade: ${parts.join('. ')}. Intensity level: ${intensity}%.`;
      onRequest({ 
        type: 'adjust', 
        prompt: adjustmentPrompt, 
        useOriginal: false, 
        systemInstructionOverride: PROTOCOLS.EDITOR 
      });
    }
  };

  const handleSavePreset = async (name: string, desc: string) => {
      let promptToSave = userPrompt.trim();
      if (selectedPreset && !selectedPreset.isCustom) {
          promptToSave = promptToSave ? `${selectedPreset.prompt}. ${promptToSave}` : selectedPreset.prompt;
      }
      const newPreset = {
          id: `adjust_${Date.now()}`,
          name, description: desc,
          applyPrompt: promptToSave,
          recommendedPanel: 'adjust_panel',
          timestamp: Date.now()
      };
      await addUserPreset(newPreset);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm('Delete this preset?')) await deleteUserPreset(id);
  };

  // Dynamic animation values
  const pulseDuration = useMemo(() => {
      // Slower (4s) at 0 intensity, Faster (0.5s) at 100 intensity
      return `${Math.max(0.5, 4 - (intensity / 25))}s`;
  }, [intensity]);

  const bgOpacity = useMemo(() => {
      return 0.15 + (intensity / 200); // 0.15 to 0.65 (Brighter base)
  }, [intensity]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <PresetSaveModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSavePreset} />
      
      {/* Animated Background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 animate-pulse-glow" 
        style={{ 
            background: `radial-gradient(circle at 50% -20%, rgba(255, 214, 0, ${bgOpacity}) 0%, transparent 70%)`,
            animationDuration: pulseDuration
        }} 
      />

      <div className="p-5 border-b border-zinc-800 bg-surface-panel/90 shrink-0 relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-sm bg-adjust/20 border border-adjust/50 flex items-center justify-center shadow-[0_0_20px_rgba(255,214,0,0.4)]">
                 <SunIcon className="w-5 h-5 text-adjust" />
             </div>
             <div>
                 <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">Neural Light</h3>
                 <p className="text-[8px] text-adjust font-mono tracking-[0.2em] uppercase font-bold drop-shadow-[0_0_5px_rgba(255,214,0,0.5)]">Luminance.Engine</p>
             </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative z-10">
          <div>
              <h4 className="panel-label border-adjust/50 pl-2">Calibration</h4>
              <div className="group border border-zinc-800 bg-black/40 rounded-sm overflow-hidden focus-within:border-adjust/60 focus-within:shadow-[0_0_15px_rgba(255,214,0,0.15)] transition-all relative shadow-inner">
                  <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-adjust rounded-full animate-pulse shadow-[0_0_5px_rgba(255,214,0,0.8)]" />
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black group-focus-within:text-adjust transition-colors">GRADE_PAYLOAD</span>
                      </div>
                      <button onClick={() => setIsSaveModalOpen(true)} disabled={!userPrompt.trim()} className="text-zinc-600 hover:text-adjust disabled:opacity-20 transition-colors" title="Save">
                          <SaveIcon className="w-3.5 h-3.5" />
                      </button>
                  </div>
                  <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Specify tone curve, exposure, or color shift..."
                      className="w-full bg-transparent p-4 text-xs font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none h-20 leading-relaxed selection:bg-adjust/30"
                  />
                  <div className="absolute bottom-0 right-0 p-1 opacity-20 pointer-events-none group-focus-within:opacity-100 transition-opacity duration-300">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 10L0 10L10 0V10Z" fill="var(--color-adjust)" />
                        </svg>
                  </div>
              </div>
          </div>

          <div className="accent-adjust">
                <div className="flex justify-between mb-2 items-center">
                    <h4 className="panel-label m-0 border-adjust/50 pl-2">Grade Intensity</h4>
                    <span className="text-[8px] font-mono text-adjust font-black drop-shadow-[0_0_5px_rgba(255,214,0,0.5)]">{intensity}%</span>
                </div>
                <input 
                    type="range" 
                    min="10" max="100" 
                    value={intensity} 
                    onChange={(e) => setIntensity(Number(e.target.value))} 
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-adjust [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,214,0,0.8)]"
                />
          </div>

          <div>
            <h4 className="panel-label border-adjust/50 pl-2">DNA Presets</h4>
            <div className="grid grid-cols-2 gap-2 pb-4">
                {allPresets.map(preset => (
                    <button
                        key={preset.id} // Changed from name to id to be safer
                        onClick={() => setSelectedPresetName(preset.name === selectedPresetName ? '' : preset.name)}
                        className={`preset-card min-h-[4rem] flex flex-col justify-between ${
                            selectedPresetName === preset.name 
                            ? 'bg-adjust/20 text-white border-adjust shadow-[0_0_15px_rgba(255,214,0,0.25)] z-10' 
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                        <div className={`text-[9px] font-black uppercase tracking-wider transition-colors ${selectedPresetName === preset.name ? 'text-white' : 'text-zinc-400'}`}>{preset.name}</div>
                        <p className={`text-[8px] leading-tight font-mono uppercase tracking-tight truncate ${selectedPresetName === preset.name ? 'text-adjust' : 'text-zinc-700'}`}>{preset.description}</p>
                        
                        {(preset.isCustom) && (
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div onClick={(e) => handleDelete(e, preset.id)} className="p-1 text-zinc-500 hover:text-red-500 bg-black/80 rounded"><TrashIcon className="w-3 h-3" /></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
          </div>
      </div>

      <div className="p-5 border-t border-zinc-800 bg-surface-panel/90 shrink-0 relative z-10 backdrop-blur-md">
          <button onClick={handleApply} disabled={isLoading || (!selectedPreset && !userPrompt.trim())} className="execute-btn group border-zinc-800 hover:border-adjust transition-colors">
              <div className="execute-btn-glow" style={{ background: 'radial-gradient(circle, #FFD600 0%, transparent 70%)' }}></div>
              <div className="relative z-10 flex items-center justify-center gap-3 h-full">
                  <span className={`font-black italic uppercase tracking-[0.2em] text-xs transition-colors skew-x-[-10deg] ${isLoading ? 'text-zinc-500' : 'text-zinc-500 group-hover:text-adjust'}`}>
                      {isLoading ? 'Calibrating...' : 'Execute Grade'}
                  </span>
                  <SlidersIcon className={`w-4 h-4 transition-colors ${isLoading ? 'text-zinc-500' : 'text-zinc-500 group-hover:text-adjust'}`} />
              </div>
          </button>
      </div>
    </div>
  );
};
