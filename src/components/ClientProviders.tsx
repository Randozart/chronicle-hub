// src/components/ClientProviders.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AudioProvider } from '@/providers/AudioProvider';

// The problematic 'ThemeApplicator' component has been REMOVED.

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <AudioProvider>
                    {children}
                </AudioProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}