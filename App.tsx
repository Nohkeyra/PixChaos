/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { clearState, nukeDatabase, dataUrlToBlob } from './services/persistence';
import { AppContext } from './context/AppContext';
import { Header } from './components/Header';
import { Spinner } from './components/Spinner';
import { FilterPanel } from './components/FilterPanel';
import { AdjustmentPanel } from './components/AdjustmentPanel';
import { TypographicPanel } from './components/TypographicPanel';
import { VectorArtPanel } from './components/VectorArtPanel';
import { FluxPanel } from './components/FluxPanel';
import { InpaintPanel } from './components/InpaintPanel';
import { StyleExtractorPanel } from './components/StyleExtractorPanel';
import { CompareSlider } from './components/CompareSlider';
import { ZoomPanViewer } from './components/ZoomPanViewer';
import { UndoIcon, RedoIcon, CompareIcon, XIcon, DownloadIcon, HistoryIcon, BoltIcon, PaletteIcon, SunIcon, EraserIcon, TypeIcon, VectorIcon, StyleExtractorIcon, TrashIcon, PlusIcon, UploadIcon } from './components/icons';
import { SystemConfigWidget } from './components/SystemConfigWidget';
import { ImageUploadPlaceholder } from './components/ImageUploadPlaceholder';
import { StartScreen } from './components/StartScreen';
import * as geminiService from './services/geminiService';
import { PROTOCOLS, RoutedStyle } from './services/geminiService';
import { FastAiWidget } from './components/FastAiWidget';
import { HistoryGrid } from './components/HistoryGrid';
import { debugService } from './services/debugService';
import { DebugConsole } from './components/DebugConsole';
import { CameraCaptureModal } from './components/CameraCaptureModal';

export type ActiveTab = 'flux' | 'style_extractor' | 'filters' | 'adjust' | 'inpaint' | 'typography' | 'vector';

export interface HistoryItem {
    content: File | string;
    prompt?: string;
    type: 'upload' | 'generation' | 'edit' | 'transformation';
    timestamp: number;
}

export type GenerationRequest = {
    type: ActiveTab;
    prompt?: string;
    useOriginal?: boolean;
    forceNew?: boolean;
    aspectRatio?: string;
    isChaos?: boolean;
    batchSize?: number;
    batchIndex?: number;
    maskBase64?: string;
    systemInstructionOverride?: string;
    negativePrompt?: string; 
    denoisingInstruction?: string; 
};

