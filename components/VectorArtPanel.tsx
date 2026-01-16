/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GenerationRequest } from '../App';
import { VectorIcon, SparklesIcon, SaveIcon, TrashIcon } from './icons';
import { describeImageForPrompt, PROTOCOLS, refineImagePrompt } from '../services/geminiService';
import { loadUserPresets, addUserPreset, deleteUserPreset } from '../services/persistence';
import { PresetSaveModal } from './PresetSaveModal';

interface VectorPreset {
  name: string;
  description: string;
  applyPrompt: string;
  genPrompt: string;
  id?: string;
  isCustom?: boolean;
}

interface VectorArtPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  hasImage: boolean;
  currentImageFile?: File | null;
  setViewerInstruction: (text: string | null) => void;
  initialPrompt?: string;
  isFastAiEnabled?: boolean; // Changed to optional (?) to fix the build error
}

const basePresetGroups: Record<string, VectorPreset[]> = {
  "IDENTITY": [
    { name: 'Monogram', description: 'Intertwined letters.', applyPrompt: 'Vector monogram logo, intertwined letters.', genPrompt: 'Minimalist vector monogram logo, white background.' },
    { name: 'Emblem', description: 'Crest style.', applyPrompt: 'Vector crest emblem, shield shape.', genPrompt: 'Vector emblem logo, shield crest, thick lines.' },
    { name: 'Badge', description: 'Circular badge.', applyPrompt: 'Vector badge style, circular text.', genPrompt: 'Vector badge logo, circular layout, vintage style.' },
    { name: 'Mascot', description: 'Esports character.', applyPrompt: 'Esports mascot vector logo.', genPrompt: 'Aggressive esports mascot vector, bold outlines, flat colors.' }
  ],
  "STREET": [
    { name: 'Stencil', description: 'Spray cutout.', applyPrompt: 'Stencil vector art style, spray paint texture.', genPrompt: 'Street art stencil vector, sharp edges, black and white.' },
    { name: 'Sticker', description: 'Die-cut vinyl.', applyPrompt: 'Die-cut sticker vector, white border.', genPrompt: 'Vector sticker design, white die-cut border, thick outlines.' },
    { name: 'Tag', description: 'Handstyle.', applyPrompt: 'Graffiti tag vector style.', genPrompt: 'Graffiti handstyle tag, dripping ink, vector.' }
  ],
  "ILLUSTRATION": [
    { name: 'Pop Art', description: 'Bold halftone.', applyPrompt: 'Pop art vector style, halftone dots.', genPrompt: 'Pop art vector illustration, bold colors, halftone pattern.' },
    { name: 'Woodcut', description: 'Engraved lines.', applyPrompt: 'Woodcut vector style, hatching lines.', genPrompt: 'Woodcut vector illustration, engraving style, black and white.' },
    { name: 'Low Poly', description: 'Geometric mesh.', applyPrompt: 'Low poly vector style, geometric.', genPrompt: 'Low poly vector illustration, geometric triangles, gradient fills.' }
  ],
  "MINIMAL": [
    { name: 'Line Art', description: 'Single monoline.', applyPrompt: 'Continuous line art vector.', genPrompt: 'Minimalist continuous line drawing, black on white.' },
    { name: 'Flat', description: 'Solid shapes.', applyPrompt: 'Flat design vector icon.', genPrompt: 'Flat vector illustration, geometric shapes, no gradients.' },
    { name: 'Blueprint', description: 'Schematic.', applyPrompt: 'Technical blueprint vector.', genPrompt: 'Technical blueprint, cyan lines, grid background.' }
  ]
};

