
/**
 * @license
 * SPDX-License-Identifier: Apache-200
*/

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GenerationRequest } from '../App';
import { PaletteIcon, SparklesIcon, XIcon, AlertIcon } from './icons';
import { refineImagePrompt, describeImageForPrompt, PROTOCOLS } from '../services/geminiService';
import { loadUserPresets } from '../services/persistence';

interface FilterPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  setViewerInstruction: (text: string | null) => void;
  isFastAiEnabled: boolean;
  hasImage: boolean;
  currentImageFile?: File | null;
  initialPrompt?: string; 
}

const basePresetGroups = {
  "2026 VISIONARY": [
    { name: 'Quantum Chromatism', description: 'Iridescent quantum interference patterns, shifting colors, metallic sheen.' },
    { name: 'Void Gaze', description: 'Deep void black levels, crushed shadows, singular stark white highlight.' },
    { name: 'Holo-Glitch Prime', description: 'Next-gen holographic glitch, structured data-moshing, clean signal noise.' },
    { name: 'Ethereal Soft-Focus', description: 'Dreamy bloom, soft edges, heavenly lighting, prism refraction.' }
  ],
  "BIOMECHANICAL & SURREAL": [
    { name: 'Gigeresque Symbiote', description: 'Fuse flesh with obsidian and machinery.' },
    { name: 'Mycelial Network Corruption', description: 'Glow with fungal networks and spores.' },
    { name: 'Deconstructed Glass Anatomy', description: 'Fragmented translucent colored glass diagram.' },
  ],
  "TEMPORAL GLITCH & ANOMALY": [
    { name: 'VHS Data-Bleed Anomaly', description: 'Analog noise, chroma noise, and glitched hex code.' },
    { name: 'Baroque-Punk Overload', description: 'Gold filigree meets cybernetic implants.' },
  ],
  "ESOTERIC & ARCANE": [
    { name: 'Arcane Sigil Overload', description: 'Glowing occult geometries and raw energy.' },
    { name: 'Neo-Tarot Card Inlay', description: 'Holographic tarot card with foil accents.' },
  ],
  "CINEMATIC & MOODY": [
    { name: 'HDR Cinematic', description: 'Extreme dynamic range and cinematic grading.' },
    { name: 'Moody Grain Authentique', description: '35mm film grain and raw desaturated tones.' },
    { name: 'Cyberpunk Noir', description: 'Rain-slicked streets and neon reflections.' },
    { name: 'Candid Raw Lifestyle', description: 'Natural unposed look with authentic skin texture.' },
    { name: 'Editorial Luxury', description: 'Sophisticated fashion magazine look.' },
  ],
  "ARTISTIC TRANSFORMATION": [
    { name: 'Digital Painting', description: 'Expressive concept art brushwork.' },
    { name: 'Van Gogh Oil Painting', description: 'Thick swirling impasto and vibrant colors.' },
    { name: 'Blythe Doll Dream', description: 'Porcelain skin and oversized glossy eyes.' },
    { name: 'Chibi Anime Burst', description: 'Compact body and big sparkling eyes.' },
    { name: 'Ghibli-esque Anime', description: 'Hand-painted watercolor and nostalgic vibe.' },
    { name: 'Neo-Pop Illustration', description: 'Ribbon-like color blocks and bold contrast.' },
  ],
  "SCI-FI & SURREAL": [
    { name: 'Neon Futuristic Glow', description: 'Cyan/magenta palette and futuristic elements.' },
    { name: 'Retrofuturism', description: '80s Synthwave sunset and neon grids.' },
    { name: 'Synthwave Pop Art', description: 'Halftone dots and bold neon printed look.' },
    { name: 'Holographic Shift', description: 'Rainbow metallic sheen and scan lines.' },
    { name: 'Glitchy Glam 2026', description: 'Iridescent sheens and stylish digital artifacts.' },
    { name: 'Solarized Infrared', description: 'Inverted tones and aerochrome foliage.' },
    { name: 'Fantasy AR Glow', description: 'Floating particles and ethereal magic beams.' },
  ],
  "ANALOG & VINTAGE": [
    { name: 'Retro Film Revival', description: 'Warm cast, soft focus, and light leaks.' },
    { name: 'Chromatic Edge Max', description: 'Extreme RGB splitting and lens aberration.' },
  ],
};

