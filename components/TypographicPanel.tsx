
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GenerationRequest } from '../App';
import { TypeIcon, XIcon } from './icons';
import { PROTOCOLS } from '../services/geminiService';
import { loadUserPresets } from '../services/persistence';

interface TypographicPreset {
  name: string;
  description: string;
  applyPrompt: string;
}

interface TypographicPanelProps {
  onRequest: (request: GenerationRequest) => void;
  isLoading: boolean;
  hasImage: boolean;
  setViewerInstruction: (text: string | null) => void;
  initialPrompt?: string;
}

const basePresetGroups: Record<string, TypographicPreset[]> = {
  "NEXT-GEN TYPE (2026)": [
    {
        name: 'Zero-G Floating',
        description: 'Anti-gravity sci-fi HUD typography.',
        applyPrompt: `Futuristic Zero-G typography. The letters are deconstructed into floating components held together by magnetic fields. Sci-fi HUD aesthetic, clean thin lines, glowing nodes. Isolated on black background.`
    },
    {
        name: 'Liquid Mercury',
        description: 'Reflective T-1000 liquid metal flow.',
        applyPrompt: `Liquid metal typography. Letters formed from flowing silver mercury, highly reflective chrome surface, smooth organic blobs merging together. Studio lighting, HDRI reflections. Isolated on white background.`
    },
    {
        name: 'Biolum Moss',
        description: 'Organic glowing nature takeover.',
        applyPrompt: `Organic typographic sculpture. Letters overgrown with bioluminescent moss and alien flora. Glowing blue spores, rich green textures, nature reclaiming technology. Isolated on black background.`
    },
    {
        name: 'Crystal Lattice',
        description: 'Sharp growing crystalline structures.',
        applyPrompt: `Crystalline typography. Letters formed from sharp, growing crystal lattice structures. Refractive, translucent materials with sharp facets. Prismatic colors. Isolated on black background.`
    }
  ],
  "MONOGRAM MASTERY": [
    { 
      name: 'Luxury Interlock', 
      description: 'High-fashion gold and marble emblem.', 
      applyPrompt: `A high-end luxury fashion monogram. The letters should be tightly interwoven and interlocking to form a single continuous gold crest. Sharp reflections, elegant serif typography, minimal and sophisticated. Isolated on black background.` 
    },
    { 
      name: 'Cyber Glyph', 
      description: 'Futuristic neon data-symbol.', 
      applyPrompt: `A futuristic cyberpunk logo glyph. The characters are fused together using glowing neon circuit lines and translucent glass panels. The text forms a single tech-rune. Isolated on black background.` 
    },
    { 
      name: 'Liquid Chrome', 
      description: 'Melting metal fused into one shape.', 
      applyPrompt: `A surrealist 3D chrome sculpture. The letters are made of liquid mercury that is melting and fusing into one another. The geometry is smooth, reflective, and organic. Studio lighting, isolated on white background.` 
    }
  ],
  "LOGO LEGENDS": [
    { 
      name: 'Vector Mascot', 
      description: 'Esports style vibrant character.', 
      applyPrompt: `A dynamic vector esports mascot logo featuring the text. Bold thick outlines, vibrant flat colors, cel-shaded vector style. The text is integrated into a shield or badge with an illustrative character. Isolated on white background.` 
    },
    { 
      name: 'Minimalist Tech', 
      description: 'Clean geometry, App icon style.', 
      applyPrompt: `A minimalist tech logo symbol. Geometric shapes, golden ratio composition, modern sans-serif fonts. Soft gradients (blue to purple), rounded corners, suitable for an iOS app icon. Isolated on white background.` 
    },
    { 
      name: 'Vintage Badge', 
      description: 'Hipster line-art & rough texture.', 
      applyPrompt: `A vintage hipster logo badge. Monoline vector art, textured stamp effect, muted retro color palette (orange and cream). Enclosed in a circle or hexagon with decorative ribbons. Isolated on white background.` 
    }
  ],
  "STREET TOOLS": [
    { 
      name: 'The Standard', 
      description: 'Clean, legible round-tip paint marker.', 
      applyPrompt: `Clean, legible text with consistent solid line width using a standard round-tip paint marker. Professional tag aesthetic, high contrast, solid ink. Isolated on white background.` 
    },
    { 
      name: 'The Flare', 
      description: 'Large-scale fat cap aerosol flare.', 
      applyPrompt: `Large-scale text with solid centers and fuzzy faded edges using an aerosol can with a fat cap. Spray paint mist effect, dusty street-bombing look. Isolated on black background.` 
    },
    { 
      name: 'The Drip', 
      description: 'Thick glossy mop marker drips.', 
      applyPrompt: `Thick, glossy paint with heavy vertical drips extending down using a Krink K-60 mop marker. Fluid gravity-defying drips, messy and grungy high-contrast style. Isolated on white background.` 
    }
  ],
  "STREET & URBAN": [
    { 
      name: 'Wildstyle Tag', 
      description: 'Complex interlocking vector letters.', 
      applyPrompt: `Flat vector wildstyle graffiti tag. Complex interlocking letters, sharp arrows, bold black outlines, vibrant flat colors, no gradients, clean vector finish. Isolated on white background.` 
    },
    { 
      name: 'Bubble Throwie', 
      description: 'Inflated 2D letters, sticker style.', 
      applyPrompt: `Flat vector bubble graffiti throw-up. Rounded inflated letters, thick bold outline, solid single color fill, 2D flat design, sticker aesthetic. Isolated on white background.` 
    },
    {
      name: 'Street Tag Graffiti',
      description: 'Raw, dripping hand-drawn marker tag.',
      applyPrompt: `White graffiti tag text, dripping spray paint, sloppy handwritten typography, urban street art style, hip-hop culture, rough texture, realistic tag font. Isolated on black background.`
    }
  ],
  "FUTURE TECH": [
    {
      name: 'Acid Chrome (Y2K)',
      description: 'Liquid metal, sharp tribal spikes.',
      applyPrompt: `Y2K aesthetic typography. Liquid chrome metal text with sharp tribal spikes and fluid geometry. High contrast reflections, futuristic silver sheen, aggressive shapes. Isolated on black background.`
    },
    {
      name: 'Neon Realism',
      description: 'Glowing glass tubes, dark mood.',
      applyPrompt: `Realistic 3D neon sign typography. Bent glass tubes containing glowing gas (hot pink and cyan). Subtle electric glow, metal brackets visible, dark atmosphere. Isolated on black background.`
    },
    {
      name: 'Glitch Datamosh',
      description: 'Corrupted digital signal text.',
      applyPrompt: `Glitch art typography. The text is distorted by digital datamoshing, pixel sorting, and RGB chromatic aberration. Cyberpunk data corruption aesthetic. Isolated on black background.`
    }
  ],
  "CLASSIC REVIVAL": [
    {
      name: 'Gothic Blackletter',
      description: 'Aggressive medieval calligraphy.',
      applyPrompt: `Old English Gothic blackletter calligraphy. Sharp, aggressive strokes, ornate medieval flourishes, heavy black ink texture. Tattoo flash aesthetic. Isolated on white background.`
    },
    {
      name: 'Editorial Serif',
      description: '70s high-fashion typography.',
      applyPrompt: `Vintage 1970s editorial serif typography. High contrast stroke width, tight kerning, elegant ligatures. Vogue magazine aesthetic, bold and curvy. Isolated on white background.`
    }
  ]
};

