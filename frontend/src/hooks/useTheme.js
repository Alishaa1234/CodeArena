import { useState, useEffect } from 'react';

export default function useTheme() {
    const [theme, setTheme] = useState(() => {
        // Read saved preference, default to dark
        return localStorage.getItem('theme') || 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, toggle };
}