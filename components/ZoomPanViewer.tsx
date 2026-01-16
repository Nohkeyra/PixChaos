/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';

interface ZoomPanViewerProps {
    src: string;
    className?: string;
    children?: React.ReactNode; 
}

export const ZoomPanViewer: React.FC<ZoomPanViewerProps> = ({ src, className, children }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(scale);

    // Sync ref with state
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    const resetView = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Reset view when the image source changes
    useEffect(() => {
        resetView();
    }, [src, resetView]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale === 1) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            const touch = e.touches[0];
            dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.current.x,
            y: touch.clientY - dragStart.current.y
        });
    };

    useEffect(() => {
        const container = containerRef.current;
        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY * 0.01;
                const currentScale = scaleRef.current;
                const newScale = Math.min(Math.max(1, currentScale + delta), 10);
                setScale(newScale);
                if (newScale === 1) setPosition({ x: 0, y: 0 });
            }
        };

        if (container) {
            container.addEventListener('wheel', onWheel, { passive: false });
        }
        return () => {
            if (container) container.removeEventListener('wheel', onWheel);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden bg-surface-deep flex items-center justify-center touch-none ${className || ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
        >
            {/* Viewport Action HUD */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button 
                    onClick={resetView}
                    className="p-2.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all active:scale-90 shadow-2xl"
                    title="Reset View"
                >
                    <Maximize2 size={18} />
                </button>
            </div>

            {/* Content Core: Centered and strictly contained */}
            <div 
                className="relative flex items-center justify-center transition-transform duration-75 ease-out select-none"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    width: '100%',
                    height: '100%'
                }}
            >
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                    <img 
                        src={src} 
                        alt="Neural Preview" 
                        className="max-w-full max-h-full object-contain pointer-events-none shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        draggable={false}
                        style={{
                            imageRendering: 'auto',
                            // Ensure the image fits the container exactly without clipping
                            display: 'block'
                        }}
                    />
                    
                    {/* Synchronized Children (e.g. Inpaint mask overlay) */}
                    {children && (
                        <div className="absolute inset-0 w-full h-full">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};