
/**
 * @license
 * SPDX-License-Identifier: Apache-200
*/

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SparklesIcon, MagicWandIcon, BoltIcon, SaveIcon, CheckIcon, AlertIcon } from './icons';
import { refineImagePrompt, describeImageForPrompt, generateRealtimePreview, generatePresetMetadata, PROTOCOLS } from '../services/geminiService';
import { GenerationRequest } from '../App';
import { loadUserPresets, saveUserPresets } from '../services/persistence';

interface FluxPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  hasImage?: boolean;
  currentImageFile?: File | null;
  setViewerInstruction: (text: string | null) => void;
  fluxPrompt: string;
  setFluxPrompt: (prompt: string) => void;
  setPreviewImageUrl: (url: string | null) => void;
  isFastAiEnabled: boolean;
}

interface StylePreset {
  label: string;
  prompt_suffix: string;
  negative_prompt: string;
}

// Define the style presets
const BASE_STYLE_PRESETS: Record<string, StylePreset> = {
  "default": {
    label: "No Style (Prompt Only)",
    prompt_suffix: "",
    negative_prompt: ""
  },
  "hyper_realism_2026": {
    label: "Hyper-Realism 2026",
    prompt_suffix: "hyper-realistic, 8k resolution, ray tracing, unreal engine 6 render, hyper-detailed textures, volumetric lighting, cinematic masterpiece, sharp focus",
    negative_prompt: "cartoon, drawing, sketch, low resolution, blurry, distorted, low poly"
  },
  "quantum_ethereal": {
    label: "Quantum Ethereal",
    prompt_suffix: "ethereal aesthetics, quantum realm particles, bioluminescent glow, translucent materials, chromatic aberration, dreamlike atmosphere, floating geometry",
    negative_prompt: "dark, gritty, solid, matte, boring, flat"
  },
  "neo_noir_cyber": {
    label: "Neo-Noir Cyber",
    prompt_suffix: "future noir, wet pavement, neon reflections, high contrast, deep shadows, teal and orange grading, blade runner aesthetic, cinematic lighting",
    negative_prompt: "daylight, bright, cheerful, flat lighting, low contrast"
  },
  "porcelain_android": {
    label: "Porcelain Android",
    prompt_suffix: "smooth white porcelain skin, gold mechanical joints, fashion photography, studio lighting, elegant, minimalist sci-fi, vogue magazine style",
    negative_prompt: "dirty, rusty, industrial, messy, low quality"
  },
  "vector_flat": {
    label: "Vector Flat",
    prompt_suffix: "vector art, flat aesthetic, clean lines, minimal, svg style, no gradients, isolated white background",
    negative_prompt: "photorealistic, 3d render, shading, blurry, texture, noise, complex background"
  },
  "sticker_pop": {
    label: "Pop Sticker",
    prompt_suffix: "die-cut sticker, white border, vibrant pop art colors, bold cartoon illustration, isolated white background",
    negative_prompt: "photograph, realistic, dark, gritty, complex background"
  },
  "oil_painting": {
    label: "Oil Painting",
    prompt_suffix: "oil painting, visible brushstrokes, rich texture, impasto technique, classic art style",
    negative_prompt: "digital art, smooth, photographic, low detail"
  },
  "cyberpunk_neon": {
    label: "Cyberpunk Neon",
    prompt_suffix: "cyberpunk aesthetic, neon lighting, rainy city, futuristic, high contrast, vibrant blue and pink tones",
    negative_prompt: "daylight, natural, muted colors, low tech, soft lighting"
  },
  "watercolor_sketch": {
    label: "Watercolor Sketch",
    prompt_suffix: "watercolor sketch, loose brushwork, soft colors, ethereal, hand-drawn quality, white paper texture",
    negative_prompt: "sharp lines, photographic, digital, bold, strong colors"
  },
  "pixel_art": {
    label: "Pixel Art",
    prompt_suffix: "pixel art, 8-bit, low resolution, retro game style, blocky, vibrant colors",
    negative_prompt: "high resolution, smooth, realistic, detailed, modern"
  },
  "comic_book": {
    label: "Comic Book",
    prompt_suffix: "comic book style, bold outlines, halftone dots, vibrant colors, action scene, dynamic composition",
    negative_prompt: "photograph, realistic, blurry, monochrome, muted colors"
  },
  "vintage_poster": {
    label: "Vintage Poster",
    prompt_suffix: "vintage travel poster, retro aesthetic, distressed textures, limited color palette, bold typography, art deco influence",
    negative_prompt: "modern, clean, digital, futuristic, realistic"
  },
  "gothic_etching": {
    label: "Gothic Etching",
    prompt_suffix: "gothic etching, intricate linework, chiaroscuro, dark fantasy, black and white, highly detailed, dramatic shadows",
    negative_prompt: "colorful, bright, smooth, digital, modern, cartoon"
  }
};


