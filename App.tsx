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
import { UndoIcon, RedoIcon, CompareIcon, XIcon, DownloadIcon, HistoryIcon, BoltIcon, PaletteIcon, SunIcon, EraserIcon, TypeIcon, VectorIcon, StyleExtractorIcon, TrashIcon, PlusIcon } from './components/icons';
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
    
    const currentMediaUrl = useMemo(() => {
        if (!currentItem) return null;
        if (typeof currentItem.content === 'string') return currentItem.content;
        return URL.createObjectURL(currentItem.content);
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
            setError(`Upload error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, historyIndex]);

    const handleDownload = useCallback(async () => {
        if (!currentMediaUrl) return;
        setIsLoading(true);

        try {
            let baseName = "pixshop-creation";
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (currentImageFile?.name) {
                const lastDotIndex = currentImageFile.name.lastIndexOf('.');
                baseName = lastDotIndex !== -1 
                    ? currentImageFile.name.substring(0, lastDotIndex) 
                    : currentImageFile.name;
            } else {
                baseName = `pixshop-art-${timestamp}`;
            }

            let blob: Blob;
            if (currentMediaUrl.startsWith('data:')) {
                blob = dataUrlToBlob(currentMediaUrl);
            } else {
                const response = await fetch(currentMediaUrl);
                blob = await response.blob();
            }

            const mimeType = blob.type;
            let extension = 'png';
            if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
            else if (mimeType.includes('webp')) extension = 'webp';
            else if (mimeType.includes('gif')) extension = 'gif';
            else if (mimeType.includes('svg')) extension = 'svg';

            const filename = `${baseName}.${extension}`;
            const file = new File([blob], filename, { type: mimeType });

            let shareSuccess = false;
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Pixshop Export',
                        text: 'Created with Pixshop AI'
                    });
                    shareSuccess = true;
                } catch (shareError) {
                    console.warn("Share failed or cancelled:", shareError);
                }
            }

            if (!shareSuccess) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(url), 2000);
            }

        } catch (e: any) {
            console.error("Download mechanism failed:", e);
            setError("Could not save image.");
            if (currentMediaUrl) {
                 window.open(currentMediaUrl, '_blank');
            }
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
        if(window.confirm("This will factory reset the app and delete all history. Continue?")) {
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
                console.warn("API Key check warning:", err);
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
                             console.warn("Inpaint requested without mask. Falling back to full image edit.");
                             const fallbackPrompt = `${req.prompt} (Apply this change to the entire image context)`;
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
                 const file = new File([blob], `generated-${Date.now()}.png`, { type: 'image/png' });
                 
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
            console.error("Generation failed:", e);
            setError(e.message || "Generation failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [history, historyIndex, currentItem, isFastAiEnabled]);

    return (
        <div className={`h-full flex flex-col bg-surface-deep text-white ${theme === 'light' ? 'light-theme' : ''}`}>
            {/* Widgets - Globally Positioned Over everything */}
            <SystemConfigWidget 
                onSoftFix={handleSoftFix} 
                onHardFix={handleHardFix} 
                onOpenDebugger={() => setShowDebugger(true)} 
            />
            <FastAiWidget />
            
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
                        {/* VIEWER AREA */}
                        <div className="flex-1 relative bg-surface-deep overflow-hidden flex flex-col">
                            {isLoading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <Spinner />
                                    {viewerInstruction && <div className="absolute bottom-10 text-white font-mono text-xs animate-pulse">{viewerInstruction}</div>}
                                </div>
                            )}
                            
                            {/* Error Toast */}
                            {error && (
                                <div className="absolute top-4 left-4 right-4 z-40 bg-red-900/80 border border-red-500 text-white p-3 rounded shadow-lg flex justify-between items-center animate-fade-in backdrop-blur-md">
                                    <span className="text-xs font-mono">{error}</span>
                                    <button onClick={() => setError(null)}><XIcon className="w-4 h-4" /></button>
                                </div>
                            )}

                            {/* Main View */}
                            <div className="flex-1 relative overflow-hidden">
                                {isComparing && originalImageUrl && currentMediaUrl ? (
                                    <CompareSlider originalImage={originalImageUrl} modifiedImage={currentMediaUrl} />
                                ) : (
                                    currentMediaUrl ? (
                                        <ZoomPanViewer src={currentMediaUrl} className={activeTab === 'inpaint' ? 'cursor-crosshair' : ''}>
                                            {/* Inpaint Mask Overlay */}
                                        </ZoomPanViewer>
                                    ) : (
                                        <ImageUploadPlaceholder onImageUpload={handleImageUpload} />
                                    )
                                )}
                            </div>

                            {/* Viewer Controls Toolbar */}
                            <div className="bg-surface-panel border-t border-surface-border p-2 flex justify-between items-center shrink-0 z-20">
                                <div className="flex gap-2">
                                    {/* Clear/Trash Button */}
                                    <button
                                        onClick={() => { if(window.confirm("Clear session and current image?")) handleClearSession(); }}
                                        className="p-2 text-gray-400 hover:text-red-500 bg-surface-elevated rounded-sm border border-surface-border hover:border-red-500/50 transition-all"
                                        title="Clear All"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                    
                                    {/* Explicit Upload Button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-blue-500 bg-surface-elevated rounded-sm border border-surface-border hover:border-blue-500/50 transition-all"
                                        title="New Upload"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <input type="file" ref={fileInputRef} onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file);
                                            e.target.value = '';
                                        }} className="hidden" accept="image/*" />
                                    </button>

                                    <button 
                                        onClick={() => setShowHistoryGrid(true)} 
                                        className="p-2 text-gray-400 hover:text-white bg-surface-elevated rounded-sm border border-surface-border hover:border-surface-border-light transition-all"
                                        title="History"
                                    >
                                        <HistoryIcon className="w-4 h-4" />
                                    </button>

                                    <div className="w-px h-8 bg-surface-border mx-1"></div>
                                    
                                    <button 
                                        onClick={() => setHistoryIndex(Math.max(0, historyIndex - 1))} 
                                        disabled={historyIndex <= 0}
                                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                                        title="Undo"
                                    >
                                        <UndoIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setHistoryIndex(Math.min(history.length - 1, historyIndex + 1))} 
                                        disabled={historyIndex >= history.length - 1}
                                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                                        title="Redo"
                                    >
                                        <RedoIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                     {originalImageUrl && currentMediaUrl && (
                                         <button 
                                            onClick={() => setIsComparing(!isComparing)} 
                                            className={`p-2 rounded-sm border transition-all ${isComparing ? 'bg-red-900/30 text-red-500 border-red-500' : 'bg-surface-elevated text-gray-400 border-surface-border hover:text-white'}`}
                                            title="Compare Original"
                                         >
                                             <CompareIcon className="w-4 h-4" />
                                         </button>
                                     )}
                                     <button 
                                        onClick={handleDownload} 
                                        disabled={!currentMediaUrl}
                                        className="p-2 bg-surface-elevated text-gray-400 hover:text-green-400 border border-surface-border hover:border-green-500/50 rounded-sm transition-all"
                                        title="Save/Share"
                                     >
                                        <DownloadIcon className="w-4 h-4" />
                                     </button>
                                </div>
                            </div>
                        </div>

                        {/* SIDEBAR */}
                        <div className="w-full md:w-[400px] bg-surface-panel border-l border-surface-border flex flex-col z-20 shrink-0 h-[45vh] md:h-auto shadow-2xl">
                            {/* Tab Bar with Labels for discovery */}
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
                                        className={`flex-1 min-w-[3.8rem] py-2 flex flex-col justify-center items-center border-b-2 transition-all ${activeTab === tab.id ? `border-${tab.color.split('-')[1]}-500 bg-white/5` : 'border-transparent hover:bg-white/5 text-gray-600'}`}
                                    >
                                        <tab.icon className={`w-4 h-4 mb-1 ${activeTab === tab.id ? tab.color : 'text-gray-500'}`} />
                                        <span className={`text-[8px] font-black tracking-tighter ${activeTab === tab.id ? 'text-white' : 'text-gray-600'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            
                            {/* Active Panel Content */}
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
        </div>
    );
};