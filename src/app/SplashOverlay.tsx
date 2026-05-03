'use client';
import { useEffect } from 'react';

export default function SplashOverlay() {
    useEffect(() => {
        const overlay = document.getElementById('psx-splash');
        if (!overlay) return;
        // Double RAF: first fires after React commits, second after the browser paints
        // the fully-styled page — only then do we reveal it.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => overlay.remove(), 400);
            });
        });
    }, []);

    return null;
}
