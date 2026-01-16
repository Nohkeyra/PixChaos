/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CompareIcon } from './icons';

interface CompareSliderProps {
    originalImage: string;
    modifiedImage: string;
    className?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ originalImage, modifiedImage, className }) => {
    const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
    const isDraggingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const getClientX = (e: MouseEvent | TouchEvent): number => {
        if (window.TouchEvent && e instanceof TouchEvent) {
            return e.touches[0].clientX;
        }
        return (e as MouseEvent).clientX;
    };

    const handleDragMove = useCallback((clientX: number) => {
        if (!isDraggingRef.current || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
    }, [isDraggingRef, containerRef]); // Corrected dependencies

    const onDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        handleDragMove(getClientX(e));
    }, [handleDragMove]);

    const onDragEnd = useCallback(() => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
        }
    }, [isDraggingRef]); // Corrected dependencies

    useEffect(() => {
        // Add passive: false to prevent scrolling on mobile while dragging
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('touchmove', onDragMove, { passive: false });
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchend', onDragEnd);

        return () => {
            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('touchmove', onDragMove);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchend', onDragEnd);
        };
    }, [onDragMove, onDragEnd]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingRef.current = true;
        // Prevent default touch actions like scrolling
        if (e.nativeEvent instanceof TouchEvent) {
            e.preventDefault();
        }
        handleDragMove(getClientX(e.nativeEvent as MouseEvent | TouchEvent));
    };

    return (
        <div 
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none cursor-col-resize group ${className}`}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            {/* Modified Image (Background/Right) */}
            <img 
                src={modifiedImage} 
                alt="Modified" 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ imageRendering: 'auto' }}
            />

            {/* Original Image (Foreground/Left) - Clipped */}
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ 
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                }}
            >
                <img 
                    src={originalImage} 
                    alt="Original" 
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ imageRendering: 'auto' }}
                />
            </div>

            {/* Slider Handle */}
            <div 
                className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-col-resize z-20 flex items-center justify-center shadow-[0_0_10px_rgba(248,19,13,0.8)]"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
                 <div className="w-8 h-8 bg-black border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
                    <CompareIcon className="w-4 h-4 text-red-500" />
                 </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 pointer-events-none uppercase tracking-wider">Original</div>
            <div className="absolute bottom-4 right-4 bg-black/60 text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-500/30 pointer-events-none uppercase tracking-wider">Edited</div>
        </div>
    );
};