export const VectorArtPanel: React.FC<VectorArtPanelProps> = ({ onRequest, isLoading, hasImage, currentImageFile, setViewerInstruction, initialPrompt, isFastAiEnabled }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Stencil');
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const loadPresets = useCallback(async () => {
    try {
        const stored = await loadUserPresets();
        setCustomPresets(stored.filter((p: any) => p.recommendedPanel === 'vector_art_panel'));
    } catch(e) {}
  }, []);

  useEffect(() => {
    loadPresets();
    window.addEventListener('stylePresetsUpdated', loadPresets);
    return () => window.removeEventListener('stylePresetsUpdated', loadPresets);
  }, [loadPresets]);

  useEffect(() => {
    if (initialPrompt) { setUserPrompt(initialPrompt); setSelectedPresetName(''); }
  }, [initialPrompt]);

  const presetGroups = useMemo(() => {
    if (customPresets.length === 0) return basePresetGroups;
    return { "USER DNA": customPresets, ...basePresetGroups };
  }, [customPresets]);

  const allPresets = useMemo(() => Object.values(presetGroups).flat() as VectorPreset[], [presetGroups]);
  const selectedPreset = useMemo(() => allPresets.find(p => p.name === selectedPresetName), [selectedPresetName, allPresets]);

  const handleApply = async () => {
    setIsAnalyzing(true);
    setLocalError(null);
    try {
        let effectiveSubject = userPrompt.trim();
        if (!effectiveSubject && hasImage && currentImageFile) {
            setViewerInstruction("ANALYZING SOURCE...");
            effectiveSubject = await describeImageForPrompt(currentImageFile).catch(() => "primary subject");
            setViewerInstruction(null);
        } else if (!effectiveSubject) effectiveSubject = "primary subject";

        let fullPrompt = "";
        let sysOverride = PROTOCOLS.DESIGNER;

        if (selectedPreset) {
            if (hasImage) {
                 fullPrompt = `${selectedPreset.applyPrompt} Subject: ${effectiveSubject}. Pure vector style.`;
                 sysOverride = PROTOCOLS.IMAGE_TRANSFORMER;
            } else {
                 fullPrompt = `${selectedPreset.genPrompt || selectedPreset.applyPrompt}, ${effectiveSubject}`;
            }
        } else {
             fullPrompt = `${effectiveSubject}. Vector art, flat colors, clean lines.`;
             sysOverride = hasImage ? PROTOCOLS.IMAGE_TRANSFORMER : PROTOCOLS.DESIGNER;
        }

        onRequest({ type: 'vector', prompt: fullPrompt, forceNew: !hasImage, aspectRatio: '1:1', systemInstructionOverride: sysOverride });
    } catch (e: any) { setLocalError(e.message || "Malfunction."); } 
    finally { setIsAnalyzing(false); }
  };
  
  const handleRefine = async () => {
    if (!userPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try { setUserPrompt(await refineImagePrompt(userPrompt, isFastAiEnabled)); } catch (e) {} 
    finally { setIsRefining(false); }
  };

  const handleSavePreset = async (name: string, desc: string) => {
      let promptToSave = userPrompt.trim();
      const newPreset = {
          id: `vector_${Date.now()}`,
          name, description: desc,
          applyPrompt: promptToSave, 
          genPrompt: promptToSave,
          recommendedPanel: 'vector_art_panel',
          timestamp: Date.now(),
          isCustom: true
      };
      await addUserPreset(newPreset);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm('Delete this preset?')) await deleteUserPreset(id);
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <PresetSaveModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSavePreset} />
      <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% -20%, rgba(0, 255, 157, 0.15) 0%, transparent 70%)' }} />

      <div className="p-5 border-b border-zinc-800 bg-surface-panel/90 shrink-0 relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-sm bg-vector/20 border border-vector/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,157,0.4)]">
                 <VectorIcon className="w-5 h-5 text-vector" />
             </div>
             <div>
                 <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">Vector Foundry</h3>
                 <p className="text-[8px] text-vector font-mono tracking-[0.2em] uppercase font-bold drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]">SVG.Synthesizer</p>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative z-10">
          {localError && (
            <div className="bg-red-950/20 border-l-2 border-red-500 p-3 shrink-0">
                <p className="text-[9px] text-red-500 font-mono uppercase font-black mb-1">Fault</p>
                <p className="text-[9px] text-red-200 leading-tight font-mono">{localError}</p>
            </div>
          )}

          <div>
              <h4 className="panel-label border-vector/50 pl-2">Path Directive</h4>
              <div className="group border border-zinc-800 bg-black/40 rounded-sm overflow-hidden focus-within:border-vector/60 focus-within:shadow-[0_0_15px_rgba(0,255,157,0.15)] transition-all relative shadow-inner">
                  <div className="flex justify-between items-center bg-zinc-900/50 px-3 py-2 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-vector rounded-full animate-pulse shadow-[0_0_5px_rgba(0,255,157,0.8)]" />
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black group-focus-within:text-vector transition-colors">PATH_PAYLOAD</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setIsSaveModalOpen(true)} disabled={!userPrompt.trim()} className="text-zinc-600 hover:text-vector disabled:opacity-20 transition-colors">
                            <SaveIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleRefine} disabled={!userPrompt.trim() || isRefining} className="text-zinc-600 hover:text-vector transition-colors">
                            <SparklesIcon className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                  </div>
                  <textarea 
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder={hasImage ? "// Analyze source..." : "// Describe icon..."}
                      className="w-full bg-transparent p-4 text-xs font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none h-20 leading-relaxed selection:bg-vector/30"
                  />
                  <div className="absolute bottom-0 right-0 p-1 opacity-20 pointer-events-none group-focus-within:opacity-100 transition-opacity duration-300">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 10L0 10L10 0V10Z" fill="var(--color-vector)" />
                        </svg>
                  </div>
              </div>
          </div>

          <div className="space-y-6 pb-4">
            {Object.entries(presetGroups).map(([groupName, presets]) => (
                <div key={groupName}>
                    <h4 className={`panel-label border-vector/50 pl-2 ${groupName === 'USER DNA' ? 'text-vector' : ''}`}>{groupName}</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(presets as any[]).map(preset => (
                            <button 
                                key={preset.name} onClick={() => setSelectedPresetName(preset.name === selectedPresetName ? '' : preset.name)}
                                className={`preset-card min-h-[4rem] flex flex-col justify-between ${
                                    selectedPresetName === preset.name 
                                    ? 'bg-vector/20 text-white border-vector shadow-[0_0_15px_rgba(0,255,157,0.25)] z-10' 
                                    : 'text-zinc-600 hover:text-zinc-400'
                                }`}
                            >
                                <div className={`text-[9px] font-black uppercase tracking-wider transition-colors ${selectedPresetName === preset.name ? 'text-white' : 'text-zinc-400'}`}>{preset.name}</div>
                                <p className={`text-[8px] leading-tight font-mono uppercase tracking-tight truncate ${selectedPresetName === preset.name ? 'text-vector' : 'text-zinc-700'}`}>{preset.description}</p>
                                
                                {(preset.id || preset.isCustom) && (
                                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <div onClick={(e) => handleDelete(e, preset.id)} className="p-1 text-zinc-500 hover:text-red-500 bg-black/80 rounded"><TrashIcon className="w-3 h-3" /></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
      </div>

      <div className="p-5 border-t border-zinc-800 bg-surface-panel/90 shrink-0 relative z-10 backdrop-blur-md">
          <button onClick={handleApply} disabled={isLoading || isAnalyzing || (!selectedPresetName && !userPrompt.trim() && !hasImage)} className="execute-btn group border-zinc-800 hover:border-vector transition-colors">
              <div className="execute-btn-glow" style={{ background: 'radial-gradient(circle, #00FF9D 0%, transparent 70%)' }}></div>
              <div className="relative z-10 flex items-center justify-center gap-3 h-full">
                  <span className={`font-black italic uppercase tracking-[0.2em] text-xs transition-colors skew-x-[-10deg] ${isLoading || isAnalyzing ? 'text-zinc-500' : 'text-zinc-500 group-hover:text-vector'}`}>
                      {isAnalyzing ? 'Pathing...' : (isLoading ? 'Processing...' : 'Forge Vector')}
                  </span>
                  <VectorIcon className={`w-4 h-4 transition-colors ${isLoading || isAnalyzing ? 'text-zinc-500' : 'text-zinc-500 group-hover:text-vector'}`} />
              </div>
          </button>
      </div>
    </div>
  );
};
            
