'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider"; 
import { AudioProvider } from "@/providers/AudioProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ToastProvider>
                    <AudioProvider>
                        {children}
                    </AudioProvider>
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}