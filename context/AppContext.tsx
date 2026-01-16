
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { createContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface AppContextType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isFastAiEnabled: boolean;
    setIsFastAiEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    theme: Theme;
    toggleTheme: () => void;
}

export const AppContext = createContext<AppContextType>({
    isLoading: false,
    setIsLoading: () => {},
    isFastAiEnabled: false,
    setIsFastAiEnabled: () => {},
    theme: 'dark',
    toggleTheme: () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isFastAiEnabled, setIsFastAiEnabled] = useState(false);
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const saved = localStorage.getItem('app-theme');
            return (saved === 'light') ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    });

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('app-theme', newTheme);
            return newTheme;
        });
    };

    return (
        <AppContext.Provider value={{ isLoading, setIsLoading, isFastAiEnabled, setIsFastAiEnabled, theme, toggleTheme }}>
            {children}
        </AppContext.Provider>
    );
};