export const FilterPanel: React.FC<FilterPanelProps> = ({ onRequest, isLoading, setViewerInstruction, isFastAiEnabled, hasImage, currentImageFile, initialPrompt }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('HDR Cinematic');
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<any[]>([]);

  // Load custom presets with real-time update listener from IndexedDB
  const loadPresets = useCallback(async () => {
    try {
        const stored = await loadUserPresets();
        const relevant = stored.filter((p: any) => p.recommendedPanel === 'filter_panel');
        setCustomPresets(relevant);
    } catch(e) {
        console.error("FilterPanel preset load error", e);
    }
  }, []);

  useEffect(() => {
    loadPresets();
    window.addEventListener('stylePresetsUpdated', loadPresets);
    return () => window.removeEventListener('stylePresetsUpdated', loadPresets);
  }, [loadPresets]);

  useEffect(() => {
    if (initialPrompt) {
        setUserPrompt(initialPrompt);
        setSelectedPresetName(''); 
    }
  }, [initialPrompt]);

  const presetGroups = useMemo(() => {
    if (customPresets.length === 0) return basePresetGroups;
    return {
        "MY SAVED DNA": customPresets,
        ...basePresetGroups
    };
  }, [customPresets]);

  const allPresets = useMemo(() => Object.values(presetGroups).flat(), [presetGroups]);

  const selectedPreset = useMemo(() => allPresets.find(p => p.name === selectedPresetName), [selectedPresetName, allPresets]);

  const handleApply = async () => {
    setIsAnalyzing(true);
    setLocalError(null);
    let effectiveSubject = userPrompt.trim();

    try {
        if (!effectiveSubject && currentImageFile) {
            try {
                effectiveSubject = await describeImageForPrompt(currentImageFile);
            } catch (err) {
                console.warn('Vision analysis failed:', err);
                effectiveSubject = "the primary subject";
            }
        } else if (!effectiveSubject) {
            effectiveSubject = "the primary subject";
        }

        const fullPrompt = selectedPresetName 
            ? `${effectiveSubject} + ${selectedPresetName}`
            : effectiveSubject;

        onRequest({ 
            type: 'filters', 
            prompt: fullPrompt, 
            useOriginal: false, 
            systemInstructionOverride: PROTOCOLS.IMAGE_TRANSFORMER 
        });
    } catch (e: any) {
        setLocalError(e.message || "Synthesis engine malfunction.");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleRefine = async () => {
    if (!userPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refineImagePrompt(userPrompt, isFastAiEnabled);
      setUserPrompt(refined);
    } catch (e) { console.error(e); } 
    finally { setIsRefining(false); }
  };

  const isActionDisabled = isLoading || isAnalyzing || (!selectedPresetName && !userPrompt.trim());

  return (
    <div className="flex flex-col h-full bg-surface-panel">
      
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-surface-panel relative z-10 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-600 to-blue-900 flex items-center justify-center shadow-[0_0_10px_rgba(8,145,178,0.4)]">
                 <PaletteIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                 <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                   Visual Filters
                 </h3>
                 <p className="text-[9px] text-cyan-500 font-mono tracking-widest uppercase">
                   Preset Execution Engine
                 </p>
             </div>
        </div>
      </div>

      {localError && (
        <div className="mx-4 mt-4 bg-red-950/40 border border-red-500/50 p-3 rounded flex items-start gap-3 animate-fade-in relative z-20 shrink-0">
            <AlertIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Execution Fail</p>
                <p className="text-xs text-red-200 leading-tight font-mono">{localError}</p>
            </div>
            <button onClick={() => setLocalError(null)} className="text-gray-500 hover:text-white transition-colors">
                <XIcon className="w-3 h-3" />
            </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Custom Prompt Input */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-3 group focus-within:border-cyan-500/50 transition-colors">
              <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Subject Overwrite</label>
                  <div className="flex gap-2">
                    {userPrompt && <button onClick={() => setUserPrompt('')}><XIcon className="w-3 h-3 text-gray-600 hover:text-white" /></button>}
                    <button onClick={handleRefine} disabled={!userPrompt.trim() || isRefining} className="text-cyan-500 disabled:opacity-30">
                        <SparklesIcon className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
              </div>
              <textarea 
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={hasImage ? "Auto-detecting subject..." : "Describe target subject..."}
                  className="w-full bg-transparent text-gray-300 text-xs font-mono focus:outline-none resize-none h-12 placeholder-gray-800 tracking-wider leading-relaxed"
                  disabled={isLoading || isAnalyzing}
              />
          </div>

          {/* Presets Grid */}
          <div className="space-y-6 pb-2">
            {Object.entries(presetGroups).map(([groupName, presets]) => (
                <div key={groupName}>
                    <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 px-1 sticky top-0 bg-surface-panel z-10 py-1">{groupName}</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(presets as any[]).map(preset => (
                            <button 
                                key={preset.name} 
                                onClick={() => setSelectedPresetName(preset.name)}
                                className={`relative p-3 text-left border rounded-sm transition-all duration-200 group overflow-hidden ${selectedPresetName === preset.name ? 'bg-cyan-950/30 border-cyan-500' : 'bg-surface-elevated border-surface-border hover:border-gray-600'}`}
                                disabled={isLoading || isAnalyzing}
                            >
                                <div className="relative z-10">
                                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${selectedPresetName === preset.name ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{preset.name}</div>
                                    <p className="text-[8px] text-gray-600 leading-tight uppercase font-mono tracking-tighter">{preset.description}</p>
                                </div>
                                {selectedPresetName === preset.name && <div className="absolute top-1 right-1 w-1 h-1 bg-cyan-500 rounded-full shadow-[0_0_5px_#06b6d4]"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
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
                      {isAnalyzing ? 'Analyzing Subject...' : 'Execute Preset'}
                  </span>
                  {!isActionDisabled && <PaletteIcon className="w-4 h-4 text-cyan-400 group-hover:text-white skew-x-[-10deg]" />}
              </div>
          </button>
      </div>
    </div>
  );
};
