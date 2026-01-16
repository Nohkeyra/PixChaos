
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { XIcon, HistoryIcon, BoltIcon, StyleExtractorIcon, SunIcon, PaletteIcon, EraserIcon, TypeIcon, VectorIcon } from './icons';
import { HistoryItem } from '../App';

interface HistoryGridProps {
    history: HistoryItem[];
    setHistoryIndex: (index: number) => void;
    onClose: () => void;
}

const getImageUrl = (item: File | string): string => {
    if (typeof item === 'string') return item;
    return URL.createObjectURL(item);
};

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1506765510614-b63690d7c71d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const TypeBadge: React.FC<{ type: HistoryItem['type'] }> = ({ type }) => {
    const colors = {
        upload: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        generation: 'bg-red-500/20 text-red-400 border-red-500/30',
        edit: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
        transformation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[8px] font-mono border uppercase tracking-wider ${colors[type]}`}>
            {type}
        </span>
    );
};

export const HistoryGrid: React.FC<HistoryGridProps> = ({ history, setHistoryIndex, onClose }) => {

    const historyItemsWithUrls = useMemo(() => {
        return history.map((item, index) => ({
            ...item,
            url: getImageUrl(item.content),
            originalIndex: index
        })).reverse();
    }, [history]);

    return (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col animate-fade-in overflow-hidden pt-[env(safe-area-inset-top)]">
            <div className="absolute inset-0 cyber-grid opacity-10 animate-[grid-move_2s_linear_infinite]" />

            <header className="p-4 sm:p-6 border-b border-white/5 bg-black/50 backdrop-blur-md relative z-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-gradient-to-br from-purple-500 to-indigo-900 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                        <HistoryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none font-display">
                            Archive Matrix
                        </h3>
                        <p className="text-[10px] text-purple-500 font-mono tracking-widest uppercase">
                            Visual Log Sequence
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            </header>

            {historyItemsWithUrls.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <HistoryIcon className="w-20 h-20 text-gray-700 mb-6" />
                    <h4 className="text-3xl font-black italic uppercase tracking-tighter text-gray-600 mb-2 font-display">
                        Archive Empty
                    </h4>
                    <p className="text-sm font-mono text-gray-500 max-w-sm">
                        Perform a visual operation to populate the ledger.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {historyItemsWithUrls.map((item) => (
                            <div 
                                key={item.timestamp + '-' + item.originalIndex}
                                className="relative flex flex-col overflow-hidden rounded border border-zinc-800 bg-[#080808] group cursor-pointer hover:border-purple-500/50 transition-all active:scale-[0.98] shadow-2xl"
                                onClick={() => setHistoryIndex(item.originalIndex)}
                            >
                                <div className="aspect-square relative overflow-hidden bg-black">
                                    <img 
                                        src={item.url} 
                                        alt={`Item ${item.originalIndex}`} 
                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL; }}
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em] skew-x-[-10deg]">Restore State</span>
                                    </div>
                                    <div className="absolute top-2 left-2">
                                        <TypeBadge type={item.type} />
                                    </div>
                                </div>
                                <div className="p-3 border-t border-white/5 space-y-1">
                                    <div className="flex justify-between items-center text-[9px] font-mono">
                                        <span className="text-gray-600">SEQ_{item.originalIndex.toString().padStart(3, '0')}</span>
                                        <span className="text-gray-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {item.prompt && (
                                        <p className="text-[10px] text-gray-400 line-clamp-2 italic font-mono leading-tight group-hover:text-gray-200 transition-colors">
                                            "{item.prompt}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <footer className="p-4 bg-black/80 border-t border-white/5 text-center relative z-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <p className="text-[9px] font-mono text-gray-700 uppercase tracking-[0.5em]">
                    Neural Archive Stream • {history.length} Objects Indexed
                </p>
            </footer>
        </div>
    );
};
