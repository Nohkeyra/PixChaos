
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState } from 'react';
import { XIcon } from './icons';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamReady, setStreamReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activeStream: MediaStream | null = null;

        if (isOpen) {
            setError(null);
            setStreamReady(false);

            // Request camera with preference for back camera and high resolution
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 } 
                } 
            })
            .then(mediaStream => {
                activeStream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    // Wait for video to be ready to play to enable capture button
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.error("Play error", e));
                        setStreamReady(true);
                    };
                }
            })
            .catch(err => {
                console.error("Camera access error:", err);
                setError("Could not access camera. Please check permissions or try a different browser.");
            });
        }

        // Cleanup function: Stop tracks when modal closes or unmounts
        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            setStreamReady(false);
        };
    }, [isOpen]); // Only re-run if isOpen changes

    const handleCapture = () => {
        const video = videoRef.current;
        if (video && streamReady) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Flip horizontally if using front camera (optional, usually environment doesn't need mirror)
                // ctx.scale(-1, 1); 
                // ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(blob => {
                    if (blob) {
                        const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
                        onCapture(file);
                        onClose();
                    }
                }, 'image/png', 0.95);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] animate-fade-in" onClick={onClose}>
            <div className="bg-surface-panel border-2 border-surface-border-light p-4 sm:p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1 rounded-sm z-20">
                    <XIcon className="w-6 h-6" />
                </button>
                
                <h2 className="text-xl font-black italic text-white mb-4 uppercase tracking-tighter font-display w-full text-left">
                    Camera Capture
                </h2>
                
                <div className="relative bg-black border border-surface-border w-full overflow-hidden rounded-lg shadow-inner">
                    {error ? (
                        <div className="aspect-video flex items-center justify-center text-red-400 font-mono text-xs p-8 text-center border-l-2 border-red-500 bg-red-900/10">
                            {error}
                        </div>
                    ) : (
                        <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="absolute inset-0 w-full h-full object-cover" 
                            />
                            {/* Focus reticle overlay effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-50">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/30"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-500/50 rounded-full"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-center w-full">
                    <button
                        onClick={handleCapture}
                        disabled={!streamReady || !!error}
                        className="w-20 h-20 bg-transparent border-4 border-gray-500 rounded-full flex items-center justify-center text-white shadow-2xl cursor-pointer hover:border-white transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-800"
                        title="Capture Photo"
                    >
                        <div className={`w-16 h-16 rounded-full transition-colors group-active:scale-95 ${streamReady ? 'bg-red-600 group-hover:bg-red-500' : 'bg-gray-800'}`}></div>
                    </button>
                </div>
            </div>
        </div>
    );
};
