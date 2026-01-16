/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { BoltIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface Position {
  x: number;
  y: number;
}

export const FastAiWidget: React.FC = () => {
  const { isFastAiEnabled, setIsFastAiEnabled } = useContext(AppContext);
  const [position, setPosition] = useState<Position>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fast-ai-widget-position');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.x !== undefined && parsed.y !== undefined) {
            return parsed;
          }
        }
        // Default: Top-Right
        return { 
          x: window.innerWidth - 68, 
          y: 80 
        };
      }
    } catch (e) {
      console.warn('Failed to load Fast AI widget position:', e);
    }
    return { x: 500, y: 80 }; 
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
      localStorage.setItem('fast-ai-widget-position', JSON.stringify(position));
    } catch (e) { console.warn('Failed to save Fast AI widget position:', e); }
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
      setIsFastAiEnabled(prev => !prev); 
    }

    setIsHolding(false);
    touchIdentifierRef.current = null;
  }, [isDragging, isHolding, setIsFastAiEnabled]);

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
      aria-label={`Fast AI is ${isFastAiEnabled ? 'enabled' : 'disabled'}. Click to toggle.`}
      title="Click to toggle Fast AI, Hold to drag"
    >
      <div className={`
          w-12 h-12
          bg-black/80 backdrop-blur-xl rounded-full
          flex items-center justify-center
          border-2 
          transition-all duration-300
          shadow-lg
          ${isFastAiEnabled 
            ? 'border-lime-500 shadow-[0_0_20px_rgba(134,239,172,0.5)] bg-lime-900/30' 
            : isDragging
              ? 'border-gray-500 shadow-[0_0_10px_rgba(156,163,175,0.3)] bg-gray-900/20'
              : 'border-gray-700 hover:border-gray-500'
          }
      `}>
        <BoltIcon 
          className={`w-5 h-5 transition-all duration-300 ${
            isFastAiEnabled 
              ? 'animate-pulse-glow text-lime-400 drop-shadow-[0_0_8px_rgba(134,239,172,0.8)]' 
              : 'text-gray-400'
          }`} 
        />
      </div>
      
      {((isHolding && !isDragging) || isFastAiEnabled) && (
         <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black px-2 py-1 rounded text-[10px] text-gray-400 font-mono pointer-events-none opacity-80 animate-fade-in">
           {isFastAiEnabled ? 'Fast AI: ACTIVE' : 'Fast AI: INACTIVE'}
         </div>
      )}
    </div>
  );
};