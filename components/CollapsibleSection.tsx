
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, ReactNode } from 'react';
import { ChevronIcon } from './icons';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  startOpen?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, startOpen = true }) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <div className="border border-surface-border bg-surface-card/50 mb-4 rounded-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-black/50 hover:bg-surface-elevated transition-colors"
        aria-expanded={isOpen}
      >
        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h4>
        <ChevronIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-surface-border animate-fade-in bg-black/20">
          {children}
        </div>
      )}
    </div>
  );
};
