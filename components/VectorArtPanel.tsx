/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GenerationRequest } from '../App';
import { VectorIcon, XIcon, CheckIcon, AlertIcon, SparklesIcon } from './icons';
import { describeImageForPrompt, PROTOCOLS, refineImagePrompt } from '../services/geminiService';
import { loadUserPresets } from '../services/persistence';

interface VectorPreset {
  name: string;
  description: string;
  applyPrompt: string;
  genPrompt: string;
  negative_prompt?: string;
}

interface VectorArtPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  hasImage: boolean;
  currentImageFile?: File | null;
  setViewerInstruction: (text: string | null) => void;
  initialPrompt?: string;
}

const basePresetGroups: Record<string, VectorPreset[]> = {
  "VECTOR 2026 TRENDS": [
    {
        name: 'Glassmorphism Icon',
        description: 'Frosted glass layers, soft blur.',
        applyPrompt: 'Transform into glassmorphism vector art.',
        genPrompt: 'Glassmorphism vector icon, frosted glass layers, soft background blur, translucent shapes, pastel colors, modern UI aesthetic, white background'
    },
    {
        name: 'Acid Graphic',
        description: 'Distorted grids, chrome, rave style.',
        applyPrompt: 'Transform into acid graphic vector art.',
        genPrompt: 'Acid graphic vector art, distorted grids, chrome typography elements, rave poster aesthetic, high contrast black and neon green, y2k revival'
    },
    {
        name: 'Fluid Mesh Gradient',
        description: 'Abstract flowing color blends.',
        applyPrompt: 'Transform into fluid mesh gradient vector.',
        genPrompt: 'Fluid mesh gradient vector, abstract organic shapes, smooth color transitions, vibrant auroral colors, modern tech wallpaper style'
    },
    {
        name: 'Ultra-Flat Cyber',
        description: 'Pure neon colors, zero gradients.',
        applyPrompt: 'Transform into ultra-flat cybernetic vector.',
        genPrompt: 'Ultra-flat cybernetic vector art, high contrast icons, pure neon colors on black, zero gradients, absolute flat design'
    }
  ],
  "STRICT VECTOR": [
    { 
      name: 'Geometric Icon', 
      description: 'Simplified geometric forms, ultra-clean.', 
      applyPrompt: `Transform into minimalist geometric vector icon.`, 
      genPrompt: 'Minimalist geometric vector icon, perfect geometric construction, clean lines, professional logo style, white background' 
    },
    { 
      name: 'Flat Illustration', 
      description: 'Modern 2D flat style, no gradients.', 
      applyPrompt: `Transform into high-quality flat vector illustration.`, 
      genPrompt: 'High-quality flat vector illustration, bold flat colors, crisp outlines, modern graphic design, 2D aesthetic, isolated on white' 
    },
    { 
      name: 'Mono Line Art', 
      description: 'Single weight black lines, minimal.', 
      applyPrompt: `Transform into single-weight mono line art vector.`, 
      genPrompt: 'Mono line art vector, single-weight black strokes, minimal, elegant, negative space focus, no shading, white background' 
    },
    { 
      name: 'Sticker Die-Cut', 
      description: 'Thick white border, vibrant colors.', 
      applyPrompt: `Transform into pop art vector sticker.`, 
      genPrompt: 'Pop art vector sticker, vibrant colors, thick white die-cut border, comic book aesthetic, vector style' 
    }
  ],
  "TECHNICAL & BRANDING": [
    {
      name: 'Tech Logo Mark',
      description: 'Abstract gradients, app icon style.',
      applyPrompt: 'Transform into modern tech company logo mark.',
      genPrompt: 'Modern tech logo mark, abstract geometric shape, gradient vector, app icon aesthetic, rounded corners, professional branding'
    },
    {
      name: 'Esports Mascot',
      description: 'Aggressive, bold outlines, energetic.',
      applyPrompt: 'Transform into aggressive esports mascot logo.',
      genPrompt: 'Esports mascot logo, aggressive expression, thick bold vector outlines, vibrant team colors, vector illustration style'
    },
    {
      name: 'Blueprint Schematic',
      description: 'White lines on blue, technical.',
      applyPrompt: 'Transform into technical blueprint vector.',
      genPrompt: 'Technical blueprint vector, white lines on classic blue background, schematic style, architectural measures, precise line work'
    }
  ],
  "ARTISTIC & RETRO": [
    {
      name: 'Retro Pop Art',
      description: 'Halftones, comic style, bold.',
      applyPrompt: 'Transform into retro pop art vector.',
      genPrompt: 'Retro pop art vector, halftone dots pattern, comic book style, bold primary colors, thick black outlines, Roy Lichtenstein style'
    },
    {
      name: 'Low Poly Vector',
      description: 'Triangular mesh, crystalline look.',
      applyPrompt: 'Transform into low poly vector art.',
      genPrompt: 'Low poly vector art, geometric triangles, crystalline facet structure, flat shading, abstract geometric aesthetic'
    },
    {
      name: 'Synthwave Grid',
      description: '80s neon wireframe aesthetic.',
      applyPrompt: 'Transform into 80s synthwave vector graphics.',
      genPrompt: '80s synthwave vector, neon wireframe, retro futuristic sun, digital grid, cyberpunk vector aesthetic, dark background'
    },
    {
        name: 'Isometric 3D',
        description: 'Pseudo-3D geometric projection.',
        applyPrompt: 'Transform into isometric vector illustration.',
        genPrompt: 'Isometric vector illustration, 3D geometric projection, clean flat colors, soft vector shadows, sim city aesthetic'
    }
  ]
};

