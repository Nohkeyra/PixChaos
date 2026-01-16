/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { SettingsIcon, XIcon, BoltIcon, SunIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface SystemConfigWidgetProps {
  onSoftFix: () => void;
  onHardFix: () => void;
  onOpenDebugger: () => void;
}

interface Position {
  x: number;
  y: number;
}

export const SystemConfigWidget: React.FC<SystemConfigWidgetProps> = ({ 
  onSoftFix, 
  onHardFix,
  onOpenDebugger 
}) => {
  const { theme, toggleTheme } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('system-widget-position');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.x !== undefined && parsed.y !== undefined) {
            return parsed;
          }
        }
        // Default: Top-Left, below header area
        return { 
          x: 16, 
          y: 80 
        };
      }
    } catch (e) {
      console.warn('Failed to load widget position:', e);
    }
    return { x: 16, y: 80 }; 
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 }); 
  const widgetOffset = useRef({ x: 0, y: 0 }); 
  const longPressTimer = useRef<number | null>(null);
  const touchIdentifierRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('system-widget-position', JSON.stringify(position));
    } catch (e) { console.warn('Failed to save widget position:', e); }
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      if (widgetRef.current) {
        const rect = widgetRef.current.getBoundingClientRect();
        const newX = Math.min(position.x, window.innerWidth - rect.width);
        const newY = Math.min(position.y, window.innerHeight - rect.height);
        if (newX !== position.x || newY !== position.y) {
          setPosition({ x: newX, y: newY });
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'mousedown') e.preventDefault(); 
    
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      touchIdentifierRef.current = touch.identifier;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    dragStartPos.current = { x: clientX, y: clientY };
    widgetOffset.current = { x: clientX - position.x, y: clientY - position.y };
    setIsHolding(true);

    longPressTimer.current = window.setTimeout(() => {
      setIsDragging(true);
      setIsHolding(false);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); 
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    let clientX: number;
    let clientY: number;

    if (window.TouchEvent && e instanceof TouchEvent) {
       const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifierRef.current);
       if (!touch) return;
       clientX = touch.clientX;
       clientY = touch.clientY;
    } else {
       clientX = (e as MouseEvent).clientX;
       clientY = (e as MouseEvent).clientY;
    }

    if (isDragging) {
      e.preventDefault(); 
      const widget = widgetRef.current;
      if (!widget) return;
      
      const rect = widget.getBoundingClientRect();
      const newX = clientX - widgetOffset.current.x;
      const newY = clientY - widgetOffset.current.y;
      
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: boundedX, y: boundedY });
    } else {
      const dist = Math.hypot(clientX - dragStartPos.current.x, clientY - dragStartPos.current.y);
      if (dist > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setIsHolding(false);
      }
    }
  }, [isDragging, position]); 

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
    } else if (isHolding) {
      setIsOpen(true);
    }
    setIsHolding(false);
    touchIdentifierRef.current = null;
  }, [isDragging, isHolding]); 

  useEffect(() => {
    if (isHolding || isDragging) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchend', handlePointerUp);
      window.addEventListener('touchcancel', handlePointerUp);
      if (isDragging) {
         document.body.style.touchAction = 'none';
         document.body.style.userSelect = 'none';
      }
    } else {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [isHolding, isDragging, handlePointerMove, handlePointerUp]);

  const handleButtonClick = (handler: () => void) => {
    setIsOpen(false);
    setTimeout(handler, 100);
  };

  if (!isOpen) {
    return (
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          zIndex: 9999, 
          touchAction: 'none' 
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className={`transition-transform duration-200 cursor-pointer ${
          isDragging ? 'scale-110' : isHolding ? 'scale-90' : 'scale-100 hover:scale-105'
        }`}
        role="button"
        aria-label="System Config"
        title="Click to open, Hold to drag"
      >
        <div className={`
            w-12 h-12
            bg-surface-elevated/80 backdrop-blur-xl rounded-full
            flex items-center justify-center
            border-2 
            transition-all duration-300
            shadow-lg
            ${isDragging 
              ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-blue-900/30' 
              : isHolding
                ? 'border-red-500/50 bg-red-900/10'
                : 'border-surface-border hover:border-surface-border-light'
            }
        `}>
          <SettingsIcon 
            className={`w-5 h-5 text-gray-200 transition-all duration-300 ${isDragging ? 'animate-spin-slow text-blue-400' : ''}`} 
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
      
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          zIndex: 9999
        }}
        className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-72 animate-fade-in overflow-hidden"
      >
        <div
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className={`flex justify-between items-center p-4 border-b border-surface-border bg-surface-elevated cursor-grab active:cursor-grabbing select-none ${isDragging ? 'bg-blue-900/10' : ''}`}
        >
          <h3 className="text-sm font-black italic text-white uppercase tracking-wider font-display">
            System Config
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white p-1">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          <button
            onClick={() => handleButtonClick(toggleTheme)}
            className="w-full text-left p-3 bg-surface-hover hover:bg-surface-elevated border border-surface-border hover:border-yellow-500/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 group-hover:shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
              <div>
                <div className="text-xs font-bold text-gray-200">Toggle Theme</div>
                <div className="text-[10px] text-gray-500">Current: {theme.toUpperCase()}</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleButtonClick(onSoftFix)}
            className="w-full text-left p-3 bg-surface-hover hover:bg-surface-elevated border border-surface-border hover:border-green-500/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 group-hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <div>
                <div className="text-xs font-bold text-gray-200">Soft Reset</div>
                <div className="text-[10px] text-gray-500">Reload app & clear session</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleButtonClick(onHardFix)}
            className="w-full text-left p-3 bg-surface-hover hover:bg-surface-elevated border border-surface-border hover:border-red-500/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 group-hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <div>
                <div className="text-xs font-bold text-gray-200">Factory Reset</div>
                <div className="text-[10px] text-gray-500">Wipe all data & cache</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleButtonClick(onOpenDebugger)}
            className="w-full text-left p-3 bg-surface-hover hover:bg-surface-elevated border border-surface-border hover:border-blue-500/50 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div>
                <div className="text-xs font-bold text-gray-200">Open Matrix Debugger</div>
                <div className="text-[10px] text-gray-500">View real-time error logs</div>
              </div>
            </div>
          </button>
        </div>
        
        <div className="p-2 bg-surface-grid border-t border-surface-border text-center">
            <p className="text-[9px] text-gray-600 font-mono">
                {isDragging ? "RELOCATING..." : "HOLD HEADER TO MOVE"}
            </p>
        </div>
      </div>
    </>
  );
};