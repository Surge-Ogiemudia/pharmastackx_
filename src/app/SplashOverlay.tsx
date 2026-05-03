'use client';
import { useEffect } from 'react';

export default function SplashOverlay() {
    useEffect(() => {
        const overlay = document.getElementById('psx-splash');
        if (!overlay) return;

        const hide = () => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => overlay.remove(), 400);
        };

        // Wait for the page to signal it has painted with styles applied.
        // 'psx-app-ready' is dispatched by the root page component's useEffect,
        // which only fires after React has committed and the browser has painted.
        window.addEventListener('psx-app-ready', hide, { once: true });

        // Hard fallback: never block the user for more than 3 seconds
        const timeout = setTimeout(hide, 3000);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('psx-app-ready', hide);
        };
    }, []);

    return null;
}