export const TypographicPanel: React.FC<TypographicPanelProps> = ({ onRequest, isLoading, hasImage, setViewerInstruction, initialPrompt }) => {
  const [userInput, setUserInput] = useState('');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Luxury Interlock');
  const [routedApplyPrompt, setRoutedApplyPrompt] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<any[]>([]);

  const loadPresets = useCallback(async () => {
    try {
        const stored = await loadUserPresets();
        const relevant = stored.filter((p: any) => p.recommendedPanel === 'typographic_panel');
        setCustomPresets(relevant);
    } catch(e) {
        console.error("Failed to load typographic presets", e);
    }
  }, []);

  useEffect(() => {
    loadPresets();
    window.addEventListener('stylePresetsUpdated', loadPresets);
    return () => window.removeEventListener('stylePresetsUpdated', loadPresets);
  }, [loadPresets]);

  useEffect(() => {
    if (initialPrompt) {
        setRoutedApplyPrompt(initialPrompt);
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

  const allPresets = useMemo(() => Object.values(presetGroups).flat() as TypographicPreset[], [presetGroups]);

  const selectedPreset = useMemo(() => allPresets.find(p => p.name === selectedPresetName), [selectedPresetName, allPresets]);

  const handleAction = () => {
    const applyPrompt = selectedPreset ? selectedPreset.applyPrompt : routedApplyPrompt;
    if (!applyPrompt) return;
    
    let basePrompt = userInput.trim() || "TYPOGRAPHY";
    
    // Strict isolation instruction for typography
    const contextInstruction = "CRITICAL: The subject must be strictly isolated on a solid [Black or White] background as specified in the preset. DO NOT render walls, streets, or realistic environments. The background must be pure, flat, and solid color to allow for easy extraction. The output must be a clean graphic asset.";

    const fullPrompt = `${applyPrompt} The text/content must be: "${basePrompt}". ${contextInstruction} The final result MUST be a high-quality visual art piece.`;

    onRequest({ 
      type: 'typography', 
      prompt: fullPrompt, 
      forceNew: !hasImage,
      aspectRatio: '1:1', 
      systemInstructionOverride: hasImage ? PROTOCOLS.IMAGE_TRANSFORMER : PROTOCOLS.TYPOGRAPHER,
      denoisingInstruction: hasImage ? "Apply medium denoising (55%) to stylize the image through a typographic lens. Integrate the text into the existing geometry." : ""
    });
  };

  const isActionDisabled = isLoading || (!selectedPresetName && !routedApplyPrompt);

  return (
    <div className="flex flex-col h-full bg-surface-panel">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-surface-panel relative z-10 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-pink-500 to-rose-900 flex items-center justify-center shadow-[0_0_10px_rgba(236,72,153,0.4)]">
                 <TypeIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                 <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                   Typography Lab
                 </h3>
                 <p className="text-[10px] text-pink-500 font-mono tracking-widest uppercase">
                   Stylized Font & Tagging Core
                 </p>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
           {/* Routed Style Indicator */}
           {routedApplyPrompt && !selectedPresetName && (
             <div className="bg-pink-950/20 border border-pink-500/30 p-2 rounded flex items-center justify-between animate-fade-in">
                <span className="text-[9px] font-mono text-pink-400 uppercase tracking-widest">DNA Route Active</span>
                <button onClick={() => setRoutedApplyPrompt(null)} className="text-pink-500 hover:text-white transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
             </div>
           )}

           {/* Text Input */}
           <div className="bg-surface-card border border-surface-border rounded-lg p-3 group focus-within:border-pink-500/50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Input Text</label>
                    {userInput && <button onClick={() => setUserInput('')}><XIcon className="w-3 h-3 text-gray-600 hover:text-white" /></button>}
                </div>
                <input 
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value.slice(0, 30))}
                    placeholder="Enter characters for rendering..."
                    className="w-full bg-transparent text-white text-xs font-mono focus:outline-none placeholder-gray-800 tracking-wider"
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-6 pb-2">
              {Object.entries(presetGroups).map(([groupName, presets]) => (
                  <div key={groupName}>
                      <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 px-1 sticky top-0 bg-surface-panel z-10 py-1">{groupName}</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {(presets as TypographicPreset[]).map(preset => (
                              <button 
                                  key={preset.name} 
                                  onClick={() => {
                                      setSelectedPresetName(preset.name);
                                      setRoutedApplyPrompt(null);
                                  }}
                                  className={`p-3 text-left border rounded-sm transition-all duration-200 group overflow-hidden ${selectedPresetName === preset.name ? 'bg-pink-950/30 border-pink-500' : 'bg-surface-elevated border-surface-border hover:border-gray-600'}`}
                                  disabled={isLoading}
                              >
                                  <div className="relative z-10">
                                      <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${selectedPresetName === preset.name ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{preset.name}</div>
                                      <p className="text-[9px] text-gray-600 leading-tight">{preset.description}</p>
                                  </div>
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
              onClick={handleAction} 
              disabled={isActionDisabled}
              className={`w-full h-12 relative overflow-hidden group rounded-sm bg-surface-elevated border border-pink-900/30 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {!isActionDisabled && <div className="absolute inset-0 bg-pink-900/20"></div>}
              
              <div className="relative z-10 flex items-center justify-center gap-2 h-full">
                  <span className={`font-black italic uppercase tracking-widest text-sm skew-x-[-10deg] ${isActionDisabled ? 'text-gray-500' : 'text-pink-400 group-hover:text-white'}`}>
                      Render Visual Text
                  </span>
              </div>
         </button>
      </div>
    </div>
  );
};
