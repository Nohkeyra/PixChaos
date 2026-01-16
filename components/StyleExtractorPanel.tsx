/**
 * @license
 * SPDX-License-Identifier: Apache-20.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleExtractorIcon, AlertIcon, PaletteIcon, VectorIcon, TypeIcon, SaveIcon, TrashIcon, HistoryIcon, DownloadIcon, UploadIcon, CheckIcon, RedoIcon } from './icons';
import { extractStyleFromImage, RoutedStyle } from '../services/geminiService';
import { saveUserPresets, loadUserPresets } from '../services/persistence';

interface StyleExtractorPanelProps {
  isLoading: boolean;
  hasImage: boolean;
  currentImageFile: File | null;
  onRouteStyle: (style: RoutedStyle) => void;
  isFastAiEnabled: boolean;
}

const PanelIconMap: Record<string, React.FC<{className?: string}>> = {
    filter_panel: PaletteIcon,
    vector_art_panel: VectorIcon,
    typographic_panel: TypeIcon,
    flux: StyleExtractorIcon
};

const PanelNameMap: Record<string, string> = {
    filter_panel: 'Filter Pipeline',
    vector_art_panel: 'Vector Foundry',
    typographic_panel: 'Typography Lab',
    flux: 'Flux Engine'
};

const PanelColorMap: Record<string, string> = {
    filter_panel: 'text-cyan-500',
    vector_art_panel: 'text-green-500',
    typographic_panel: 'text-pink-500',
    flux: 'text-red-500'
};

export const StyleExtractorPanel: React.FC<StyleExtractorPanelProps> = ({ 
  isLoading, 
  hasImage, 
  currentImageFile, 
  onRouteStyle,
  isFastAiEnabled
}) => {
  const [activeView, setActiveView] = useState<'scan' | 'library'>('scan');
  const [routedStyle, setRoutedStyle] = useState<RoutedStyle | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for the tool the user wants to use (defaults to AI recommendation)
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPresets, setSavedPresets] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPresets = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
        const loaded = await loadUserPresets();
        setSavedPresets(loaded);
    } catch (e) {
        console.error("Failed to load presets", e);
        setError("Library load failed. Database error.");
    } finally {
        setIsLoadingLibrary(false);
    }
  }, []);

  // Load presets from DB on mount
  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Reset state when the input image changes
  useEffect(() => {
    setRoutedStyle(null);
    setActiveView('scan');
    setError(null);
    setSelectedPanel(null);
    setIsSaved(false);
  }, [currentImageFile]);

  // Sync the selection when AI finishes extraction
  useEffect(() => {
    if (routedStyle) {
      setSelectedPanel(routedStyle.target_panel_id);
    }
  }, [routedStyle]);

  const handleExtract = useCallback(async () => {
    if (!currentImageFile || isExtracting) return;
    
    setIsExtracting(true);
    setError(null);
    setRoutedStyle(null);
    setSelectedPanel(null);
    setIsSaved(false);
    
    try {
      const result = await extractStyleFromImage(currentImageFile, isFastAiEnabled);
      setRoutedStyle(result);
    } catch (e: any) {
      console.error('Style routing failed:', e);
      setError(e.message || "Extraction protocol failed.");
    } finally {
      setIsExtracting(false);
    }
  }, [currentImageFile, isExtracting, isFastAiEnabled]);

  const handleSavePreset = async () => {
    if (!routedStyle || !selectedPanel) return;
    
    try {
        const existingPresets = await loadUserPresets();
        
        // Ensure prompt is available for both Vector (genPrompt) and others (applyPrompt)
        const promptContent = routedStyle.preset_data.prompt;

        const newPreset = {
            id: `dna_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: routedStyle.preset_data.name,
            description: routedStyle.preset_data.description,
            applyPrompt: promptContent, 
            genPrompt: promptContent, 
            category: selectedPanel === 'typographic_panel' ? 'TYPO' : (selectedPanel === 'vector_art_panel' ? 'VECTOR' : 'CUSTOM'),
            recommendedPanel: selectedPanel, // FORCE LOCK to this category
            isCustom: true,
            timestamp: Date.now()
        };
        
        const updatedPresets = [newPreset, ...existingPresets];
        await saveUserPresets(updatedPresets);
        setSavedPresets(updatedPresets);
        setIsSaved(true);
        
        // Notify other panels immediately
        window.dispatchEvent(new Event('stylePresetsUpdated'));
    } catch (e) {
        setError("Database write error. Persistence failed.");
        console.error(e);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
        const existing = await loadUserPresets();
        const updated = existing.filter(p => p.id !== id);
        await saveUserPresets(updated);
        setSavedPresets(updated);
        window.dispatchEvent(new Event('stylePresetsUpdated'));
    } catch (e) {
        console.error("Delete failed", e);
    }
  };

  const handleNukeLibrary = async () => {
      if (window.confirm("WARNING: This will permanently delete ALL saved presets from this device's internal storage. Are you sure?")) {
          await saveUserPresets([]);
          setSavedPresets([]);
          window.dispatchEvent(new Event('stylePresetsUpdated'));
      }
  };

  const handleRoute = useCallback((styleToRoute?: RoutedStyle) => {
    const style = styleToRoute || routedStyle;
    const targetPanel = styleToRoute ? styleToRoute.target_panel_id : selectedPanel;

    if (style && targetPanel) {
      onRouteStyle({
        ...style,
        target_panel_id: targetPanel as any
      });
    }
  }, [routedStyle, onRouteStyle, selectedPanel]);

  // --- IMPORT / EXPORT LOGIC ---

  const handleExportPresets = () => {
      if (savedPresets.length === 0) return;
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedPresets, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `pixshop_dna_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const content = e.target?.result as string;
              const importedData = JSON.parse(content);
              
              if (!Array.isArray(importedData)) throw new Error("Invalid DNA file format");

              // Merge logic: Filter out duplicates based on ID
              const existingIds = new Set(savedPresets.map(p => p.id));
              const newPresets = importedData.filter(p => !existingIds.has(p.id));
              
              if (newPresets.length === 0) {
                  setError("No new unique DNA sequences found in file.");
                  return;
              }

              const merged = [...newPresets, ...savedPresets];
              await saveUserPresets(merged);
              setSavedPresets(merged);
              window.dispatchEvent(new Event('stylePresetsUpdated'));
              setError(null); // Clear errors
              alert(`Successfully injected ${newPresets.length} new DNA sequences.`);
          } catch (err) {
              console.error(err);
              setError("Corrupt DNA file. Import aborted.");
          }
      };
      reader.readAsText(file);
      // Reset input
      event.target.value = ''; 
  };

  const canExtract = hasImage && currentImageFile && !isLoading && !isExtracting;

  return (
    <div className="flex flex-col h-full relative bg-surface-deep overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-surface-panel relative z-10">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-gradient-to-br from-[#DB24E3] to-purple-900 flex items-center justify-center shadow-[0_0_10px_rgba(219,36,227,0.4)]">
                     <StyleExtractorIcon className="w-5 h-5 text-white" />
                 </div>
                 <div>
                     <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none font-display">
                       Visual DNA
                     </h3>
                     <p className="text-[10px] text-[#DB24E3] font-mono tracking-widest uppercase">
                       Scanner & Library
                     </p>
                 </div>
            </div>
        </div>
        
        {/* Toggle Views */}
        <div className="flex p-1 bg-black/40 rounded border border-white/5">
            <button 
                onClick={() => setActiveView('scan')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeView === 'scan' ? 'bg-[#DB24E3] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Scanner
            </button>
            <button 
                onClick={() => setActiveView('library')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeView === 'library' ? 'bg-[#DB24E3] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Library ({savedPresets.length})
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border-l-2 border-red-500 p-3 m-4 mb-0 flex items-start gap-3 backdrop-blur-sm relative z-20">
           <AlertIcon className="w-4 h-4 text-red-500 mt-0.5" />
           <p className="text-xs text-red-200 font-mono leading-relaxed">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 relative no-scrollbar">
         {activeView === 'scan' ? (
             !routedStyle ? (
                 <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02] p-8 text-center">
                     <StyleExtractorIcon className="w-16 h-16 text-gray-700 mb-4" />
                     <h4 className="text-gray-300 font-bold uppercase tracking-wider text-sm">Awaiting Visual Seed</h4>
                     <p className="text-gray-600 text-[10px] mt-2 max-w-[200px]">Upload an image and run analysis to extract its stylistic DNA.</p>
                 </div>
             ) : (
                 <div className="animate-fade-in flex flex-col gap-4">
                     <div className="bg-surface-grid border border-surface-border rounded-lg p-5 shadow-2xl relative overflow-hidden">
                        
                        <div className="mb-6">
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2">
                                Lock to Category (Forced)
                            </span>
                            <div className="flex gap-2">
                                {Object.entries(PanelNameMap).map(([id, name]) => {
                                    if(id === 'flux') return null;
                                    const Icon = PanelIconMap[id];
                                    const isActive = selectedPanel === id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => { setSelectedPanel(id); setIsSaved(false); }}
                                            className={`flex-1 p-2 rounded border transition-all flex flex-col items-center gap-1 ${isActive ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-black/40 border-white/5 text-gray-500'}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-[8px] font-bold uppercase">{name.split(' ')[0]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Preset Identity</span>
                                    <p className="text-white font-bold text-sm tracking-wide">{routedStyle.preset_data.name}</p>
                                </div>
                                
                                <button 
                                    onClick={handleSavePreset}
                                    disabled={isSaved}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${isSaved ? 'bg-green-900/20 border-green-500 text-green-400 cursor-default' : 'bg-purple-950/30 border-purple-500/50 text-purple-300 hover:bg-purple-600'}`}
                                >
                                    {isSaved ? <CheckIcon className="w-3 h-3" /> : <SaveIcon className="w-3 h-3" />}
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{isSaved ? 'Database Locked' : 'Save Permanent'}</span>
                                </button>
                            </div>
                            
                            <div>
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Technical Signature</span>
                                <p className="text-gray-400 text-xs leading-relaxed italic">{routedStyle.preset_data.description}</p>
                            </div>
                        </div>
                     </div>
                 </div>
             )
         ) : (
             // LIBRARY VIEW
             <div className="space-y-3 animate-fade-in pb-16">
                 {/* Backup Toolbar */}
                 <div className="flex gap-2 mb-4 bg-white/5 p-2 rounded border border-white/5">
                    <button 
                        onClick={handleExportPresets}
                        disabled={savedPresets.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-black border border-white/10 hover:bg-white/5 hover:border-purple-500/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        <DownloadIcon className="w-3 h-3 text-purple-400 group-hover:text-purple-300" />
                        <span className="text-[9px] font-bold uppercase text-gray-400 group-hover:text-white">Export DNA</span>
                    </button>
                    <button 
                        onClick={handleImportClick}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-black border border-white/10 hover:bg-white/5 hover:border-purple-500/50 transition-colors group"
                    >
                        <UploadIcon className="w-3 h-3 text-purple-400 group-hover:text-purple-300" />
                        <span className="text-[9px] font-bold uppercase text-gray-400 group-hover:text-white">Import DNA</span>
                    </button>
                    <button
                        onClick={fetchPresets}
                        disabled={isLoadingLibrary}
                        className="w-10 flex items-center justify-center rounded bg-black border border-white/10 hover:border-purple-500/50 hover:text-white text-gray-500 transition-colors"
                        title="Reload Library"
                    >
                        <RedoIcon className={`w-3 h-3 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                 </div>

                {savedPresets.length === 0 ? (
                    <div className="text-center py-10 text-gray-600">
                        <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-xs font-mono uppercase">No saved DNA presets.</p>
                        <p className="text-[9px] text-gray-700 mt-2">Scan an image or import a backup.</p>
                    </div>
                ) : (
                    <>
                    {savedPresets.map((preset) => {
                        const Icon = PanelIconMap[preset.recommendedPanel] || StyleExtractorIcon;
                        const colorClass = PanelColorMap[preset.recommendedPanel] || 'text-gray-400';
                        const panelName = PanelNameMap[preset.recommendedPanel] || 'Generic';

                        return (
                            <div key={preset.id} className="bg-surface-card border border-white/10 rounded p-3 flex flex-col gap-2 group hover:border-purple-500/30 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                                            <Icon className={`w-4 h-4 ${colorClass}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase">{preset.name}</h4>
                                            <p className={`text-[9px] font-mono uppercase ${colorClass}`}>{panelName}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeletePreset(preset.id)}
                                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-2">{preset.description}</p>
                                <button 
                                    onClick={() => handleRoute({ 
                                        target_panel_id: preset.recommendedPanel, 
                                        preset_data: { 
                                            name: preset.name, 
                                            description: preset.description, 
                                            prompt: preset.applyPrompt 
                                        } 
                                    })}
                                    className="w-full mt-1 py-1.5 bg-white/5 hover:bg-purple-900/30 border border-white/5 hover:border-purple-500/30 rounded text-[10px] font-bold uppercase text-gray-300 hover:text-purple-300 transition-all"
                                >
                                    Load Into Module
                                </button>
                            </div>
                        );
                    })}
                    <div className="pt-4 flex justify-center">
                        <button 
                            onClick={handleNukeLibrary}
                            className="text-[9px] text-red-900 hover:text-red-500 uppercase tracking-widest font-mono flex items-center gap-2 transition-colors"
                        >
                            <TrashIcon className="w-3 h-3" />
                            Delete All Presets
                        </button>
                    </div>
                    </>
                )}
             </div>
         )}
      </div>

      {/* Footer (Only scan view) */}
      {activeView === 'scan' && (
          <div className="p-4 border-t border-surface-hover bg-surface-panel">
              <button
                  onClick={routedStyle ? () => handleRoute() : handleExtract}
                  disabled={!canExtract && !routedStyle}
                  className="w-full h-14 relative overflow-hidden group rounded-sm bg-surface-elevated"
              >
                  <div className={`absolute inset-0 bg-gradient-to-r ${routedStyle ? 'from-purple-600 to-indigo-600' : 'from-[#DB24E3] via-[#9D24E3] to-[#DB24E3]'} transition-all duration-300`}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full text-white font-black italic uppercase tracking-widest text-sm skew-x-[-10deg]">
                      {isExtracting ? "Sequencing DNA..." : (routedStyle ? `Jump to ${PanelNameMap[selectedPanel || ''] || 'Module'}` : "Analyze Style Route")}
                  </div>
              </button>
          </div>
      )}
    </div>
  );
};