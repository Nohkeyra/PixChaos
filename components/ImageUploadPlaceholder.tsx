/**
 * @license
 * SPDX-License-Identifier: Apache-200
*/

import React, { useRef } from 'react';
import { UploadIcon } from './icons';

interface ImageUploadPlaceholderProps {
  onImageUpload: (file: File) => void;
}

export const ImageUploadPlaceholder: React.FC<ImageUploadPlaceholderProps> = ({ onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    // Reset value to allow selecting the same file again if the component remains mounted (or for consistency)
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
      // Prevent bubbling if necessary, though usually fine here
      e.stopPropagation();
      fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-700/50 rounded-lg cursor-pointer bg-black/20 hover:bg-gray-900/50 hover:border-red-500/50 transition-colors relative overflow-hidden group select-none"
      >
        <div className="absolute inset-0 cyber-grid opacity-20 transform-none animation-none pointer-events-none"></div>
        <div className="relative flex flex-col items-center justify-center pt-5 pb-6 text-center z-10 pointer-events-none">
          <UploadIcon className="w-10 h-10 mb-3 text-gray-500 group-hover:text-red-500 transition-colors" />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-red-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500 font-mono">PNG, JPG, WEBP, or GIF Image</p>
        </div>
        {/* Input is rendered but hidden visually. pointer-events-none ensures it doesn't block other interactions if it somehow renders on top. */}
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden"
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
          accept="image/*" 
          onClick={(e) => e.stopPropagation()} 
        />
      </div>
    </div>
  );
};