export const VectorArtPanel: React.FC<VectorArtPanelProps> = ({ onRequest, isLoading, hasImage, currentImageFile, setViewerInstruction, initialPrompt }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Flat Illustration');
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<any[]>([]);

  const loadPresets = useCallback(async () => {
    try {
        const stored = await loadUserPresets();
        const relevant = stored.filter((p: any) => p.recommendedPanel === 'vector_art_panel')
                               .map((p: any) => ({
                                   ...p,
                                   genPrompt: p.genPrompt || p.applyPrompt 
                               }));
        setCustomPresets(relevant);
    } catch(e) {
        console.error("VectorPanel preset load error", e);
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

  const allPresets = useMemo(() => Object.values(presetGroups).flat() as VectorPreset[], [presetGroups]);
  const selectedPreset = useMemo(() => allPresets.find(p => p.name === selectedPresetName), [selectedPresetName, allPresets]);

  const handleApply = async () => {
    setIsAnalyzing(true);
    setLocalError(null);
    try {
        let effectiveSubject = userPrompt.trim();

        if (!effectiveSubject && hasImage && currentImageFile) {
            setViewerInstruction("SCANNING SUBJECT DNA...");
            try {
                effectiveSubject = await describeImageForPrompt(currentImageFile);
            } catch (err) {
                console.warn('Vision analysis failed:', err);
                effectiveSubject = "the primary subject";
            } finally {
                setViewerInstruction(null);
            }
        } else if (!effectiveSubject) {
            effectiveSubject = "a vector graphic";
        }

        let fullPrompt = "";
        let systemInstructionOverride = PROTOCOLS.DESIGNER;

        if (selectedPreset) {
            if (hasImage) {
                 fullPrompt = `${selectedPreset.applyPrompt} The subject is: ${effectiveSubject}. Maintain the vector style strictly.`;
                 systemInstructionOverride = PROTOCOLS.IMAGE_TRANSFORMER;
            } else {
                 const genPromptToUse = selectedPreset.genPrompt || selectedPreset.applyPrompt;
                 fullPrompt = `${genPromptToUse}, ${effectiveSubject}`;
                 systemInstructionOverride = PROTOCOLS.DESIGNER;
            }
        } else {
             fullPrompt = `${effectiveSubject}. Vector art style, flat colors, clean lines.`;
             systemInstructionOverride = hasImage ? PROTOCOLS.IMAGE_TRANSFORMER : PROTOCOLS.DESIGNER;
        }

        onRequest({ 
            type: 'vector', 
            prompt: fullPrompt, 
            forceNew: !hasImage, 
            aspectRatio: '1:1', 
            systemInstructionOverride: systemInstructionOverride,
            negativePrompt: selectedPreset?.negative_prompt || "photorealistic, 3d, shading, gradients, noise, blurry"
        });
    } catch (e: any) {
        console.error(e);
        setLocalError(e.message || "Vector synthesis engine malfunction.");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleAnalyzeImage = async () => {
    if (!currentImageFile || isAnalyzing || isLoading) return;
    setIsAnalyzing(true);
    try {
        const description = await describeImageForPrompt(currentImageFile);
        setUserPrompt(description);
    } catch (e) {
        console.error('Image analysis failed:', e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleRefine = async () => {
    if (!userPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refineImagePrompt(userPrompt);
      setUserPrompt(refined);
    } catch (e) { console.error(e); } 
    finally { setIsRefining(false); }
  };

  const isActionDisabled = isLoading || isAnalyzing || (!selectedPresetName && !userPrompt.trim());

  return (
    <div className="flex flex-col h-full bg-surface-panel">
      <div className="p-4 border-b border-white/5 bg-surface-panel relative z-10 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-emerald-900 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                 <VectorIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                 <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                   Vector Foundry
                 </h3>
                 <p className="text-[10px] text-green-500 font-mono tracking-widest uppercase">
                   SVG & Flat Design Core
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
          <div className="bg-surface-card border border-surface-border rounded-lg p-3 group focus-within:border-green-500/50 transition-colors">
              <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Subject Directive</label>
                  <div className="flex gap-2">
                    {userPrompt && <button onClick={() => setUserPrompt('')}><XIcon className="w-3 h-3 text-gray-600 hover:text-white" /></button>}
                    <button onClick={handleRefine} disabled={!userPrompt.trim() || isRefining} className="text-green-500 disabled:opacity-30">
                        <SparklesIcon className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
              </div>
              <textarea 
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={hasImage ? "Leaving empty will auto-detect subject..." : "Describe vector art to generate..."}
                  className="w-full bg-transparent text-gray-300 text-xs font-mono focus:outline-none resize-none h-16 placeholder-gray-700 leading-relaxed"
                  disabled={isLoading || isAnalyzing}
              />
          </div>

          <div className="space-y-6 pb-2">
            {Object.entries(presetGroups).map(([groupName, presets]) => (
                <div key={groupName}>
                    <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 px-1 sticky top-0 bg-surface-panel z-10 py-1">{groupName}</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(presets as any[]).map(preset => (
                            <button 
                                key={preset.name} 
                                onClick={() => setSelectedPresetName(preset.name)}
                                className={`relative p-3 text-left border rounded-sm transition-all duration-200 group overflow-hidden ${selectedPresetName === preset.name ? 'bg-green-950/30 border-green-500' : 'bg-surface-elevated border-surface-border hover:border-gray-600'}`}
                                disabled={isLoading || isAnalyzing}
                            >
                                <div className="relative z-10">
                                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${selectedPresetName === preset.name ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{preset.name}</div>
                                    <p className="text-[8px] text-gray-600 leading-tight uppercase font-mono tracking-tighter">{preset.description}</p>
                                </div>
                                {selectedPresetName === preset.name && <div className="absolute top-1 right-1 w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
      </div>

      <div className="p-4 border-t border-surface-hover bg-surface-panel shrink-0 flex gap-2">
          {hasImage && (
              <button
                  onClick={handleAnalyzeImage}
                  disabled={isActionDisabled}
                  className="w-12 h-12 flex items-center justify-center bg-surface-elevated border border-surface-border rounded-sm hover:border-green-500/50 group transition-all disabled:opacity-30"
                  title="Force Subject Analysis"
              >
                  <SparklesIcon className={`w-4 h-4 text-gray-500 group-hover:text-green-500 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              </button>
          )}
          <button
              onClick={handleApply}
              disabled={isActionDisabled}
              className="flex-1 h-12 relative overflow-hidden group rounded-sm bg-surface-elevated border border-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {!isActionDisabled && <div className="absolute inset-0 bg-green-900/20"></div>}
              
              <div className="relative z-10 flex items-center justify-center gap-2 h-full">
                  <span className={`font-black italic uppercase tracking-widest text-sm skew-x-[-10deg] ${isActionDisabled ? 'text-gray-500' : 'text-green-400 group-hover:text-white'}`}>
                      {isAnalyzing ? 'Analysing...' : (hasImage ? 'Vectorize' : 'Synthesize')}
                  </span>
                  {!isActionDisabled && <VectorIcon className="w-4 h-4 text-green-400 group-hover:text-white skew-x-[-10deg]" />}
              </div>
          </button>
      </div>
    </div>
  );
};