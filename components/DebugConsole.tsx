
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { debugService, LogEntry } from '../services/debugService';
import { XIcon, TrashIcon, DownloadIcon } from './icons';

interface DebugConsoleProps {
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');

  useEffect(() => {
    const unsubscribe = debugService.subscribe((updatedLogs) => {
      setLogs([...updatedLogs]);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert("Logs copied to clipboard. Paste this to the developer.");
    }).catch(err => {
      console.error("Failed to copy logs:", err);
      alert("Copy failed. See console.");
    });
  };

  const getLogColor = (type: string) => {
    switch(type) {
      case 'error': return 'text-red-500 border-l-2 border-red-500 bg-red-900/10';
      case 'warn': return 'text-yellow-400 border-l-2 border-yellow-500 bg-yellow-900/10';
      default: return 'text-green-400 border-l-2 border-green-500/30';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const d = new Date(timestamp);
    const time = d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col font-mono text-xs pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-green-900/50 bg-black">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-green-500 animate-pulse rounded-full"></div>
           <h3 className="text-green-500 font-bold uppercase tracking-widest">Matrix Debugger</h3>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleCopyLogs} className="px-3 py-1 bg-green-900/20 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black rounded uppercase text-[9px] font-bold tracking-wider flex items-center gap-2 transition-all">
             <DownloadIcon className="w-3 h-3" /> Copy Logs
           </button>
           <button onClick={() => debugService.clear()} className="p-1 text-green-700 hover:text-red-500 transition-colors" title="Clear">
             <TrashIcon className="w-4 h-4" />
           </button>
           <button onClick={onClose} className="p-1 text-green-700 hover:text-white transition-colors">
             <XIcon className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex border-b border-green-900/30 bg-surface-panel">
         {['all', 'error', 'warn'].map((f) => (
             <button 
                key={f} 
                onClick={() => setFilter(f as any)}
                className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-wider hover:bg-green-900/10 transition-colors ${filter === f ? 'text-green-400 bg-green-900/20' : 'text-gray-600'}`}
             >
                {f}
             </button>
         ))}
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain">
         {filteredLogs.length === 0 ? (
             <div className="h-full flex items-center justify-center text-green-900 uppercase tracking-widest opacity-50">
                 No Signal Detected
             </div>
         ) : (
             filteredLogs.map((log) => (
                 <div key={log.id} className={`p-2 rounded-sm break-words font-mono ${getLogColor(log.type)}`}>
                     <div className="flex items-start gap-2">
                        <span className="opacity-50 flex-shrink-0 text-[10px] pt-0.5">
                            {formatTimestamp(log.timestamp)}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap leading-relaxed">{log.message}</span>
                     </div>
                 </div>
             ))
         )}
      </div>
      
      {/* Footer input (future expansion for commands) */}
      <div className="p-2 border-t border-green-900/30 bg-black text-green-700 text-[10px] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
         > _ SYSTEM MONITOR ACTIVE
      </div>
    </div>
  );
};