export const FluxPanel: React.FC<FluxPanelProps> = ({ 
    onRequest, 
    isLoading, 
    hasImage, 
    currentImageFile, 
    setViewerInstruction,
    fluxPrompt,
    setFluxPrompt, 
    setPreviewImageUrl,
    isFastAiEnabled
}) => {
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [stackEffect, setStackEffect] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [chaosMode, setChaosMode] = useState<boolean>(false);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [livePreview, setLivePreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const debounceTimeout = useRef<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [selectedStylePresetName, setSelectedStylePresetName] = useState<string>("default"); 
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false); 
  const [matchShape, setMatchShape] = useState(false); 
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPresets = useCallback(async () => {
      try {
          const loaded = await loadUserPresets();
          setCustomPresets(loaded);
      } catch (e) {
          console.error("Failed to load presets", e);
      }
  }, []);

  useEffect(() => {
    fetchPresets();
    window.addEventListener('stylePresetsUpdated', fetchPresets);
    return () => window.removeEventListener('stylePresetsUpdated', fetchPresets);
  }, [fetchPresets]);

  const allPresets = useMemo<Record<string, StylePreset>>(() => {
      const customs = customPresets.reduce((acc, p) => {
          acc[`custom_${p.id}`] = {
              label: `★ ${p.name}`,
              prompt_suffix: p.applyPrompt,
              negative_prompt: "" 
          };
          return acc;
      }, {} as Record<string, StylePreset>);
      
      return { ...BASE_STYLE_PRESETS, ...customs };
  }, [customPresets]);
  
  const selectedStylePreset = useMemo(() => allPresets[selectedStylePresetName] || BASE_STYLE_PRESETS["default"], [selectedStylePresetName, allPresets]);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  useEffect(() => {
    if (batchSize > 1) {
      setViewerInstruction(`NEURAL GRID: GENERATING ${batchSize} VARIATIONS...`);
    } else {
      setViewerInstruction(null);
    }
    return () => setViewerInstruction(null);
  }, [batchSize, setViewerInstruction]);

  useEffect(() => {
    if (livePreview && fluxPrompt.trim() && !isLoading) {
      setIsPreviewLoading(true);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = window.setTimeout(async () => {
        try {
          const url = await generateRealtimePreview(fluxPrompt, isFastAiEnabled);
          if (url) setPreviewImageUrl(url);
        } catch (error) {
          console.error('Preview generation failed:', error);
          setPreviewImageUrl(null);
        } finally {
          setIsPreviewLoading(false);
        }
      }, isTouchDevice ? 1000 : 750);
    } else {
      setPreviewImageUrl(null);
    }
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [fluxPrompt, livePreview, isLoading, setPreviewImageUrl, isTouchDevice, isFastAiEnabled]);

  const handleAnalyzeImage = async () => {
    if (!currentImageFile || isAnalyzing || isLoading) return;
    setIsAnalyzing(true);
    try {
      const description = await describeImageForPrompt(currentImageFile);
      setFluxPrompt(description);
    } catch (e) {
      console.error('Image analysis failed:', e);
      setFluxPrompt("a creative variation"); 
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSmartSave = async () => {
      if (!fluxPrompt.trim() || isSaving) return;
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
          // 1. Generate Metadata
          const meta = await generatePresetMetadata(fluxPrompt, isFastAiEnabled);
          
          let category = 'FLUX';
          if (meta.recommended_panel === 'vector_art_panel') category = 'VECTOR';
          if (meta.recommended_panel === 'typographic_panel') category = 'TYPO';
          if (meta.recommended_panel === 'filter_panel') category = 'FILTER';

          // 2. Prepare Data
          const newPreset = {
              id: Date.now().toString(),
              name: meta.name,
              description: meta.description,
              applyPrompt: fluxPrompt.trim(),
              genPrompt: fluxPrompt.trim(), // Save explicit genPrompt for Vector panel compatibility
              category: category,
              recommendedPanel: meta.recommended_panel || 'flux',
              isCustom: true,
              timestamp: Date.now()
          };

          // 3. Save
          const existing = await loadUserPresets();
          const updated = [newPreset, ...existing];
          await saveUserPresets(updated);
          
          // 4. Update UI
          setCustomPresets(updated);
          window.dispatchEvent(new Event('stylePresetsUpdated'));
          
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
      } catch (e: any) {
          setSaveError("Save Failed. DB Error.");
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleAction = async (forceNew: boolean) => {
    if (forceNew && hasImage) {
      if (!window.confirm("This will start a new session. Current visual data will be overwritten. Proceed?")) return;
    }
    
    let effectivePrompt = fluxPrompt.trim();
    let effectiveNegativePrompt = selectedStylePreset.negative_prompt;
    let systemInstructionOverride: string | undefined = undefined;
    let denoisingInstruction: string = "";

    if (hasImage && !effectivePrompt && !showAdvancedPrompt && currentImageFile) {
        setIsAnalyzing(true);
        try {
            const description = await describeImageForPrompt(currentImageFile);
            effectivePrompt = description;
        } catch (e) {
            console.error('Image analysis failed for auto-prompt:', e);
            effectivePrompt = "a creative variation based on the input image"; 
        } finally {
            setIsAnalyzing(false);
        }
    } else if (hasImage && !effectivePrompt && currentImageFile) {
      effectivePrompt = "a creative variation based on the input image";
    }
    
    if (hasImage) {
        if (matchShape || (!showAdvancedPrompt && !fluxPrompt.trim())) { 
            denoisingInstruction = "Strictly preserve the geometric outline and structure of the input image, applying minimal denoising (around 45%). Focus on modifying styles and textures rather than form. Do not alter the core pose or composition.";
            systemInstructionOverride = PROTOCOLS.IMAGE_TRANSFORMER;
        } else { 
            denoisingInstruction = "Transform the input image with significant creative freedom, allowing for substantial denoising (around 75%) to reimagine its form and style. The original image serves as a loose inspiration, not a strict guide.";
            systemInstructionOverride = PROTOCOLS.IMAGE_TRANSFORMER;
        }
    } else { 
        systemInstructionOverride = PROTOCOLS.ARTIST;
    }

    if (selectedStylePreset.prompt_suffix) {
        effectivePrompt = `${effectivePrompt}, ${selectedStylePreset.prompt_suffix}`;
    }
    if (chaosMode) {
        effectivePrompt = `${effectivePrompt}, chaotic maximalism, glitch art style`;
    }

    if (hasImage) {
        effectivePrompt = `${denoisingInstruction} Your goal is to generate: ${effectivePrompt}.`;
    }

    if (effectiveNegativePrompt) {
      effectivePrompt = `${effectivePrompt} --AVOID: ${effectiveNegativePrompt}`;
    }

    onRequest({ 
        type: 'flux', 
        prompt: effectivePrompt, 
        useOriginal: !stackEffect, 
        forceNew, 
        aspectRatio, 
        isChaos: chaosMode, 
        batchSize, 
        systemInstructionOverride, 
        negativePrompt: effectiveNegativePrompt,
        denoisingInstruction: denoisingInstruction 
    });
  };

  const handleRefine = async () => {
    if (!fluxPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refineImagePrompt(fluxPrompt, isFastAiEnabled);
      setFluxPrompt(refined);
    } catch (e) { console.error(e); } 
    finally { setIsRefining(false); }
  };

  const isActionDisabled = isLoading || isAnalyzing; 

  const ToggleButton = ({ label, active, onClick, disabled }: { label: string, active: boolean, onClick: () => void, disabled: boolean }) => (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-md border transition-all ${active ? 'bg-surface-hover border-red-500/50' : 'bg-surface-card border-surface-border'}`}>
        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex-1 cursor-pointer" onClick={onClick}>{label}</label>
        <button 
           onClick={(e) => { e.stopPropagation(); onClick(); }}
           disabled={disabled}
           className={`relative w-8 h-4 rounded-full transition-all flex items-center ${active ? 'bg-red-600' : 'bg-surface-border-light'} disabled:opacity-50`}
        >
           <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-surface-panel">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-surface-panel relative z-10 shrink-0">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-orange-900 flex items-center justify-center shadow-[0_0_10px_rgba(248,19,13,0.4)]">
                     <BoltIcon className="w-5 h-5 text-white" />
                 </div>
                 <div>
                     <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                       Flux Engine
                     </h3>
                     <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase">
                       Neural Synthesis Core
                     </p>
                 </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

            {/* Section: Style & Composition */}
            <div className="space-y-3">
                 <div className="bg-surface-card border border-surface-border rounded-lg p-1">
                    <select 
                        id="stylePreset"
                        value={selectedStylePresetName} 
                        onChange={(e) => setSelectedStylePresetName(e.target.value)}
                        disabled={isLoading || isAnalyzing}
                        className="w-full bg-transparent text-white text-xs font-mono p-2 outline-none border-none"
                    >
                        {Object.entries(allPresets).map(([key, preset]) => (
                            <option key={key} value={key} className="bg-black text-gray-300">
                                {(preset as StylePreset).label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-surface-card border border-surface-border rounded-lg p-3 group focus-within:border-red-500/50 transition-colors relative">
                    <div className="flex justify-between items-center mb-2">
                         <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Prompt Directive</span>
                         <div className="flex gap-2">
                             {hasImage && !showAdvancedPrompt && (
                                 <button onClick={() => setShowAdvancedPrompt(true)} className="text-[8px] bg-surface-border px-2 py-0.5 rounded text-gray-400 hover:text-white uppercase">Advanced</button>
                             )}
                             {(showAdvancedPrompt || !hasImage) && (
                                <div className="flex gap-2 items-center">
                                    {hasImage && <button onClick={handleAnalyzeImage} disabled={isAnalyzing || isLoading} className="text-gray-500 hover:text-white transition-colors"><SparklesIcon className="w-3 h-3" /></button>}
                                    <button onClick={handleRefine} disabled={!fluxPrompt.trim() || isRefining || isLoading} className={`text-red-500 hover:text-white transition-colors ${isRefining ? 'animate-spin' : ''}`}><MagicWandIcon className="w-3 h-3" /></button>
                                    
                                    {/* Smart Save Button */}
                                    {fluxPrompt.trim().length > 3 && (
                                        <button 
                                            onClick={handleSmartSave} 
                                            disabled={isSaving || saveSuccess}
                                            className={`ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider transition-all ${saveSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-900/20 text-red-500 hover:bg-red-900/40 hover:text-red-300'}`}
                                            title="Smart Save Prompt as Style"
                                        >
                                            {isSaving ? (
                                                <SparklesIcon className="w-3 h-3 animate-spin" />
                                            ) : saveSuccess ? (
                                                <CheckIcon className="w-3 h-3" />
                                            ) : (
                                                <SaveIcon className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}
                                </div>
                             )}
                         </div>
                    </div>
                    
                    {(showAdvancedPrompt || (!hasImage && fluxPrompt.trim()) || (!hasImage && !fluxPrompt.trim())) ? (
                        <textarea 
                            value={fluxPrompt}
                            onChange={(e) => setFluxPrompt(e.target.value)}
                            maxLength={800}
                            placeholder={hasImage ? "Describe transformation (e.g., 'cyberpunk city')..." : "Imagine something unique..."}
                            className="w-full bg-transparent text-gray-200 text-xs font-mono focus:outline-none resize-none h-24 custom-scrollbar placeholder-gray-700 leading-relaxed"
                            disabled={isLoading || isAnalyzing}
                        />
                    ) : (
                         <div onClick={() => setShowAdvancedPrompt(true)} className="h-10 flex items-center justify-center border border-dashed border-surface-border-light rounded cursor-pointer hover:border-gray-500 transition-colors">
                             <span className="text-[10px] text-gray-500 font-mono uppercase">Auto-Generate Mode Active</span>
                         </div>
                    )}
                    {saveError && (
                        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[8px] text-red-400 bg-red-950/80 px-1 rounded animate-fade-in">
                            <AlertIcon className="w-2 h-2" /> {saveError}
                        </div>
                    )}
                </div>
            </div>

            {/* Section: Output Settings */}
            <div className="space-y-1">
                 <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Output Config</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-card border border-surface-border rounded-lg p-2.5">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1.5">Aspect Ratio</label>
                        <select 
                            value={aspectRatio} 
                            onChange={(e) => setAspectRatio(e.target.value)}
                            disabled={isLoading || isAnalyzing}
                            className="w-full bg-surface-elevated border border-surface-border-light text-white text-[10px] font-mono p-1.5 rounded focus:border-red-500 outline-none"
                        >
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Portrait</option>
                            <option value="4:3">4:3 Classic</option>
                            <option value="3:4">3:4 Tall</option>
                        </select>
                    </div>

                    <div className="bg-surface-card border border-surface-border rounded-lg p-2.5">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1.5 flex justify-between">
                            <span>Batch Size</span>
                            <span className="text-red-500">{batchSize}</span>
                        </label>
                        <input 
                            type="range" 
                            min="1" 
                            max="4" 
                            value={batchSize} 
                            onChange={(e) => setBatchSize(Number(e.target.value))}
                            disabled={isLoading || isAnalyzing}
                            className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                    </div>
                 </div>
            </div>

            {/* Section: Modifiers */}
            <div className="space-y-1">
                 <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">Modifiers</h4>
                 <div className="grid grid-cols-2 gap-2">
                     <ToggleButton label="Chaos Mode" active={chaosMode} onClick={() => setChaosMode(!chaosMode)} disabled={isLoading || isAnalyzing} />
                     <ToggleButton label="Live Preview" active={livePreview} onClick={() => setLivePreview(!livePreview)} disabled={isLoading || isAnalyzing} />
                     {hasImage && <ToggleButton label="Stack Effect" active={stackEffect} onClick={() => setStackEffect(!stackEffect)} disabled={isLoading || isAnalyzing} />}
                     {hasImage && <ToggleButton label="Match Shape" active={matchShape} onClick={() => setMatchShape(!matchShape)} disabled={isLoading || isAnalyzing} />}
                 </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-hover bg-surface-panel shrink-0 flex gap-2">
            {hasImage && (
                <button
                    onClick={() => handleAction(false)}
                    disabled={isActionDisabled}
                    className="flex-1 h-12 border border-surface-border-light bg-surface-elevated hover:bg-surface-hover text-gray-400 hover:text-white font-bold uppercase text-[10px] tracking-wider transition-all disabled:opacity-50 rounded-sm"
                >
                    Transform
                </button>
            )}
            <button
                onClick={() => handleAction(true)}
                disabled={isActionDisabled}
                className={`h-12 relative overflow-hidden group rounded-sm bg-surface-elevated border border-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${hasImage ? 'flex-[2]' : 'w-full'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {!isActionDisabled && <div className="absolute inset-0 bg-red-900/20"></div>}
                
                <div className="relative z-10 flex items-center justify-center gap-2 h-full">
                    <span className={`font-black italic uppercase tracking-widest text-sm skew-x-[-10deg] ${isActionDisabled ? 'text-gray-500' : 'text-red-400 group-hover:text-white'}`}>
                        {isAnalyzing ? 'Analyzing...' : hasImage ? 'Generate Variation' : 'Generate Image'}
                    </span>
                    {!isActionDisabled && <MagicWandIcon className="w-4 h-4 text-red-400 group-hover:text-white skew-x-[-10deg]" />}
                </div>
            </button>
        </div>
    </div>
  );
};