export const App: React.FC = () => {
    const { isLoading, setIsLoading, isFastAiEnabled, theme } = useContext(AppContext);
    const [appStarted, setAppStarted] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]); 
    const [historyIndex, setHistoryIndex] = useState(-1); 
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab | null>('flux');
    const [isComparing, setIsComparing] = useState(false);
    const [viewerInstruction, setViewerInstruction] = useState<string | null>(null);
    const [showHistoryGrid, setShowHistoryGrid] = useState(false);
    const [showDebugger, setShowDebugger] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    
    const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
    const [fluxPrompt, setFluxPrompt] = useState('');
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(40);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Debug Service
    useEffect(() => {
        debugService.init();
    }, []);

    const currentItem = useMemo(() => history[historyIndex], [history, historyIndex]);

    const currentImageFile = useMemo(() => {
        return currentItem?.content instanceof File ? currentItem.content : null;
    }, [currentItem]);
    
    // Track Revocable URL separately to avoid memory leaks
    const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
    useEffect(() => {
        if (currentItem && typeof currentItem.content !== 'string') {
            const url = URL.createObjectURL(currentItem.content);
            setCurrentMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (currentItem && typeof currentItem.content === 'string') {
             setCurrentMediaUrl(currentItem.content);
        } else {
            setCurrentMediaUrl(null);
        }
    }, [currentItem]);

    const originalImageUrl = useMemo(() => {
        const item = history[0];
        if (!item) return null;
        if (typeof item.content === 'string') return item.content;
        return URL.createObjectURL(item.content);
    }, [history]);

    const handleImageUpload = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const newItem: HistoryItem = {
                content: file,
                type: 'upload',
                timestamp: Date.now()
            };
            setHistory(prev => [...prev.slice(0, historyIndex + 1), newItem]);
            setHistoryIndex(prev => prev + 1);
            setAppStarted(true);
        } catch (e: any) {
            setError(`Upload error: ${e.message || String(e)}`);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, historyIndex]);

    const handleDownload = useCallback(async () => {
        if (!currentMediaUrl) return;
        setIsLoading(true);
        setViewerInstruction("DOWNLOADING TO STORAGE...");

        try {
            let baseName = "pixshop_art";
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (currentImageFile?.name) {
                const lastDotIndex = currentImageFile.name.lastIndexOf('.');
                baseName = lastDotIndex !== -1 
                    ? currentImageFile.name.substring(0, lastDotIndex) 
                    : currentImageFile.name;
            }

            let blob: Blob;
            if (currentMediaUrl.startsWith('data:')) {
                blob = dataUrlToBlob(currentMediaUrl);
            } else {
                const response = await fetch(currentMediaUrl);
                blob = await response.blob();
            }

            if (!blob || blob.size === 0) throw new Error("Null image data.");

            const mimeType = blob.type || 'image/png';
            const extension = mimeType.includes('jpeg') ? 'jpg' : (mimeType.includes('webp') ? 'webp' : 'png');
            const filename = `${baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.${extension}`;

            // STRATEGY 1: FILE SYSTEM ACCESS API (Modern Desktop)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'Neural Image',
                            accept: { [mimeType]: ['.' + extension] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    setIsLoading(false);
                    setViewerInstruction("SAVED TO DEVICE");
                    setTimeout(() => setViewerInstruction(null), 2000);
                    return;
                } catch (pickerErr: any) {
                    if (pickerErr.name === 'AbortError') {
                        setIsLoading(false);
                        setViewerInstruction(null);
                        return;
                    }
                    console.warn("Save Picker failed, trying anchor fallback...", pickerErr);
                }
            }

            // STRATEGY 2: ROBUST ANCHOR DOWNLOAD (Compatible with APKs/Mobile)
            // Converting to Data URL often helps bypass Blob URL restrictions in Android WebViews
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                link.setAttribute('download', filename);
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    if (document.body.contains(link)) {
                        document.body.removeChild(link);
                    }
                }, 1000);
            };
            reader.readAsDataURL(blob);

            setViewerInstruction("FILE SENT TO DOWNLOAD MANAGER");
            setTimeout(() => setViewerInstruction(null), 3000);

            // FALLBACK FOR APKs: If the above fails due to permission issues in the WebView,
            // provide a manual save option.
            if (navigator.userAgent.match(/Android/i)) {
                setTimeout(() => {
                    if (window.confirm("If download didn't appear in your file manager, would you like to open the image in a full window for manual 'Long-Press' save?")) {
                        const newTab = window.open();
                        if (newTab) {
                            newTab.document.body.style.backgroundColor = 'black';
                            newTab.document.body.innerHTML = `
                                <div style="display:flex; flex-direction:column; align-items:center; color:white; font-family:sans-serif; padding:20px;">
                                    <img src="${currentMediaUrl}" style="width:100%; max-width:600px; height:auto; box-shadow:0 0 20px rgba(0,0,0,0.5);" />
                                    <p style="margin-top:20px; text-align:center; font-weight:bold;">LONG-PRESS THE IMAGE ABOVE<br>THEN SELECT 'SAVE IMAGE'</p>
                                </div>
                            `;
                        }
                    }
                }, 4000);
            }

        } catch (e: any) {
            console.error("Download Error:", e);
            setError(`Save failed: ${e.message || 'Permission Error'}. Try long-pressing the image.`);
        } finally {
            setIsLoading(false);
        }
    }, [currentMediaUrl, currentImageFile, setIsLoading]);

    const handleClearSession = useCallback(async () => { 
        setHistory([]);
        setHistoryIndex(-1);
        setPreviewImageUrl(null);
        setIsComparing(false);
        await clearState().catch(console.error); 
    }, []);

    const handleTabSwitch = useCallback(async (tab: ActiveTab) => { 
        if (tab !== activeTab) {
            setPendingPrompt(null);
            setActiveTab(tab);
        }
    }, [activeTab]);

    const handleRouteStyle = useCallback((style: RoutedStyle) => {
        if (style.target_panel_id === 'filter_panel') {
             setActiveTab('filters');
             setPendingPrompt(style.preset_data.prompt);
        } else if (style.target_panel_id === 'vector_art_panel') {
             setActiveTab('vector');
             setPendingPrompt(style.preset_data.prompt);
        } else if (style.target_panel_id === 'typographic_panel') {
             setActiveTab('typography');
             setPendingPrompt(style.preset_data.prompt);
        } else {
             setActiveTab('flux');
             setFluxPrompt(style.preset_data.prompt);
        }
    }, []);

    const handleSoftFix = useCallback(() => {
        window.location.reload();
    }, []);

    const handleHardFix = useCallback(async () => {
        if(window.confirm("Perform system reset? Local ledger will be purged.")) {
            await nukeDatabase();
            window.location.reload();
        }
    }, []);

    const handleGenerationRequest = useCallback(async (req: GenerationRequest) => {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
            try {
                if (typeof aistudio.hasSelectedApiKey === 'function' && typeof aistudio.openSelectKey === 'function') {
                    const hasKey = await aistudio.hasSelectedApiKey();
                    if (!hasKey) {
                        await aistudio.openSelectKey();
                    }
                }
            } catch (err) {
                console.warn("Auth Bridge Warning:", err);
            }
        }

        setIsLoading(true);
        setError(null);
        setPreviewImageUrl(null);
        
        try {
            const source = (req.useOriginal ? history[0]?.content : currentItem?.content) as File || (currentItem?.content as File);
            let result: string = '';

            switch(req.type) {
                case 'flux':
                    result = (req.forceNew || !source)
                        ? await geminiService.generateFluxTextToImage(req.prompt!, { aspectRatio: req.aspectRatio, isChaos: req.isChaos, systemInstructionOverride: req.systemInstructionOverride, negativePrompt: req.negativePrompt }, isFastAiEnabled)
                        : await geminiService.generateFluxImage(source, req.prompt!, { aspectRatio: req.aspectRatio, isChaos: req.isChaos, systemInstructionOverride: req.systemInstructionOverride, negativePrompt: req.negativePrompt, denoisingInstruction: req.denoisingInstruction }, isFastAiEnabled);
                    break;
                case 'filters':
                case 'adjust':
                    if (source) result = await geminiService.generateFilteredImage(source, req.prompt!, { aspectRatio: req.aspectRatio, systemInstructionOverride: req.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, negativePrompt: req.negativePrompt, denoisingInstruction: req.denoisingInstruction }, isFastAiEnabled);
                    break;
                case 'inpaint':
                    if (source) {
                        if (req.maskBase64 && req.maskBase64.length > 0) {
                             result = await geminiService.generateInpaintedImage(source, req.maskBase64, req.prompt!, { systemInstructionOverride: req.systemInstructionOverride, negativePrompt: req.negativePrompt, denoisingInstruction: req.denoisingInstruction }, isFastAiEnabled);
                        } else {
                             const fallbackPrompt = `${req.prompt} (Process context and geometry)`;
                             result = await geminiService.generateFilteredImage(source, fallbackPrompt, { aspectRatio: req.aspectRatio, systemInstructionOverride: PROTOCOLS.IMAGE_TRANSFORMER, negativePrompt: req.negativePrompt }, isFastAiEnabled);
                        }
                    }
                    break;
                case 'typography':
                    result = (req.forceNew || !source) 
                        ? await geminiService.generateFluxTextToImage(req.prompt!, { aspectRatio: req.aspectRatio, isChaos: false, systemInstructionOverride: req.systemInstructionOverride || PROTOCOLS.TYPOGRAPHER, negativePrompt: req.negativePrompt }, isFastAiEnabled)
                        : await geminiService.generateFluxImage(source, req.prompt!, { aspectRatio: req.aspectRatio, isChaos: false, systemInstructionOverride: req.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, negativePrompt: req.negativePrompt, denoisingInstruction: req.denoisingInstruction }, isFastAiEnabled); 
                    break;
                case 'vector':
                    result = (req.forceNew || !source) 
                        ? await geminiService.generateFluxTextToImage(req.prompt!, { aspectRatio: req.aspectRatio, isChaos: false, systemInstructionOverride: req.systemInstructionOverride || PROTOCOLS.DESIGNER, negativePrompt: req.negativePrompt }, isFastAiEnabled)
                        : await geminiService.generateFluxImage(source, req.prompt!, { aspectRatio: req.aspectRatio, isChaos: false, systemInstructionOverride: req.systemInstructionOverride || PROTOCOLS.DESIGNER, negativePrompt: req.negativePrompt }, isFastAiEnabled);
                    break;
                case 'style_extractor':
                    break;
            }

            if (result) {
                 const blob = dataUrlToBlob(result);
                 const file = new File([blob], `gen_${Date.now()}.png`, { type: 'image/png' });
                 
                 const newItem: HistoryItem = {
                     content: file,
                     type: 'generation',
                     timestamp: Date.now(),
                     prompt: req.prompt
                 };
                 
                 setHistory(prev => [...prev.slice(0, historyIndex + 1), newItem]);
                 setHistoryIndex(prev => prev + 1);
            }

        } catch (e: any) {
            console.error("Neural Stack Trace:", e);
            let msg = "Processing error. Try adjusting prompt complexity.";
            
            if (typeof e === 'string') msg = e;
            else if (e instanceof Error) msg = e.message;
            else if (typeof e === 'object' && e !== null) {
                try {
                    const str = JSON.stringify(e);
                    msg = (str !== '{}') ? (e.error?.message || e.message || str) : String(e);
                } catch { msg = "System Opaque Error."; }
            }
            
            if (msg.includes("[object Object]")) msg = "Neural response format mismatched. Re-initiating handshake...";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [history, historyIndex, currentItem, isFastAiEnabled]);

    return (
        <div className={`h-full flex flex-col bg-surface-deep text-white ${theme === 'light' ? 'light-theme' : ''}`}>
            
            {/* Overlays */}
            {showDebugger && <DebugConsole onClose={() => setShowDebugger(false)} />}
            {showHistoryGrid && (
                <HistoryGrid 
                    history={history} 
                    setHistoryIndex={(i) => { setHistoryIndex(i); setShowHistoryGrid(false); }} 
                    onClose={() => setShowHistoryGrid(false)} 
                />
            )}
            <CameraCaptureModal 
                isOpen={showCamera} 
                onClose={() => setShowCamera(false)} 
                onCapture={handleImageUpload} 
            />

            {!appStarted ? (
                <StartScreen onStart={(tab) => {
                    if (tab) setActiveTab(tab);
                    setAppStarted(true);
                }} />
            ) : (
                <>
                    <Header onGoHome={handleClearSession} isPlatinumTier={true} />
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                        <div className="flex-1 relative bg-surface-deep overflow-hidden flex flex-col">
                            {isLoading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <Spinner />
                                    {viewerInstruction && <div className="absolute bottom-10 text-white font-mono text-xs animate-pulse tracking-[0.2em]">{viewerInstruction}</div>}
                                </div>
                            )}
                            
                            {error && (
                                <div className="absolute top-4 left-4 right-4 z-40 bg-red-900/95 border border-red-500 text-white p-4 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex justify-between items-start animate-fade-in backdrop-blur-2xl">
                                    <div className="flex-1 mr-4">
                                        <p className="text-[10px] font-black uppercase mb-1 text-red-200">Neural Core Exception</p>
                                        <p className="text-xs font-mono leading-tight">{error}</p>
                                    </div>
                                    <button onClick={() => setError(null)} className="mt-0.5 p-1 hover:bg-white/10 rounded"><XIcon className="w-4 h-4" /></button>
                                </div>
                            )}

                            <div className="flex-1 relative overflow-hidden">
                                {isComparing && originalImageUrl && currentMediaUrl ? (
                                    <CompareSlider originalImage={originalImageUrl} modifiedImage={currentMediaUrl} />
                                ) : (
                                    currentMediaUrl ? (
                                        <ZoomPanViewer src={currentMediaUrl} className={activeTab === 'inpaint' ? 'cursor-crosshair' : ''} />
                                    ) : (
                                        <ImageUploadPlaceholder onImageUpload={handleImageUpload} />
                                    )
                                )}
                            </div>

                            <div className="bg-surface-panel border-t border-surface-border p-2 flex justify-between items-center shrink-0 z-20">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { if(window.confirm("Purge active session buffers?")) handleClearSession(); }}
                                        className="p-2 text-gray-500 hover:text-red-500 bg-surface-elevated rounded-sm border border-surface-border hover:border-red-500/50 transition-all"
                                        title="System Flush"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                    
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-1 bg-blue-600/20 border border-blue-500/40 rounded flex items-center gap-2 group hover:bg-blue-600 hover:text-white transition-all"
                                        title="Import Visual"
                                    >
                                        <PlusIcon className="w-4 h-4 text-blue-400 group-hover:text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Import</span>
                                        <input type="file" ref={fileInputRef} onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file);
                                            e.target.value = '';
                                        }} className="hidden" accept="image/*" />
                                    </button>

                                    <button 
                                        onClick={() => setShowHistoryGrid(true)} 
                                        className="p-2 text-gray-500 hover:text-white bg-surface-elevated rounded-sm border border-surface-border hover:border-surface-border-light transition-all"
                                        title="Visual Ledger"
                                    >
                                        <HistoryIcon className="w-4 h-4" />
                                    </button>

                                    <div className="w-px h-8 bg-surface-border mx-1"></div>
                                    
                                    <button 
                                        onClick={() => setHistoryIndex(Math.max(0, historyIndex - 1))} 
                                        disabled={historyIndex <= 0}
                                        className="p-2 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                                        title="Undo Cycle"
                                    >
                                        <UndoIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setHistoryIndex(Math.min(history.length - 1, historyIndex + 1))} 
                                        disabled={historyIndex >= history.length - 1}
                                        className="p-2 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                                        title="Redo Cycle"
                                    >
                                        <RedoIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                     {originalImageUrl && currentMediaUrl && (
                                         <button 
                                            onClick={() => setIsComparing(!isComparing)} 
                                            className={`p-2 rounded-sm border transition-all ${isComparing ? 'bg-red-900/40 text-red-500 border-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-surface-elevated text-gray-500 border-surface-border hover:text-white'}`}
                                            title="Compare Source"
                                         >
                                             <CompareIcon className="w-4 h-4" />
                                         </button>
                                     )}
                                     <button 
                                        onClick={handleDownload} 
                                        disabled={!currentMediaUrl}
                                        className="p-2 bg-surface-elevated text-gray-500 hover:text-green-400 border border-surface-border hover:border-green-500/50 rounded-sm transition-all"
                                        title="Download Image"
                                     >
                                        <DownloadIcon className="w-4 h-4" />
                                     </button>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-[400px] bg-surface-panel border-l border-surface-border flex flex-col z-20 shrink-0 h-[45vh] md:h-auto shadow-2xl">
                            <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border bg-black/20">
                                {[
                                    { id: 'flux', icon: BoltIcon, color: 'text-red-500', label: 'FLUX' },
                                    { id: 'style_extractor', icon: StyleExtractorIcon, color: 'text-purple-500', label: 'DNA' },
                                    { id: 'filters', icon: PaletteIcon, color: 'text-cyan-500', label: 'FX' },
                                    { id: 'vector', icon: VectorIcon, color: 'text-green-500', label: 'VECTOR' },
                                    { id: 'typography', icon: TypeIcon, color: 'text-pink-500', label: 'TYPE' },
                                    { id: 'inpaint', icon: EraserIcon, color: 'text-blue-500', label: 'ERASE' },
                                    { id: 'adjust', icon: SunIcon, color: 'text-orange-500', label: 'LIGHT' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabSwitch(tab.id as ActiveTab)}
                                        className={`flex-1 min-w-[3.8rem] py-2 flex flex-col justify-center items-center border-b-2 transition-all ${activeTab === tab.id ? `border-${tab.color.split('-')[1]}-500 bg-white/5` : 'border-transparent hover:bg-white/5 text-gray-700'}`}
                                    >
                                        <tab.icon className={`w-4 h-4 mb-1 ${activeTab === tab.id ? tab.color : 'text-gray-600'}`} />
                                        <span className={`text-[8px] font-black tracking-tighter ${activeTab === tab.id ? 'text-white' : 'text-gray-700'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex-1 overflow-hidden relative">
                                {activeTab === 'flux' && (
                                    <FluxPanel 
                                        onRequest={handleGenerationRequest} 
                                        isLoading={isLoading} 
                                        hasImage={!!currentMediaUrl}
                                        currentImageFile={currentImageFile}
                                        setViewerInstruction={setViewerInstruction}
                                        fluxPrompt={fluxPrompt}
                                        setFluxPrompt={setFluxPrompt}
                                        setPreviewImageUrl={setPreviewImageUrl}
                                        isFastAiEnabled={isFastAiEnabled}
                                    />
                                )}
                                {activeTab === 'style_extractor' && (
                                    <StyleExtractorPanel 
                                        isLoading={isLoading}
                                        hasImage={!!currentMediaUrl}
                                        currentImageFile={currentImageFile}
                                        onRouteStyle={handleRouteStyle}
                                        isFastAiEnabled={isFastAiEnabled}
                                    />
                                )}
                                {activeTab === 'filters' && (
                                    <FilterPanel 
                                        onRequest={handleGenerationRequest} 
                                        isLoading={isLoading} 
                                        setViewerInstruction={setViewerInstruction}
                                        isFastAiEnabled={isFastAiEnabled}
                                        hasImage={!!currentMediaUrl}
                                        currentImageFile={currentImageFile}
                                        initialPrompt={pendingPrompt || undefined}
                                    />
                                )}
                                {activeTab === 'adjust' && (
                                    <AdjustmentPanel 
                                        onRequest={handleGenerationRequest} 
                                        isLoading={isLoading} 
                                        setViewerInstruction={setViewerInstruction}
                                        isFastAiEnabled={isFastAiEnabled}
                                    />
                                )}
                                {activeTab === 'inpaint' && (
                                    <InpaintPanel 
                                        onApplyInpaint={(prompt) => handleGenerationRequest({ type: 'inpaint', prompt, maskBase64: '', useOriginal: false })}
                                        onClearMask={() => {}}
                                        isLoading={isLoading}
                                        brushSize={brushSize}
                                        setBrushSize={setBrushSize}
                                        hasImage={!!currentMediaUrl}
                                    />
                                )}
                                {activeTab === 'vector' && (
                                    <VectorArtPanel 
                                        onRequest={handleGenerationRequest} 
                                        isLoading={isLoading} 
                                        hasImage={!!currentMediaUrl}
                                        currentImageFile={currentImageFile}
                                        setViewerInstruction={setViewerInstruction}
                                        initialPrompt={pendingPrompt || undefined}
                                    />
                                )}
                                {activeTab === 'typography' && (
                                    <TypographicPanel 
                                        onRequest={handleGenerationRequest} 
                                        isLoading={isLoading} 
                                        hasImage={!!currentMediaUrl}
                                        setViewerInstruction={setViewerInstruction}
                                        initialPrompt={pendingPrompt || undefined}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <SystemConfigWidget 
                onSoftFix={handleSoftFix} 
                onHardFix={handleHardFix} 
                onOpenDebugger={() => setShowDebugger(true)} 
            />
            <FastAiWidget />
        </div>
    );
};